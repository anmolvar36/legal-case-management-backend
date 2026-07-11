const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const processClioContactNoteImport = async (filePath, dryRun, userId) => {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      Papa.parse(fileContent.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const report = await processContactNoteRows(results.data, dryRun, userId);
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

const processContactNoteRows = async (rows, dryRun, currentUserId) => {
  const report = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    errors: []
  };

  const dbClients = await prisma.client.findMany({
    select: { id: true, full_name: true, email: true, phone: true, notes: true }
  });

  const dbUsers = await prisma.user.findMany({
    select: { id: true, full_name: true, email: true }
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      // 1. Resolve Contact
      const contactStr = (row.Contact || '').trim();
      const contactIdStr = (row.ContactId || '').trim();
      let matchedClient = null;

      if (!contactStr && !contactIdStr) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: No Contact or ContactId provided in CSV. Skipped.`);
        continue;
      }

      let byName = dbClients.filter(c => c.full_name.toLowerCase() === contactStr.toLowerCase());
      if (byName.length === 1) matchedClient = byName[0];
      
      if (!matchedClient) {
        let byEmail = dbClients.filter(c => c.email && contactStr && c.email.toLowerCase() === contactStr.toLowerCase());
        if (byEmail.length === 1) matchedClient = byEmail[0];
      }

      if (!matchedClient) {
        report.skipped++;
        report.warnings.push(`Row ${rowNum}: Could not resolve Contact '${contactStr}'. Skipped missing contact.`);
        continue;
      }

      // 2. Resolve Author
      const authorStr = (row.Creator || row.Author || '').trim();
      let resolvedAuthorName = authorStr; // Default to string if not found in db
      
      if (authorStr) {
        const byEmail = dbUsers.find(u => u.email.toLowerCase() === authorStr.toLowerCase());
        if (byEmail) {
          resolvedAuthorName = byEmail.full_name || authorStr;
        } else {
          const authorParts = authorStr.replace(/,?\s*Esq\.?/i, '').trim();
          const byName = dbUsers.find(u => 
            u.full_name && u.full_name.toLowerCase() === authorParts.toLowerCase()
          );
          if (byName) {
            resolvedAuthorName = byName.full_name;
          }
        }
      } else {
        resolvedAuthorName = "Unknown Clio Author";
      }

      // 3. Prepare Note Content
      const dateStr = (row.Date || row.CreatedAt || '').trim();
      const subject = (row.Subject || 'No Subject').trim();
      const messageBody = (row.Detail || row.Note || '').trim();

      const importDate = new Date().toISOString().split('T')[0];
      const clioDate = dateStr ? new Date(dateStr).toLocaleString() : 'Unknown Date';

      const formattedBlock = `
====================================================

[CLIO CONTACT NOTE]

Imported On:
${importDate}

Original Date:
${clioDate}

Original Author:
${resolvedAuthorName}

Subject:
${subject}

----------------------------------------

${messageBody}

====================================================
`.trim();

      // 4. Duplicate Detection (Scan existing notes string for exact block)
      const existingNotes = matchedClient.notes || '';
      if (existingNotes.includes(`Original Date:\n${clioDate}`) && existingNotes.includes(messageBody)) {
        report.skipped++;
        report.warnings.push(`Row ${rowNum}: Duplicate historical note detected for Contact '${contactStr}'. Skipped.`);
        continue;
      }

      // 5. Append
      if (!dryRun) {
        const appendedNotes = existingNotes ? `${existingNotes}\n\n${formattedBlock}` : formattedBlock;
        
        await prisma.client.update({
          where: { id: matchedClient.id },
          data: { notes: appendedNotes }
        });

        // Update our local cache to prevent duplicates within the same run
        matchedClient.notes = appendedNotes;
        report.imported++;
      } else {
        // In dry run, just simulate appending
        matchedClient.notes = existingNotes ? `${existingNotes}\n\n${formattedBlock}` : formattedBlock;
        report.imported++;
      }

    } catch (err) {
      report.failed++;
      report.errors.push(`Row ${rowNum}: Unexpected error - ${err.message}`);
    }
  }

  return report;
};

module.exports = { processClioContactNoteImport };
