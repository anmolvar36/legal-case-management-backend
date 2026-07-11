const fs = require('fs');
const mysql = require('mysql2/promise');

async function run() {
  try {
    const connection = await mysql.createConnection({
      host: 'crossover.proxy.rlwy.net',
      port: 47654,
      user: 'root',
      password: 'pFvCTTfLyKNoFAzwasoCLdzWROLBaOut',
      multipleStatements: true
    });

    console.log('Connected to Railway DB.');
    
    await connection.query('DROP DATABASE IF EXISTS railway; CREATE DATABASE railway; USE railway;');
    console.log('Database railway created/reset.');

    const sql = fs.readFileSync('../legal-case-management.sql', 'utf8');
    
    console.log('Executing SQL dump (size: ' + sql.length + ' bytes)...');
    await connection.query(sql);
    
    console.log('Import successful!');
    await connection.end();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
