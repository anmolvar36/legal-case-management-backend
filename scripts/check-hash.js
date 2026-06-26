const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function checkHash() {
  const u = await prisma.user.findFirst({ where: { id: 1 } });
  console.log('Email:', u.email);
  console.log('Hash in db:', u.password_hash);
  const testPasswords = ['password123', 'Password123', 'password', 'admin123', 'admin'];
  for (const pw of testPasswords) {
    const match = await bcrypt.compare(pw, u.password_hash);
    if (match) console.log('MATCH FOUND: password is:', pw);
  }
  console.log('Done checking common passwords');
  await prisma.$disconnect();
}

checkHash().catch(console.error);
