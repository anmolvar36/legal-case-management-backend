const axios = require('axios');
const jwt = require('jsonwebtoken');

async function test() {
  const token = jwt.sign({ id: 1 }, "vktori_legal_secret_key_2024");

  try {
    const res = await axios.get('https://legal-case-management-backend-production.up.railway.app/api/titan-email/messages?folder=starred', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Live API Status:", res.status);
    console.log("Live Starred Messages Count:", res.data.data.length);
    console.log(res.data.data);
  } catch (err) {
    console.error("Live API Error:", err.response ? err.response.status : err.message);
    if (err.response) console.error(err.response.data);
  }
}

test().catch(console.error);
