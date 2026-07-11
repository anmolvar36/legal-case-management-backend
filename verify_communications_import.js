const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const FILE_PATH = 'i:/legal case sonu/frontend/migrate files/communication_export.csv';

const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'vktori_legal_secret_key_2024', { expiresIn: '1h' });

async function runVerification() {
  console.log('--- STARTING COMMUNICATIONS VERIFICATION ---');

  // 1. Dry Run
  console.log('\n>>> Executing Dry Run via API...');
  const formDryRun = new FormData();
  formDryRun.append('file', fs.createReadStream(FILE_PATH));

  try {
    const dryRunRes = await axios.post(`${API_URL}/import/clio/communications?dryRun=true`, formDryRun, {
      headers: { ...formDryRun.getHeaders(), Authorization: `Bearer ${token}` }
    });
    console.log('Dry Run Success:', dryRunRes.data.success);
    console.log(`Dry Run Results -> Imported: ${dryRunRes.data.imported}, Failed: ${dryRunRes.data.failed}, Skipped: ${dryRunRes.data.skipped}`);
    if (dryRunRes.data.missingMatters.length) console.log('Missing Matters:', dryRunRes.data.missingMatters.length);
    if (dryRunRes.data.warnings.length) console.log('Warnings Preview:', dryRunRes.data.warnings.slice(0, 3));
  } catch (err) {
    console.error('Dry Run Failed:', err.response ? err.response.data : err.message);
    return;
  }

  // 2. Actual Import
  console.log('\n>>> Executing Actual Import via API...');
  const formActual = new FormData();
  formActual.append('file', fs.createReadStream(FILE_PATH));

  try {
    const importRes = await axios.post(`${API_URL}/import/clio/communications`, formActual, {
      headers: { ...formActual.getHeaders(), Authorization: `Bearer ${token}` }
    });
    console.log('Actual Import Success:', importRes.data.success);
    console.log(`Actual Import Results -> Imported: ${importRes.data.imported}, Skipped: ${importRes.data.skipped}`);
  } catch (err) {
    console.error('Actual Import Failed:', err.response ? err.response.data : err.message);
    return;
  }

  // 3. Verify Database
  console.log('\n>>> Verifying Database...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const totalComms = await prisma.communication.count();
    const emails = await prisma.communication.count({ where: { communication_type: 'email_log' }});
    const calls = await prisma.communication.count({ where: { communication_type: 'call_log' }});

    console.log(`Total Communications in DB: ${totalComms}`);
    console.log(`Total Email Logs: ${emails}`);
    console.log(`Total Call Logs: ${calls}`);

    const lastComms = await prisma.communication.findMany({
      orderBy: { id: 'desc' },
      take: 3,
      include: { matter: { select: { title: true } }, sender: { select: { full_name: true } } }
    });

    console.log('\nLast 3 Imported Communications:');
    lastComms.forEach(c => {
      console.log(`\n- Subject: ${c.subject}`);
      console.log(`  Type: ${c.communication_type}`);
      console.log(`  Matter: ${c.matter?.title}`);
      console.log(`  Sender: ${c.sender?.full_name}`);
      console.log(`  Date: ${c.created_at}`);
      const bodyPreview = c.message_body.replace(/\n/g, ' ').substring(0, 100);
      console.log(`  Body Preview: ${bodyPreview}...`);
    });

  } catch (err) {
    console.error('Database Verification Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
