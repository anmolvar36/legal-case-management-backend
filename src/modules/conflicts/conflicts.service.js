const prisma = require('../../config/db');

/**
 * Perform a conflict of interest check across multiple entities
 */
const checkConflict = async ({ prospectiveClient, opposingParty, userId }) => {
  const pc = (prospectiveClient || '').trim().toLowerCase();
  const op = (opposingParty || '').trim().toLowerCase();

  if (!pc && !op) {
    throw new Error('At least one name is required for conflict check');
  }

  const matches = [];

  // 1. Search Clients
  const clients = await prisma.client.findMany({
    where: {
      OR: [
        { full_name: { contains: pc } },
        { full_name: { contains: op } }
      ]
    },
    select: { id: true, full_name: true, email: true }
  });
  clients.forEach(c => matches.push({ type: 'client', id: c.id, name: c.full_name, details: c.email }));

  // 2. Search Matters (Title, Opposing Party, or Client Name)
  const matters = await prisma.matter.findMany({
    where: {
      OR: [
        { title: { contains: pc } },
        { title: { contains: op } },
        { opposing_party_name: { contains: pc } },
        { opposing_party_name: { contains: op } },
        { client: { full_name: { contains: pc } } },
        { client: { full_name: { contains: op } } }
      ]
    },
    include: { client: true, assigned_lawyer: true }
  });
  matters.forEach(m => matches.push({ 
    type: 'matter', 
    id: m.id, 
    name: m.title, 
    details: `Case #${m.matter_number} | Client: ${m.client.full_name} | Opposing: ${m.opposing_party_name || 'N/A'}` 
  }));

  // 3. Search Leads
  const leads = await prisma.lead.findMany({
    where: {
      OR: [
        { full_name: { contains: pc } },
        { full_name: { contains: op } },
        { message: { contains: pc } },
        { message: { contains: op } }
      ]
    },
    select: { id: true, full_name: true, matter_type: true }
  });
  leads.forEach(l => matches.push({ type: 'lead', id: l.id, name: l.full_name, details: `Source: Lead | Interest: ${l.matter_type || 'General'}` }));

  // 4. Search Communications
  const communications = await prisma.communication.findMany({
    where: {
      OR: [
        { message_body: { contains: pc } },
        { message_body: { contains: op } }
      ]
    },
    include: { matter: true }
  });
  communications.forEach(com => matches.push({ 
    type: 'communication', 
    id: com.id, 
    name: `Message in Matter ${com.matter.matter_number}`, 
    details: com.message_body.substring(0, 100) + '...'
  }));

  const hasConflict = matches.length > 0;
  const result = hasConflict ? 'conflict' : 'no_conflict';

  // Save the record
  const checkRecord = await prisma.conflictCheck.create({
    data: {
      prospective_client_name: prospectiveClient,
      opposing_party_name: opposingParty,
      result,
      matches: matches, // Prisma handles JSON
      created_by_user_id: userId
    }
  });

  return {
    conflict: hasConflict,
    matches,
    message: hasConflict ? 'Potential conflict detected. Please review matches.' : 'No conflicts found. Safe to proceed.',
    id: checkRecord.id
  };
};

const getAll = async (query) => {
  return prisma.conflictCheck.findMany({
    include: { created_by: { select: { full_name: true } } },
    orderBy: { created_at: 'desc' }
  });
};

const getById = async (id) => {
  return prisma.conflictCheck.findUnique({
    where: { id: parseInt(id) },
    include: { created_by: { select: { full_name: true } } }
  });
};

const create = async (data) => {
  return prisma.conflictCheck.create({ data });
};

const update = async (id, data) => {
  return prisma.conflictCheck.update({
    where: { id: parseInt(id) },
    data
  });
};

const remove = async (id) => {
  return prisma.conflictCheck.delete({
    where: { id: parseInt(id) }
  });
};

module.exports = {
  checkConflict,
  getAll,
  getById,
  create,
  update,
  remove,
};