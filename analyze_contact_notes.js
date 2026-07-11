const fs = require('fs');
const Papa = require('papaparse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeContactNotes() {
  const csvData = fs.readFileSync('i:\\legal case sonu\\frontend\\migrate files\\contact_note_export.csv', 'utf8').trim();
  
  Papa.parse(csvData, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const rows = results.data;
      console.log('Total Contact Notes in CSV:', rows.length);
      
      let successfulMatches = 0;
      let missingContacts = 0;
      let ambiguousMatches = 0;
      let failedMappings = [];

      const dbClients = await prisma.client.findMany({
        select: { id: true, full_name: true, email: true, phone: true }
      });

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const contactStr = (row.Contact || '').trim();
        const contactIdStr = (row.ContactId || '').trim();
        
        let found = null;

        if (!contactStr && !contactIdStr) {
          failedMappings.push(`Row ${i+2}: No Contact or ContactId provided in CSV.`);
          missingContacts++;
          continue;
        }

        let byName = dbClients.filter(c => c.full_name.toLowerCase() === contactStr.toLowerCase());
        if (byName.length === 1) found = byName[0];
        
        if (!found) {
          missingContacts++;
          failedMappings.push(`Row ${i+2}: Could not resolve contact '${contactStr}' or ID '${contactIdStr}'`);
        } else {
          successfulMatches++;
        }
      }

      console.log('--- Contact Mapping Report ---');
      console.log('Successfully Resolved Contacts:', successfulMatches);
      console.log('Missing Contacts:', missingContacts);
      console.log('Ambiguous Contact Matches:', ambiguousMatches);
      console.log('Failed Mappings Examples (up to 10):', failedMappings.slice(0, 10));

      await prisma.$disconnect();
    }
  });
}

analyzeContactNotes().catch(console.error);
