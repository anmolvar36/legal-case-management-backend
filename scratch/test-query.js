const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, full_name: true }
  });
  console.log("Users:", users);

  const comms = await prisma.communication.findMany({
    where: { communication_type: 'titan_email' },
    select: {
      id: true,
      sender_user_id: true,
      to: true,
      subject: true,
      folder: true,
      is_starred: true,
      is_flagged: true,
      is_deleted: true
    }
  });
  console.log("Comms:", comms);
}

test().catch(console.error);
