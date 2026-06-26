const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw`SHOW COLUMNS FROM calendar_events`;
  console.log('calendar_events columns:');
  cols.forEach(c => console.log(`  ${c.Field} | ${c.Type} | Default: ${c.Default}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
