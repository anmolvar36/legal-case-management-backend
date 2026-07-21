const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.courtFormTemplate.findFirst({ where: { form_number: 'CM-010' }, include: { mappings: true } })
  .then(t => { 
    if(t) {
        console.log(JSON.stringify(t.mappings.filter(m => m.pdf_field_name.toLowerCase().includes('zip')), null, 2)); 
    } else {
        console.log("Template not found");
    }
    p.$disconnect(); 
  });
