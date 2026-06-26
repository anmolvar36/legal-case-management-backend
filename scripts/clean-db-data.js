const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

async function cleanFiles(directory) {
  if (fs.existsSync(directory)) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      if (fs.statSync(filePath).isFile()) {
        try {
          fs.unlinkSync(filePath);
          console.log(`Deleted file: ${filePath}`);
        } catch (err) {
          console.error(`Error deleting file ${filePath}:`, err.message);
        }
      }
    }
  }
}

async function main() {
  console.log('Starting database and file cleanup...');

  // 1. Disable Foreign Key Checks
  console.log('Disabling foreign key checks...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  try {
    // 2. Truncate/Delete from transactional tables
    const tablesToTruncate = [
      'leads',
      'matters',
      'matter_status_history',
      'documents',
      'communications',
      'invoices',
      'invoice_items',
      'payments',
      'drafts',
      'signature_requests',
      'signatures',
      'templates',
      'activities',
      'conflict_checks',
      'time_entries',
      'calendar_events',
      'folders',
      'notifications',
      'trust_accounts',
      'trust_transactions',
      'tasks',
      'matter_custom_field_values'
    ];

    for (const table of tablesToTruncate) {
      console.log(`Truncating table: ${table}`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    }

    // 3. Clean specific client profiles (only delete 'Sample Lead' clients)
    console.log('Cleaning client profiles...');
    // We only delete clients that are not linked to a user (user_id is null) or are explicitly dummy leads converted
    await prisma.client.deleteMany({
      where: {
        OR: [
          { user_id: null },
          { full_name: 'Sample Lead' }
        ]
      }
    });

    // 4. Remove dummy practice areas
    console.log('Removing dummy practice areas...');
    await prisma.practiceArea.deleteMany({
      where: {
        name: 'qwerty'
      }
    });

    // 5. Reset company profile fields
    console.log('Resetting company profile info...');
    await prisma.companyProfile.updateMany({
      data: {
        company_name: null,
        address: null,
        phone: null,
        email: null,
        website: null,
        logo_url: null,
        letterhead_url: null
      }
    });

    // 6. Reset social link URLs
    console.log('Resetting social links to empty...');
    await prisma.socialLink.updateMany({
      data: {
        url: ''
      }
    });

    console.log('Database tables cleared successfully.');

  } catch (error) {
    console.error('Error during database truncation:', error);
  } finally {
    // Re-enable Foreign Key Checks
    console.log('Re-enabling foreign key checks...');
    await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  }

  // 7. Delete uploaded documents and company logos files from disk
  console.log('Cleaning upload files from disk...');
  const uploadsDocsDir = path.join(__dirname, '..', 'uploads', 'documents');
  const uploadsCompDir = path.join(__dirname, '..', 'uploads', 'company');
  
  await cleanFiles(uploadsDocsDir);
  await cleanFiles(uploadsCompDir);

  console.log('Cleanup completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
