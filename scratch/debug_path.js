const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const path = require('path');

async function main() {
  const form = await prisma.generatedForm.findUnique({
    where: { id: 31 },
    include: { template: true }
  });
  if (!form) {
    console.log('Form draft not found');
    return;
  }
  console.log('Form Template PDF Path:', form.template.pdf_path);
  console.log('process.cwd():', process.cwd());
  
  const templatesDirectory = path.resolve(process.cwd(), 'uploads', 'templates');
  const fallbackDirectory = path.resolve(process.cwd(), 'src', 'modules', 'court-forms', 'templates');
  const pdfAbsolutePath = path.resolve(process.cwd(), form.template.pdf_path);
  
  console.log('templatesDirectory:', templatesDirectory);
  console.log('fallbackDirectory:', fallbackDirectory);
  console.log('pdfAbsolutePath:', pdfAbsolutePath);
  
  const isInUploads = pdfAbsolutePath.startsWith(`${templatesDirectory}${path.sep}`) || pdfAbsolutePath === templatesDirectory;
  const isInFallback = pdfAbsolutePath.startsWith(`${fallbackDirectory}${path.sep}`) || pdfAbsolutePath === fallbackDirectory;
  
  console.log('isInUploads:', isInUploads);
  console.log('isInFallback:', isInFallback);
}

main().catch(console.error).finally(() => prisma.$disconnect());
