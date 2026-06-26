const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const doc = await prisma.document.findUnique({
    where: { id: 3 }
  });
  console.log(JSON.stringify(doc, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
