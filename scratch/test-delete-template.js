const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDelete() {
  try {
    // Find a template
    const template = await prisma.courtFormTemplate.findFirst({
      where: { form_number: 'SUBP-010' }
    });
    if (!template) {
      console.log('Template not found');
      return;
    }
    console.log('Deleting template:', template.id);
    
    // Try to delete
    await prisma.courtFormTemplate.delete({
      where: { id: template.id }
    });
    console.log('Deleted successfully!');
  } catch (err) {
    console.error('Error deleting template:');
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();
