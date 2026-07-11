const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.processClioMatterImport = async (filePath, dryRun, userId) => {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      Papa.parse(fileContent.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const report = await processRows(results.data, dryRun, userId);
            resolve(report);
          } catch (error) {
            reject(error);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
};

async function processRows(rows, dryRun, userId) {
  const report = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    autoCreatedClients: [],
    autoCreatedPracticeAreas: [],
    unsupportedCustomFields: [],
    warnings: [],
    errors: []
  };

  const unsupportedCustomFieldsSet = new Set();
  const autoCreatedPracticeAreasSet = new Set();
  const autoCreatedClientsSet = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for header

    try {
      // --- 1. Client Resolution ---
      let client = null;
      let clientName = row['Client'] ? row['Client'].trim() : null;
      
      if (!clientName) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: Missing Client name`);
        continue; // Skip this row, never fail the whole file
      }

      client = await prisma.client.findFirst({
        where: { full_name: clientName }
      });

      if (!client) {
        if (!dryRun) {
          client = await prisma.client.create({
            data: {
              full_name: clientName,
              email: `${clientName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'client'}@placeholder.local`,
              party_type: 'Individual',
              party_role: 'Client'
            }
          });
        } else {
          // Mock client for dryRun
          client = { id: -1, full_name: clientName };
        }
        autoCreatedClientsSet.add(clientName);
      }

      // --- 2. Practice Area Resolution ---
      let practiceAreaName = "Uncategorized";
      const paInput = row['PracticeArea'] ? row['PracticeArea'].trim() : null;
      
      if (paInput) {
        let pa = await prisma.practiceArea.findFirst({
          where: { name: paInput }
        });

        if (!pa) {
          if (!dryRun) {
            pa = await prisma.practiceArea.create({
              data: { name: paInput }
            });
          }
          autoCreatedPracticeAreasSet.add(paInput);
        }
        practiceAreaName = paInput;
      }

      // --- 3. Lawyer Resolution ---
      let lawyerId = null;
      const respAttorney = row['ResponsibleAttorney'] ? row['ResponsibleAttorney'].trim() : null;
      if (respAttorney) {
        const lawyer = await prisma.user.findFirst({
          where: {
            full_name: respAttorney,
            role: { in: ['lawyer', 'admin'] }
          }
        });
        if (lawyer) {
          lawyerId = lawyer.id;
        } else {
          report.warnings.push(`Row ${rowNum}: Responsible Attorney '${respAttorney}' not found. Left unassigned.`);
        }
      }

      // --- 4. Prepare Matter Data ---
      const displayNum = row['DisplayNumber'] ? row['DisplayNumber'].trim() : null;
      const fallbackNum = row['Number'] ? row['Number'].trim() : null;
      const matterNumber = displayNum || fallbackNum || `MAT-IMPORT-${Date.now()}-${rowNum}`;
      
      const title = row['Description'] ? row['Description'].trim() : `Imported Matter ${matterNumber}`;
      
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const openedAt = parseDate(row['OpenDate']) || new Date();
      const closedAt = parseDate(row['CloseDate']);
      const createdAt = parseDate(row['CreatedAt']) || new Date();
      const updatedAt = parseDate(row['LastModified']) || new Date();

      let status = 'pending';
      const statusInput = row['Status'] ? row['Status'].toLowerCase() : '';
      if (statusInput === 'open') status = 'active';
      else if (statusInput === 'closed') status = 'completed';

      const matterData = {
        title,
        client_id: client.id,
        assigned_lawyer_id: lawyerId,
        practice_area: practiceAreaName,
        matter_type: "General", 
        status,
        opened_at: openedAt,
        closed_at: closedAt,
        created_at: createdAt,
        updated_at: updatedAt,
        created_by_user_id: userId
      };

      // --- 5. Duplicate Detection ---
      let existingMatter = null;
      
      // We can only check for existing matter reliably if we have a valid client_id
      if (client.id !== -1) {
        existingMatter = await prisma.matter.findFirst({
          where: {
            OR: [
              { matter_number: matterNumber },
              { title: title, client_id: client.id }
            ]
          }
        });
      }

      // --- 6. Custom Fields Analysis ---
      const customFieldValuesToInsert = [];
      for (const key of Object.keys(row)) {
        if (key.startsWith('Custom Field - ') && !key.endsWith('Id')) {
          const cfName = key.replace('Custom Field - ', '').trim();
          const cfValue = row[key];
          
          if (cfValue) {
            const def = await prisma.customFieldDefinition.findFirst({
              where: { name: cfName }
            });
            
            if (def) {
              customFieldValuesToInsert.push({
                field_definition_id: def.id,
                value: cfValue.toString()
              });
            } else {
              unsupportedCustomFieldsSet.add(cfName);
            }
          }
        }
      }

      // --- 7. Execution ---
      if (dryRun) {
        if (existingMatter) {
          report.updated++;
        } else {
          report.imported++;
        }
      } else {
        let savedMatter;
        if (existingMatter) {
          savedMatter = await prisma.matter.update({
            where: { id: existingMatter.id },
            data: matterData
          });
          report.updated++;
        } else {
          savedMatter = await prisma.matter.create({
            data: {
              ...matterData,
              matter_number: matterNumber
            }
          });
          report.imported++;
        }

        for (const cfv of customFieldValuesToInsert) {
          await prisma.matterCustomFieldValue.upsert({
            where: {
              matter_id_field_definition_id: {
                matter_id: savedMatter.id,
                field_definition_id: cfv.field_definition_id
              }
            },
            update: { value: cfv.value },
            create: {
              matter_id: savedMatter.id,
              field_definition_id: cfv.field_definition_id,
              value: cfv.value
            }
          });
        }
      }

    } catch (error) {
      report.failed++;
      report.errors.push(`Row ${rowNum}: ${error.message}`);
    }
  }

  report.autoCreatedClients = Array.from(autoCreatedClientsSet);
  report.autoCreatedPracticeAreas = Array.from(autoCreatedPracticeAreasSet);
  report.unsupportedCustomFields = Array.from(unsupportedCustomFieldsSet);

  return report;
}
