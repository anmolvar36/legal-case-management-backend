const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const categories = ['Pleadings', 'Motions', 'Discovery', 'Medical Records', 'Evidence', 'Contracts', 'Invoices', 'Correspondence', 'Other'];

async function seed() {
  for (const c of categories) {
    await prisma.documentCategory.upsert({ 
      where: { name: c }, 
      update: {}, 
      create: { name: c } 
    });
  }
  console.log('Seeded document categories');
  process.exit(0);
}
seed();
