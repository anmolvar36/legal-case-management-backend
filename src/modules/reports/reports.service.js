const prisma = require('../../config/db');

exports.generate = async (userId, body) => {
  const { title, category, start_date, end_date } = body;
  const cat = String(category || '').toLowerCase();

  const whereDate = {
    gte: new Date(start_date),
    lte: new Date(end_date)
  };

  const reportData = {
    leads: 0,
    matters: 0,
    revenue: 0,
    hours: 0
  };

  if (cat === 'financial') {
    // Revenue only
    const paidInvoices = await prisma.invoice.findMany({
      where: {
        status: 'paid',
        updated_at: whereDate
      },
      select: { amount: true }
    });
    reportData.revenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
  } 
  else if (cat === 'operational') {
    // Matters + Hours
    const mattersCount = await prisma.matter.count({
      where: { created_at: whereDate }
    });

    const timers = await prisma.timeEntry.findMany({
      where: {
        start_time: whereDate,
        is_running: false
      },
      select: { duration_minutes: true }
    });

    const totalMinutes = timers.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
    
    reportData.matters = mattersCount;
    reportData.hours = Number((totalMinutes / 60).toFixed(2));
  } 
  else if (cat === 'marketing') {
    // Leads only
    const leadsCount = await prisma.lead.count({
      where: { created_at: whereDate }
    });
    reportData.leads = leadsCount;
  } 
  else {
    // Fallback: All data
    const leadsCount = await prisma.lead.count({ where: { created_at: whereDate } });
    const mattersCount = await prisma.matter.count({ where: { created_at: whereDate } });
    const paidInvoices = await prisma.invoice.findMany({
      where: { status: 'paid', updated_at: whereDate },
      select: { amount: true }
    });
    const timers = await prisma.timeEntry.findMany({
      where: { start_time: whereDate, is_running: false },
      select: { duration_minutes: true }
    });

    const totalMinutes = timers.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);

    reportData.leads = leadsCount;
    reportData.matters = mattersCount;
    reportData.revenue = paidInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    reportData.hours = Number((totalMinutes / 60).toFixed(2));
  }

  const report = await prisma.report.create({
    data: {
      title,
      category,
      start_date: new Date(start_date),
      end_date: new Date(end_date),
      data: reportData,
      created_by: userId
    }
  });

  return report;
};

exports.list = async () => {
  return await prisma.report.findMany({
    orderBy: { created_at: 'desc' }
  });
};

exports.getById = async (id) => {
  return await prisma.report.findUnique({
    where: { id }
  });
};

exports.getMarketingStats = async () => {
  // Leads
  const totalLeads = await prisma.lead.count();

  // Clients
  const totalClients = await prisma.client.count();

  // Conversion Rate
  const conversionRate = totalLeads === 0
    ? 0
    : ((totalClients / totalLeads) * 100).toFixed(1);

  // Revenue (Paid Invoices Total)
  const payments = await prisma.invoice.findMany({
    where: { status: 'paid' },
    select: { amount: true }
  });

  const revenue = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Leads by source
  const leadsBySource = await prisma.lead.groupBy({
    by: ['source'],
    _count: { id: true }
  });

  // Map to UI friendly sources with percentages
  const totalBySources = leadsBySource.reduce((sum, item) => sum + item._count.id, 0);
  const formattedSources = leadsBySource.map(item => ({
    name: item.source || 'Other',
    value: totalBySources === 0 ? 0 : Math.round((item._count.id / totalBySources) * 100),
    count: item._count.id,
    color: item.source === 'Google' ? 'bg-blue-500' :
           item.source === 'Referral' ? 'bg-amber-500' :
           item.source === 'Social' ? 'bg-emerald-500' : 'bg-slate-400'
  }));

  return {
    visitors: totalLeads, // using leads as proxy for visitors in this simplified model
    leads: totalLeads,
    clients: totalClients,
    conversionRate,
    revenue,
    leadsBySource: formattedSources
  };
};
