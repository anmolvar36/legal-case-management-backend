const http = require('http');

async function testLogin() {
  // Password was just reset to admin123 by reset-and-test.js
  const body = JSON.stringify({ email: 'admin@vktori.com', password: 'admin123' });

  const data = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });

  console.log('=== LOGIN API RESPONSE ===');
  console.log(JSON.stringify(data, null, 2));

  const user = data?.data?.user;
  const token = data?.data?.token;

  console.log('\n=== USER ROLES IN RESPONSE ===');
  console.log('user.roles:', user?.roles);

  if (token) {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    console.log('\n=== JWT PAYLOAD ===');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\njwt.roles:', payload.roles);
  }
}

testLogin().catch(console.error);
