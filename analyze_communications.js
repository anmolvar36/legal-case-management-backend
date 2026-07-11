const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeCommunications() {
  const csvData = fs.readFileSync('i:\\legal case sonu\\frontend\\migrate files\\communication_export.csv', 'utf8').trim();
  
  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data;
      console.log('Total Communications in CSV:', rows.length);
      
      let successfulMatterMatches = 0;
      let missingMatters = 0;
      let ambiguousMatters = 0;
      let failedMappings = [];

      const dbMatters = await prisma.matter.findMany({
        select: { id: true, matter_number: true, title: true }
      });

      const types = new Set();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const matterStr = (row.MatterDisplayNumber || row.MatterCustomNumber || row.MatterID || '').trim();
        
        types.add(row.Type || 'Unknown');

        let found = null;

        if (!matterStr) {
          failedMappings.push(`Row ${i+2}: No Matter provided in CSV.`);
          missingMatters++;
          continue;
        }

        let byNumber = dbMatters.filter(m => m.matter_number === matterStr);
        if (byNumber.length === 1) found = byNumber[0];
        
        if (!found) {
          let byTitle = dbMatters.filter(m => m.title.toLowerCase() === matterStr.toLowerCase());
          if (byTitle.length === 1) found = byTitle[0];
        }

        if (!found) {
           let looseMatch = dbMatters.filter(m => m.matter_number && matterStr.includes(m.matter_number));
           if (looseMatch.length === 1) found = looseMatch[0];
        }

        if (found) {
          successfulMatterMatches++;
        } else {
          missingMatters++;
          failedMappings.push(`Row ${i+2}: Could not resolve matter '${matterStr}'`);
        }
      }

      console.log('--- Communication Mapping Report ---');
      console.log('Successfully Resolved Matters:', successfulMatterMatches);
      console.log('Missing Matters:', missingMatters);
      console.log('Ambiguous Matter Matches:', ambiguousMatters);
      console.log('Detected Types:', Array.from(types));
      console.log('Failed Mappings Examples (up to 10):', failedMappings.slice(0, 10));

      await prisma.$disconnect();
    }
  });
}

analyzeCommunications().catch(console.error);
