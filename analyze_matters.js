const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  const csvData = fs.readFileSync('i:\\legal case sonu\\frontend\\migrate files\\time_entry_export.csv', 'utf8').trim();
  
  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data;
      console.log('Total Time Entries:', rows.length);
      
      let successfulMatches = 0;
      let missingMatters = 0;
      let ambiguousMatches = 0;
      let failedMappings = [];

      // Get all DB matters
      const dbMatters = await prisma.matter.findMany({
        select: { id: true, matter_number: true, title: true }
      });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const matterStr = (row.Matter || '').trim();
        const matterIdStr = (row.MatterId || '').trim();
        
        let found = null;
        let matches = [];

        if (!matterStr && !matterIdStr) {
          failedMappings.push(`Row ${i+2}: No Matter or MatterId provided in CSV.`);
          missingMatters++;
          continue;
        }

        // Priority 2/3: DisplayNumber/Matter Number
        // Clio format often displays matter as "00002-Cabler Sampson" or "MAT-001"
        // Let's try matching against matter_number
        let byNumber = dbMatters.filter(m => m.matter_number === matterStr || m.matter_number === matterIdStr);
        if (byNumber.length === 1) found = byNumber[0];
        
        // Priority 4: Exact Matter Title (case-insensitive)
        if (!found) {
          let byTitle = dbMatters.filter(m => m.title.toLowerCase() === matterStr.toLowerCase());
          if (byTitle.length === 1) found = byTitle[0];
          else if (byTitle.length > 1) {
             ambiguousMatches++;
             failedMappings.push(`Row ${i+2}: Ambiguous match for title '${matterStr}'`);
             continue;
          }
        }

        // Try loose matching: maybe the matter string contains the DisplayNumber? e.g. "00002-Cabler Sampson"
        if (!found) {
           let looseMatch = dbMatters.filter(m => matterStr.includes(m.matter_number) || m.matter_number.includes(matterStr.split('-')[0]));
           if (looseMatch.length === 1) {
             found = looseMatch[0];
           } else if (looseMatch.length > 1) {
             ambiguousMatches++;
             failedMappings.push(`Row ${i+2}: Ambiguous loose match for '${matterStr}'`);
             continue;
           }
        }

        if (found) {
          successfulMatches++;
        } else {
          missingMatters++;
          failedMappings.push(`Row ${i+2}: Could not resolve matter '${matterStr}' or ID '${matterIdStr}'`);
        }
      }

      console.log('--- Matter Mapping Report ---');
      console.log('Successfully Resolved Matters:', successfulMatches);
      console.log('Missing Matters:', missingMatters);
      console.log('Ambiguous Matter Matches:', ambiguousMatches);
      console.log('Failed Mappings Examples (up to 10):', failedMappings.slice(0, 10));

      await prisma.$disconnect();
    }
  });
}

analyze().catch(console.error);
