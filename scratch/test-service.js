const titanEmailService = require('../src/services/email/titanEmail.service');

async function test() {
  const messages = await titanEmailService.getMessages(1, null, { folder: 'starred' });
  console.log("Starred Messages found:", messages.length);
  console.log(messages);

  const flagged = await titanEmailService.getMessages(1, null, { folder: 'flagged' });
  console.log("Flagged Messages found:", flagged.length);
  console.log(flagged);
}

test().catch(console.error);
