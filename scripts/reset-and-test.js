// Generate and set a known password for testing
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function resetAndTest() {
  const testPassword = 'admin123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(testPassword, salt);
  
  await prisma.user.update({
    where: { id: 1 },
    data: { password_hash: hash }
  });
  
  console.log('Password reset to "admin123" for admin@vktori.com');
  
  // Now test auth.service.js login logic directly
  const user = await prisma.user.findUnique({
    where: { email: 'admin@vktori.com' },
    include: { roles: true }
  });
  
  const isValid = await bcrypt.compare(testPassword, user.password_hash);
  console.log('Password valid:', isValid);
  console.log('user.roles from DB:', user.roles.map(r => r.role));
  
  await prisma.$disconnect();
}

resetAndTest().catch(console.error);
