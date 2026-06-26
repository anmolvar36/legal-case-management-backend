const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const models = [
    'user',
    'userRole',
    'lawyer',
    'lead',
    'client',
    'matter',
    'matterStatusHistory',
    'document',
    'communication',
    'invoice',
    'invoiceItem',
    'payment',
    'draft',
    'signatureRequest',
    'signature',
    'template',
    'activity',
    'conflictCheck',
    'timeEntry',
    'setting',
    'report',
    'calendarEvent',
    'folder',
    'notification',
    'trustAccount',
    'trustTransaction',
    'socialLink',
    'practiceArea',
    'customFieldDefinition',
    'matterCustomFieldValue',
    'documentCategory',
    'companyProfile',
    'task'
  ];

  console.log('Counting rows in each Prisma model:');
  console.log('-----------------------------------');
  for (const model of models) {
    try {
      const count = await prisma[model].count();
      console.log(`${model}: ${count}`);
    } catch (e) {
      console.log(`${model}: Error (${e.message})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
