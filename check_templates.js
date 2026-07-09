const prisma = require('./src/config/db');

async function run() {
  try {
    const templates = await prisma.template.findMany();
    console.log('All Templates in DB:');
    templates.forEach(t => {
      console.log(`ID: ${t.id}, Title: "${t.title}", Category: "${t.category}"`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
