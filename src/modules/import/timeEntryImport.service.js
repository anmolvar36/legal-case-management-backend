const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const processClioTimeEntryImport = async (filePath, dryRun, userId) => {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      Papa.parse(fileContent.trim(), {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const report = await processTimeEntryRows(results.data, dryRun, userId);
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

const processTimeEntryRows = async (rows, dryRun, currentUserId) => {
  const report = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    warnings: [],
    errors: [],
    storedActivityLogs: 0
  };

  // Pre-fetch all matters for strict lookup
  const dbMatters = await prisma.matter.findMany({
    select: { id: true, matter_number: true, title: true }
  });

  const dbUsers = await prisma.user.findMany({
    select: { id: true, full_name: true, email: true }
  });

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

      // Exact match by matter_number
      let byNumber = dbMatters.filter(m => m.matter_number === matterStr || m.matter_number === matterIdStr);
      if (byNumber.length === 1) matchedMatter = byNumber[0];
      
      // Exact match by title
      if (!matchedMatter) {
        let byTitle = dbMatters.filter(m => m.title.toLowerCase() === matterStr.toLowerCase());
        if (byTitle.length === 1) matchedMatter = byTitle[0];
      }

      // Loose match (e.g. contains matter number)
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

      // 2. Resolve Lawyer
      const userStr = (row.User || '').trim();
      let matchedUserId = currentUserId; // Default to system default (current user)

      if (userStr) {
        const byEmail = dbUsers.find(u => u.email.toLowerCase() === userStr.toLowerCase());
        if (byEmail) {
          matchedUserId = byEmail.id;
        } else {
          const userParts = userStr.replace(/,?\s*Esq\.?/i, '').trim();
          const byName = dbUsers.find(u => 
            u.full_name && u.full_name.toLowerCase() === userParts.toLowerCase()
          );
          if (byName) {
            matchedUserId = byName.id;
          } else {
             report.warnings.push(`Row ${rowNum}: Lawyer '${userStr}' not found. Using system default.`);
          }
        }
      }

      // 3. Map Fields
      const dateStr = (row.Date || '').trim();
      if (!dateStr) {
        report.failed++;
        report.errors.push(`Row ${rowNum}: Missing Date field.`);
        continue;
      }
      const startTime = new Date(dateStr);
      
      const quantityStr = (row.Quantity || '0').trim();
      const durationMinutes = Math.round(parseFloat(quantityStr) * 60);

      // Financials & Descriptions to store in Activity Log
      const description = (row.Note || '').trim();
      const activityType = (row.ActivityDescription || '').trim();
      const totalAmount = (row.Total || '0').trim();
      const hourlyRate = (row.Price || '0').trim();
      const billedState = (row.BilledState || '').trim();
      const currency = (row.CurrencyCode || 'USD').trim();

      const activityLogContent = `
Time Entry Historical Data:
Activity: ${activityType || 'Time Entry'}
Note: ${description || 'No description provided'}
Rate: ${hourlyRate} ${currency}
Total: ${totalAmount} ${currency}
Billed State: ${billedState}
      `.trim();

      // 4. Check for duplicates
      // Since 'is_running' defaults to true, we also ensure we don't accidentally match running timers
      let existingTimeEntry = null;
      if (!dryRun) {
        const startOfDay = new Date(startTime);
        startOfDay.setUTCHours(0,0,0,0);
        const endOfDay = new Date(startTime);
        endOfDay.setUTCHours(23,59,59,999);

        const possibleDuplicates = await prisma.timeEntry.findMany({
          where: {
            matter_id: matchedMatter.id,
            duration_minutes: durationMinutes,
            start_time: {
              gte: startOfDay,
              lte: endOfDay
            }
          }
        });

        // We check if the associated activity log matches to definitively confirm duplication
        if (possibleDuplicates.length > 0) {
           for (const dup of possibleDuplicates) {
              const acts = await prisma.activity.findMany({
                 where: {
                   entity_type: 'TimeEntry',
                   entity_id: dup.id
                 }
              });
              if (acts.some(a => a.description === activityLogContent)) {
                 existingTimeEntry = dup;
                 break;
              }
           }
        }
      }

      // 5. Create or Update
      if (!dryRun) {
        if (existingTimeEntry) {
          // It's a duplicate, we update it
          await prisma.timeEntry.update({
            where: { id: existingTimeEntry.id },
            data: { user_id: matchedUserId }
          });
          
          // Activity log is already there, maybe update it? We'll leave it as is.
          report.updated++;
        } else {
          // Create new time entry
          const newTimeEntry = await prisma.timeEntry.create({
            data: {
              matter_id: matchedMatter.id,
              user_id: matchedUserId,
              start_time: startTime,
              duration_minutes: durationMinutes,
              is_running: false
            }
          });

          // Create Activity Log
          await prisma.activity.create({
            data: {
              matter_id: matchedMatter.id,
              actor_user_id: matchedUserId,
              entity_type: 'TimeEntry',
              entity_id: newTimeEntry.id,
              action: 'Historical Time Entry',
              description: activityLogContent
            }
          });

          report.imported++;
          report.storedActivityLogs++;
        }
      } else {
         // In dry run, we assume it's an import unless we implemented exact dup checking in dry run (which requires querying DB anyway)
         report.imported++;
         report.storedActivityLogs++;
      }

    } catch (err) {
      report.failed++;
      report.errors.push(`Row ${rowNum}: Unexpected error - ${err.message}`);
    }
  }

  return report;
};

module.exports = { processClioTimeEntryImport };
