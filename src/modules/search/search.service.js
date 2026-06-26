const prisma = require('../../config/db');

const searchAll = async (q, user) => {
  if (!q || q.trim().length < 2) return [];
  const query = q.trim();

  // Define standard search for different roles
  // Admin: matters, clients, documents, leads, drafts
  // Lawyer: matters (assigned), clients, documents (of assigned matters), leads, drafts
  // Client: matters (own), documents (own/shared), drafts (sent for signature)

  const results = [];

  // 1. Search Matters
  const matterWhere = {
    OR: [
      { title: { contains: query } },
      { matter_number: { contains: query } },
      { description: { contains: query } },
    ]
  };
  if (user.role === 'lawyer') matterWhere.assigned_lawyer_id = user.id;
  if (user.role === 'client') matterWhere.client = { user_id: user.id };

  const matters = await prisma.matter.findMany({
    where: matterWhere,
    take: 5,
    select: { id: true, title: true, matter_number: true }
  });
  matters.forEach(m => results.push({
    type: 'Matter',
    id: m.id,
    title: m.title,
    subtitle: m.matter_number,
    url: user.role === 'admin' ? `/admin/matters/${m.id}` : (user.role === 'lawyer' ? `/lawyer/matters/${m.id}` : `/client/matters/${m.id}`)
  }));

  // 2. Search Clients (Admin/Lawyer only)
  if (user.role !== 'client') {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { full_name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ]
      },
      take: 5,
      select: { id: true, full_name: true, email: true }
    });
    clients.forEach(c => results.push({
      type: 'Client',
      id: c.id,
      title: c.full_name,
      subtitle: c.email,
      url: user.role === 'admin' ? `/admin/clients/${c.id}` : `/lawyer/clients/${c.id}`
    }));
  }

  // 3. Search Leads (Admin/Lawyer only)
  if (user.role !== 'client') {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { full_name: { contains: query } },
          { email: { contains: query } },
          { phone: { contains: query } },
        ]
      },
      take: 5,
      select: { id: true, full_name: true, email: true }
    });
    leads.forEach(l => results.push({
      type: 'Lead',
      id: l.id,
      title: l.full_name,
      subtitle: l.email,
      url: user.role === 'admin' ? `/admin/intake/${l.id}` : `/lawyer/intake/${l.id}` // Assuming lawyer has intake
    }));
  }

  // 4. Search Documents
  const docWhere = {
    OR: [
      { file_name: { contains: query } },
      { original_name: { contains: query } },
      { category: { contains: query } },
    ]
  };
  if (user.role === 'lawyer') docWhere.matter = { assigned_lawyer_id: user.id };
  if (user.role === 'client') {
    docWhere.matter = { client: { user_id: user.id } };
    docWhere.visibility = { in: ['client_shared', 'client_visible'] };
  }

  const docs = await prisma.document.findMany({
    where: docWhere,
    take: 5,
    select: { id: true, original_name: true, category: true, matter_id: true }
  });
  docs.forEach(d => results.push({
    type: 'Document',
    id: d.id,
    title: d.original_name,
    subtitle: d.category || 'Legal Document',
    url: user.role === 'admin' ? `/admin/matters/${d.matter_id}` : (user.role === 'lawyer' ? `/lawyer/matters/${d.matter_id}` : `/client/matters/${d.matter_id}`)
  }));

  return results;
};

module.exports = {
  searchAll
};
