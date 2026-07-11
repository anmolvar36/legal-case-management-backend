const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const API_URL = 'http://localhost:5000/api';
const FILE_PATH = 'i:/legal case sonu/frontend/migrate files/matter_export.csv';

// Generate token for admin user
const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'vktori_legal_secret_key_2024', { expiresIn: '1h' });

async function runVerification() {
  console.log('--- STARTING VERIFICATION ---');

  // 1. Dry Run
  console.log('\n>>> Executing Dry Run via API...');
  const formDryRun = new FormData();
  formDryRun.append('file', fs.createReadStream(FILE_PATH));

  try {
    const dryRunRes = await axios.post(`${API_URL}/import/clio/matters?dryRun=true`, formDryRun, {
      headers: {
        ...formDryRun.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Dry Run Success:', dryRunRes.data.success);
    console.log(`Dry Run Results -> Imported: ${dryRunRes.data.imported}, Failed: ${dryRunRes.data.failed}`);
  } catch (err) {
    console.error('Dry Run Failed:', err.response ? err.response.data : err.message);
    return;
  }

  // 2. Actual Import
  console.log('\n>>> Executing Actual Import via API...');
  const formActual = new FormData();
  formActual.append('file', fs.createReadStream(FILE_PATH));

  try {
    const importRes = await axios.post(`${API_URL}/import/clio/matters`, formActual, {
      headers: {
        ...formActual.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Actual Import Success:', importRes.data.success);
    console.log(`Actual Import Results -> Imported: ${importRes.data.imported}, Updated: ${importRes.data.updated}, Failed: ${importRes.data.failed}`);
  } catch (err) {
    console.error('Actual Import Failed:', err.response ? err.response.data : err.message);
    return;
  }

  // 3. Verify Database
  console.log('\n>>> Verifying Database...');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const totalMatters = await prisma.matter.count();
    const matters = await prisma.matter.findMany({
      take: 20,
      orderBy: { created_at: 'desc' },
      include: { client: true, assigned_lawyer: true }
    });

    console.log(`Total Matters in DB: ${totalMatters}`);
    console.log(`Recent Imported Matter: ${matters[0]?.title} (Client: ${matters[0]?.client?.full_name})`);
    
    // Check API endpoint for matters
    console.log('\n>>> Fetching /api/matters via API...');
    const getMattersRes = await axios.get(`${API_URL}/matters`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`API returned ${getMattersRes.data.data?.length || 0} matters`);

  } catch (err) {
    console.error('Database Verification Failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
