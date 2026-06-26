const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true, role: true }
  });
  console.log('Users:');
  console.log(users);

  const lawyers = await prisma.lawyer.findMany();
  console.log('Lawyers:');
  console.log(lawyers);

  const clients = await prisma.client.findMany({
    select: { id: true, full_name: true, email: true, user_id: true }
  });
  console.log('Clients:');
  console.log(clients);

  const matters = await prisma.matter.findMany({
    select: { id: true, matter_number: true, title: true, client_id: true }
  });
  console.log('Matters:');
  console.log(matters);
}

main().catch(console.error).finally(() => prisma.$disconnect());
