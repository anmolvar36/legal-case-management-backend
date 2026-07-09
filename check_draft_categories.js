const prisma = require('./src/config/db');

async function run() {
  try {
    const drafts = await prisma.draft.findMany();
    console.log('All Drafts in DB:');
    drafts.forEach(d => {
      console.log(`ID: ${d.id}, Title: ${d.title}, Category: "${d.category}", Status: ${d.status}`);
    });
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
