const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fields = await prisma.customFieldDefinition.findMany();
  console.log('TOTAL CUSTOM FIELDS:', fields.length);
  console.log('FIRST 10 CUSTOM FIELDS:');
  console.log(JSON.stringify(fields.slice(0, 10), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
