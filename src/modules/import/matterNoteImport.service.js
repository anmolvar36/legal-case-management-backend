const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const processClioMatterNoteImport = async (filePath, dryRun, userId) => {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      Papa.parse(fileContent.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const report = await processMatterNoteRows(results.data, dryRun, userId);
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

const processMatterNoteRows = async (rows, dryRun, currentUserId) => {
  const report = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    errors: []
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
      const matterStr = (row.Matter || '').trim();
      const matterIdStr = (row.MatterId || '').trim();
      let matchedMatter = null;

      if (!matterStr && !matterIdStr) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: No Matter or MatterId provided in CSV. Skipped.`);
        continue;
      }

      let byNumber = dbMatters.filter(m => m.matter_number === matterStr || m.matter_number === matterIdStr);
      if (byNumber.length === 1) matchedMatter = byNumber[0];
      
      if (!matchedMatter) {
        let byTitle = dbMatters.filter(m => m.title.toLowerCase() === matterStr.toLowerCase());
        if (byTitle.length === 1) matchedMatter = byTitle[0];
      }

      if (!matchedMatter) {
         let looseMatch = dbMatters.filter(m => matterStr.includes(m.matter_number) || m.matter_number.includes(matterStr.split('-')[0]));
         if (looseMatch.length === 1) {
           matchedMatter = looseMatch[0];
         }
      }

      if (!matchedMatter) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: Could not resolve Matter '${matterStr}'. Matter missing.`);
        continue;
      }

      // 2. Resolve Author
      const authorStr = (row.Creator || row.Author || '').trim();
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
             report.warnings.push(`Row ${rowNum}: Author '${authorStr}' not found. Note assigned to importer with author metadata injected.`);
          }
        }
      }

      // 3. Prepare Content
      const subject = (row.Subject || '').trim();
      let messageBody = (row.Detail || row.Note || '').trim();

      if (originalAuthorInjected) {
         messageBody = `[Imported from Clio]\nOriginal Author: ${authorStr}\n--------------------\n\n${messageBody}`;
      }

      // 4. Resolve Dates
      const dateStr = (row.Date || row.CreatedAt || '').trim();
      const createdAt = dateStr ? new Date(dateStr) : new Date();

      if (!dryRun) {
        // 5. Duplicate Detection
        const possibleDuplicates = await prisma.communication.findMany({
          where: {
            matter_id: matchedMatter.id,
            communication_type: 'note',
            sender_user_id: matchedUserId,
            created_at: createdAt
          }
        });

        const isDuplicate = possibleDuplicates.some(dup => dup.message_body === messageBody);

        if (isDuplicate) {
          report.skipped++;
          report.warnings.push(`Row ${rowNum}: Duplicate note skipped.`);
          continue;
        }

        // 6. Direct DB Insertion (Bypass communications service to avoid side effects)
        await prisma.communication.create({
          data: {
            matter_id: matchedMatter.id,
            sender_user_id: matchedUserId,
            sender_role: matchedRole,
            subject: subject || null,
            message_body: messageBody,
            visibility: 'internal',
            communication_type: 'note',
            created_at: createdAt
          }
        });

        report.imported++;
      } else {
         report.imported++;
      }

    } catch (err) {
      report.failed++;
      report.errors.push(`Row ${rowNum}: Unexpected error - ${err.message}`);
    }
  }

  return report;
};

module.exports = { processClioMatterNoteImport };
