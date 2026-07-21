const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.courtFormTemplate.findFirst({ where: { form_number: 'CM-010' }, include: { mappings: true } })
  .then(t => { 
    if(t) {
        console.log(JSON.stringify(t.mappings.map(m => m.pdf_field_name + " -> " + m.system_field_path), null, 2)); 
    }
    p.$disconnect(); 
  });
