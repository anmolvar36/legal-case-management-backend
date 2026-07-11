const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const processClioCommunicationImport = async (filePath, dryRun, userId) => {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      Papa.parse(fileContent.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const report = await processCommunicationRows(results.data, dryRun, userId);
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

const processCommunicationRows = async (rows, dryRun, currentUserId) => {
  const report = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    errors: [],
    unsupportedFields: [],
    missingMatters: [],
    missingContacts: [],
    missingUsers: [],
    duplicateCommunications: []
  };

  const dbMatters = await prisma.matter.findMany({
    select: { id: true, matter_number: true, title: true }
  });

  const dbUsers = await prisma.user.findMany({
    select: { id: true, full_name: true, email: true, role: true }
  });

  const currentUser = dbUsers.find(u => u.id === currentUserId);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    try {
      // 1. Resolve Matter
      const matterStr = (row.MatterDisplayNumber || row.MatterCustomNumber || row.MatterID || '').trim();
      let matchedMatter = null;

      if (!matterStr) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: No Matter provided in CSV. Skipped.`);
        report.missingMatters.push(`Row ${rowNum}: No Matter provided`);
        continue;
      }

      let byNumber = dbMatters.filter(m => m.matter_number === matterStr);
      if (byNumber.length === 1) matchedMatter = byNumber[0];
      
      if (!matchedMatter) {
        let byTitle = dbMatters.filter(m => m.title.toLowerCase() === matterStr.toLowerCase());
        if (byTitle.length === 1) matchedMatter = byTitle[0];
      }

      if (!matchedMatter) {
         let looseMatch = dbMatters.filter(m => m.matter_number && matterStr.includes(m.matter_number));
         if (looseMatch.length === 1) matchedMatter = looseMatch[0];
      }

      if (!matchedMatter) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: Could not resolve Matter '${matterStr}'. Matter missing.`);
        report.missingMatters.push(matterStr);
        continue;
      }

      // 2. Resolve Sender (User)
      const authorStr = (row.User || row.From || '').trim();
      let matchedUserId = currentUserId;
      let matchedRole = currentUser ? currentUser.role : 'admin';
      let originalAuthorInjected = false;

      if (authorStr) {
        const byEmail = dbUsers.find(u => u.email.toLowerCase() === authorStr.toLowerCase());
        if (byEmail) {
          matchedUserId = byEmail.id;
          matchedRole = byEmail.role;
        } else {
          const authorParts = authorStr.replace(/,?\s*Esq\.?/i, '').trim();
          const byName = dbUsers.find(u => 
            u.full_name && u.full_name.toLowerCase() === authorParts.toLowerCase()
          );
          if (byName) {
            matchedUserId = byName.id;
            matchedRole = byName.role;
          } else {
             originalAuthorInjected = true;
             report.warnings.push(`Row ${rowNum}: User '${authorStr}' not found. Assigned to importer.`);
             report.missingUsers.push(authorStr);
          }
        }
      }

      // 3. Resolve Type
      const typeStr = (row.Type || '').trim();
      let commType = 'portal_message';
      if (typeStr === '101') {
        commType = 'call_log';
      } else if (typeStr === '102') {
        commType = 'email_log';
      } else {
        report.warnings.push(`Row ${rowNum}: Unknown Clio Type '${typeStr}'. Defaulted to portal_message.`);
      }

      // 4. Prepare Content
      const subject = (row.Subject || '').trim();
      let messageBody = (row.Body || '').trim();
      const toRecipient = (row.To || '').trim();
      const externalUniqueId = (row.UniqueId || '').trim();
      const externalThreadId = (row.ThreadId || '').trim();

      // Preserve missing author and external IDs via appending to message_body
      let metadataFooter = [];
      if (originalAuthorInjected) {
         metadataFooter.push(`Original Sender: ${authorStr}`);
      }
      if (externalUniqueId) {
         metadataFooter.push(`Clio UniqueId: ${externalUniqueId}`);
      }
      if (externalThreadId) {
         metadataFooter.push(`Clio ThreadId: ${externalThreadId}`);
      }

      if (metadataFooter.length > 0) {
         messageBody += `\n\n--- IMPORT METADATA ---\n${metadataFooter.join('\n')}`;
      }

      // 5. Resolve Dates
      const dateStr = (row.CreatedAt || row.Date || '').trim();
      const createdAt = dateStr ? new Date(dateStr) : new Date();

      if (!dryRun) {
        // 6. Duplicate Detection
        const possibleDuplicates = await prisma.communication.findMany({
          where: {
            matter_id: matchedMatter.id,
            communication_type: commType,
            sender_user_id: matchedUserId,
            created_at: createdAt
          }
        });

        // Verify exact subject and message_body
        const isDuplicate = possibleDuplicates.some(dup => dup.subject === subject && dup.message_body === messageBody);

        if (isDuplicate) {
          report.skipped++;
          report.duplicateCommunications.push(`Row ${rowNum}`);
          report.warnings.push(`Row ${rowNum}: Duplicate communication skipped.`);
          continue;
        }

        // 7. Direct DB Insertion (Bypass communications service to avoid side effects)
        await prisma.communication.create({
          data: {
            matter_id: matchedMatter.id,
            sender_user_id: matchedUserId,
            sender_role: matchedRole,
            subject: subject || null,
            message_body: messageBody,
            to: toRecipient || null,
            visibility: 'internal',
            communication_type: commType,
            created_at: createdAt,
            updated_at: createdAt // Use original date for updated_at too to avoid tampering history
          }
        });

        report.imported++;
      } else {
         // Duplicate Detection Simulation for Dry Run (imperfect, relies on existing DB state only)
         const possibleDuplicates = await prisma.communication.findMany({
          where: {
            matter_id: matchedMatter.id,
            communication_type: commType,
            sender_user_id: matchedUserId,
            created_at: createdAt
          }
        });

        const isDuplicate = possibleDuplicates.some(dup => dup.subject === subject && dup.message_body === messageBody);
        if (isDuplicate) {
          report.skipped++;
          report.duplicateCommunications.push(`Row ${rowNum}`);
        } else {
          report.imported++;
        }
      }

    } catch (err) {
      report.failed++;
      report.errors.push(`Row ${rowNum}: Unexpected error - ${err.message}`);
    }
  }

  // Deduplicate arrays
  report.missingMatters = [...new Set(report.missingMatters)];
  report.missingUsers = [...new Set(report.missingUsers)];
  report.duplicateCommunications = [...new Set(report.duplicateCommunications)];

  return report;
};

module.exports = { processClioCommunicationImport };
