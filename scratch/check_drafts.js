const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.draft.findMany({
    include: { matter: true }
  });
  console.log(JSON.stringify(drafts, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
