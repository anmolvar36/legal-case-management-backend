const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting UserRole migration...');
  const users = await prisma.user.findMany();
  let migrated = 0;

  for (const user of users) {
    if (!user.role) continue;
    
    // Check if role already exists to avoid duplicates and allow safe re-runs
    const existing = await prisma.userRole.findUnique({
      where: {
        user_id_role: {
          user_id: user.id,
          role: user.role,
        }
      }
    });

    if (!existing) {
      await prisma.userRole.create({
        data: {
          user_id: user.id,
          role: user.role,
        }
      });
      migrated++;
      console.log(`Migrated user ${user.id} with role ${user.role}`);
    }
  }

  console.log(`Migration complete. Created ${migrated} UserRole records.`);
  await prisma.$disconnect();
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
