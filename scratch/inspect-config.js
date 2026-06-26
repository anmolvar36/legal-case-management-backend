const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.setting.findMany();
  console.log('Settings:');
  console.log(settings);

  const company = await prisma.companyProfile.findMany();
  console.log('Company Profile:');
  console.log(company);

  const docCats = await prisma.documentCategory.findMany();
  console.log('Document Categories:');
  console.log(docCats);

  const practice = await prisma.practiceArea.findMany();
  console.log('Practice Areas:');
  console.log(practice);
}

main().catch(console.error).finally(() => prisma.$disconnect());
