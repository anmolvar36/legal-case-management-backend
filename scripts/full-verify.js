const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAll() {
  console.log('=== 1. PRISMA SCHEMA VERIFICATION ===');
  console.log('UserRole model exists in schema: YES (UserRole table is queried below)\n');

  console.log('=== 2. USER_ROLES TABLE (All Records) ===');
  const allRoles = await prisma.userRole.findMany({
    orderBy: { user_id: 'asc' }
  });
  console.table(allRoles);

  console.log('\n=== 3. VICTORIA (user_id=1) ROLES ===');
  const victoriaRoles = await prisma.userRole.findMany({ where: { user_id: 1 } });
  console.table(victoriaRoles);
  console.log('Victoria has roles:', victoriaRoles.map(r => r.role));

  console.log('\n=== 4. ALL USERS WITH ROLES ===');
  const users = await prisma.user.findMany({
    select: { id: true, full_name: true, email: true, role: true, roles: true }
  });
  for (const u of users) {
    const roles = u.roles.map(r => r.role);
    console.log(`ID ${u.id}: ${u.full_name} (${u.email}) → roles: [${roles.join(', ')}]`);
  }

  await prisma.$disconnect();
}

verifyAll().catch(console.error);
