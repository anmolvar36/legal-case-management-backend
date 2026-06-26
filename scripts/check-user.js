const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findFirst({where:{id:1}});
  console.log('Victoria info:', user.email);
  await prisma.$disconnect();
}

checkUser().catch(console.error);
