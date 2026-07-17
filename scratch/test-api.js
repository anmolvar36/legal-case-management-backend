const axios = require('axios');

async function test() {
  // We need a token. Let's sign a token for user 1.
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET || 'your-jwt-secret-key-change-this');

  const res = await axios.get('http://localhost:5000/api/titan-email/messages?folder=starred', {
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("API Response Status:", res.status);
  console.log("Starred Messages in API:", res.data.data.length);
  console.log(res.data.data);
}

test().catch(console.error);
