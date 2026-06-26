const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndAdd() {
  const roles = await prisma.userRole.findMany();
  console.log('Current UserRoles:', roles);

  // Add lawyer role to user 1 (Victoria)
  const exists = await prisma.userRole.findUnique({
    where: { user_id_role: { user_id: 1, role: 'lawyer' } }
  });

  if (!exists) {
    await prisma.userRole.create({
      data: { user_id: 1, role: 'lawyer' }
    });
    console.log('Added lawyer role to Victoria (user_id: 1)');
  } else {
    console.log('Victoria already has lawyer role');
  }

  const updatedRoles = await prisma.userRole.findMany({ where: { user_id: 1 } });
  console.log('Victoria roles:', updatedRoles);
  
  await prisma.$disconnect();
}

checkAndAdd().catch(console.error);
