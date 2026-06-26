const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.template.findMany();
  console.log('Templates:');
  console.log(templates);
}

main().catch(console.error).finally(() => prisma.$disconnect());
