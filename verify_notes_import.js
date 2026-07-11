const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const FILE_PATH = 'i:/legal case sonu/frontend/migrate files/matter_note_export (1).csv';

const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'vktori_legal_secret_key_2024', { expiresIn: '1h' });

async function runVerification() {
  console.log('--- STARTING MATTER NOTES VERIFICATION ---');

  // 1. Dry Run
  console.log('\n>>> Executing Dry Run via API...');
  const formDryRun = new FormData();
  formDryRun.append('file', fs.createReadStream(FILE_PATH));

  try {
    const dryRunRes = await axios.post(`${API_URL}/import/clio/matter-notes?dryRun=true`, formDryRun, {
      headers: { ...formDryRun.getHeaders(), Authorization: `Bearer ${token}` }
    });
    console.log('Dry Run Success:', dryRunRes.data.success);
    console.log(`Dry Run Results -> Imported: ${dryRunRes.data.imported}, Failed: ${dryRunRes.data.failed}, Skipped: ${dryRunRes.data.skipped}`);
    if (dryRunRes.data.warnings.length) console.log('Warnings:', dryRunRes.data.warnings);
  } catch (err) {
    console.error('Dry Run Failed:', err.response ? err.response.data : err.message);
    return;
  }

  // 2. Actual Import
  console.log('\n>>> Executing Actual Import via API...');
  const formActual = new FormData();
  formActual.append('file', fs.createReadStream(FILE_PATH));

  try {
    const importRes = await axios.post(`${API_URL}/import/clio/matter-notes`, formActual, {
      headers: { ...formActual.getHeaders(), Authorization: `Bearer ${token}` }
    });
    console.log('Actual Import Success:', importRes.data.success);
    console.log(`Actual Import Results -> Imported: ${importRes.data.imported}, Updated: ${importRes.data.updated}, Failed: ${importRes.data.failed}`);
    if (importRes.data.warnings.length) console.log('Warnings:', importRes.data.warnings);
  } catch (err) {
    console.error('Actual Import Failed:', err.response ? err.response.data : err.message);
    return;
  }

  // 3. Verify Database
  console.log('\n>>> Verifying Database...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const totalNotes = await prisma.communication.count({
      where: { communication_type: 'note' }
    });
    const latestNotes = await prisma.communication.findMany({
      where: { communication_type: 'note' },
      take: 5,
      orderBy: { created_at: 'desc' },
      include: { matter: true, sender: true }
    });

    console.log(`Total Matter Notes in DB: ${totalNotes}`);
    latestNotes.forEach(t => {
      console.log(`-> Note ID: ${t.id}, Matter: ${t.matter?.title}, Author: ${t.sender?.email}, Date: ${t.created_at.toISOString()}`);
    });

  } catch (err) {
    console.error('Database Verification Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
