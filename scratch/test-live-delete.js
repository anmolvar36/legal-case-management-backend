const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 1 }, "vktori_legal_secret_key_2024");

  try {
    // Call bulk delete on message 154 (which is already in trash)
    const res = await axios.post('https://legal-case-management-backend-production.up.railway.app/api/titan-email/bulk', {
      messageIds: [154],
      action: 'delete'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Delete API Status:", res.status);
    console.log("Delete API Response:", res.data);

    // Verify state in DB directly
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const msg = await prisma.communication.findUnique({ where: { id: 154 } });
    console.log("Message 154 is_deleted:", msg.is_deleted);
  } catch (err) {
    console.error("API Error:", err.response ? err.response.status : err.message);
    if (err.response) console.error(err.response.data);
  }
}

test().catch(console.error);
