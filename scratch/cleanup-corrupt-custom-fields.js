const prisma = require('../src/config/db');

async function cleanup() {
  console.log('Fetching all custom field definitions...');
  const allFields = await prisma.customFieldDefinition.findMany({
    orderBy: { id: 'asc' }
  });

  const courtFormKeys = [
    'Atty Bar No', 'Fax', 'Atty For', 'Crt County', 'Crt Street', 'Crt Mailing Add',
    'Crt City Zip', 'Crt Branch', 'Party1', 'Party2', 'Party3', 'Ex Parte',
    'Applicant Name', 'Parent', 'Parent Name', 'Guardian', 'Guardian Name',
    'Conservator', 'Conservator Name', 'Party', 'Minor', 'Int Person', 'Int Person Cap',
    'G A L Info', 'Person Rep Info', 'Minor D O B', 'Person No Cap', 'No Cap Expl',
    'Att4b', 'Personw Conservator', 'Conserv Appt Details', 'Att4c', 'Print',
    'Save', 'Reset', 'Person3 Minorand', 'Minor U P A', 'Minor Req R O', 'Explain Inadeq',
    'Att6d', 'Att Name', 'Appl Sig Date', 'Appl Name', 'abc', 'Specify Fam Rel',
    'Specify Non Fam Rel', 'ab', 'Conflict Description', 'Att9b', 'G A L Sig Date', 'G A L Name', 'Rajno'
  ];

  const corruptFields = allFields.filter(f => courtFormKeys.includes(f.name.trim()) || f.name.length > 35);

  console.log(`Found ${corruptFields.length} court form migration / corrupt custom field definitions to purge.`);

  if (corruptFields.length > 0) {
    const corruptIds = corruptFields.map(f => f.id);
    await prisma.matterCustomFieldValue.deleteMany({
      where: { field_definition_id: { in: corruptIds } }
    });

    const result = await prisma.customFieldDefinition.deleteMany({
      where: { id: { in: corruptIds } }
    });
    console.log(`Successfully purged ${result.count} corrupt/junk custom field definitions.`);
  }

  const defaultFields = [
    { name: 'Settlement Goal', type: 'currency' },
    { name: 'Statute of Limitations', type: 'date' },
    { name: 'Court Jurisdiction', type: 'text' }
  ];

  for (const df of defaultFields) {
    const exists = await prisma.customFieldDefinition.findFirst({
      where: { name: df.name }
    });
    if (!exists) {
      await prisma.customFieldDefinition.create({
        data: { name: df.name, type: df.type, is_active: true }
      });
      console.log(`Created clean firm default custom field: ${df.name}`);
    }
  }

  const finalFields = await prisma.customFieldDefinition.findMany({ orderBy: { id: 'asc' } });
  console.log('Final clean Custom Field Definitions in DB:', finalFields.map(f => f.name));

  console.log('Cleanup finished successfully!');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
