const prisma = require('../../config/db');

const money = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return Number(v) || 0;
};

const getOverview = async () => {
  const [totalLeads, retainedCount, totalClients, paidAgg] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'retained' } }),
    prisma.client.count(),
    prisma.invoice.aggregate({
      where: { status: 'paid' },
      _sum: { amount: true },
    }),
  ]);

  const conversionRate = totalLeads ? Math.round((retainedCount / totalLeads) * 100) : 0;

  return {
    totalLeads: String(totalLeads),
    retained: String(retainedCount),
    clients: String(totalClients),
    conversion: `${conversionRate}%`,
    revenue: formatK(money(paidAgg._sum.amount)),
  };
};

function formatK(n) {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n)}`;
}

const getSources = async () => {
  const rows = await prisma.lead.groupBy({
    by: ['source'],
    where: { source: { not: null } },
    _count: { _all: true },
  });

  const total = rows.reduce((s, r) => s + r._count._all, 0);
  const palette = [
    'bg-primary-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-accent-500',
    'bg-blue-500',
    'bg-slate-500',
  ];

  return rows
    .map((r, i) => ({
      name: r.source || 'Unknown',
      value: total ? Math.round((r._count._all / total) * 100) : 0,
      color: palette[i % palette.length],
    }))
    .sort((a, b) => b.value - a.value);
};

const getAll = async (query) => {
  return getOverview();
};

const getById = async (id) => {
  return {};
};

const create = async (data) => {
  return data;
};

const update = async (id, data) => {
  return data;
};

const remove = async (id) => {
  return true;
};

const getSocialLinks = async () => {
  return await prisma.socialLink.findMany();
};

const updateSocialLinks = async (links) => {
  // Validate URLs
  for (const link of links) {
    if (link.url && link.url.trim() !== '') {
      try {
        new URL(link.url);
      } catch (e) {
        throw new Error(`Invalid URL for ${link.platform}: ${link.url}`);
      }
    }
  }

  const operations = links.map(link => 
    prisma.socialLink.upsert({
      where: { platform: link.platform },
      update: { url: link.url },
      create: { platform: link.platform, url: link.url }
    })
  );
  return await prisma.$transaction(operations);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getOverview,
  getSources,
  getSocialLinks,
  updateSocialLinks,
};
