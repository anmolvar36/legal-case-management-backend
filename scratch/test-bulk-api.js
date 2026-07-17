const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 1 }, "vktori_legal_secret_key_2024");

  try {
    const res = await axios.post('https://legal-case-management-backend-production.up.railway.app/api/titan-email/bulk', {
      messageIds: [154, 155],
      action: 'mark_unread'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Bulk API Status:", res.status);
    console.log("Bulk API Response:", res.data);
  } catch (err) {
    console.error("Bulk API Error:", err.response ? err.response.status : err.message);
    if (err.response) console.error(err.response.data);
  }
}

test().catch(console.error);
