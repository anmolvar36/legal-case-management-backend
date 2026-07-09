const prisma = require('../../config/db');

const money = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return Number(v) || 0;
};

const formatMoney = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

const relTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = now - date;
  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diff < 172800000) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getAdminDashboard = async () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const deadlineHorizon = new Date(now.getTime() + 30 * 86400000);

  const [
    totalLeads,
    totalClients,
    totalMatters,
    activeMatters,
    pendingMatters,
    completedMatters,
    totalLawyers,
    pendingInvoices,
    overdueInvoices,
    draftsOpen,
    documentCount,
    communicationCount,
    upcomingDeadlineCount,
    openTasks,
    tasksDueToday,
    overdueTasks,
    completedTasksWeek,
    upcomingCourtDates,
    upcomingFilingDeadlines,
    eventsToday,
  ] = await Promise.all([
    prisma.lead.count(),
    prisma.client.count(),
    prisma.matter.count(),
    prisma.matter.count({ where: { status: 'active' } }),
    prisma.matter.count({ where: { status: 'pending' } }),
    prisma.matter.count({ where: { status: 'completed' } }),
    prisma.user.count({ where: { role: 'lawyer', is_active: true } }),
    prisma.invoice.count({ where: { status: { in: ['unpaid', 'draft', 'due'] } } }),
    prisma.invoice.count({ where: { status: 'overdue' } }),
    prisma.draft.count({
      where: { status: { in: ['draft', 'ready', 'sent_for_signature'] } },
    }),
    prisma.document.count(),
    prisma.communication.count(),
    prisma.invoice.count({
      where: {
        due_date: { gte: now, lte: deadlineHorizon },
        status: { in: ['unpaid', 'overdue', 'draft', 'due'] },
      },
    }),
    prisma.task.count({ where: { status: { in: ['open', 'in_progress'] } } }),
    prisma.task.count({
      where: {
        due_date: {
          gte: new Date(now.setHours(0,0,0,0)),
          lte: new Date(now.setHours(23,59,59,999))
        },
        status: { not: 'completed' }
      }
    }),
    prisma.task.count({
      where: {
        due_date: { lt: new Date(now.setHours(0,0,0,0)) },
        status: { not: 'completed' }
      }
    }),
    prisma.task.count({
      where: {
        status: 'completed',
        completed_at: {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }),
    prisma.calendarEvent.count({
      where: {
        is_court_event: true,
        event_date: { gte: now }
      }
    }),
    prisma.calendarEvent.count({
      where: {
        type: 'filing_deadline',
        event_date: { gte: now }
      }
    }),
    prisma.calendarEvent.count({
      where: {
        is_court_event: true,
        event_date: {
          gte: new Date(new Date(now).setDate(now.getDate() - now.getDay())),
          lte: new Date(new Date(now).setDate(now.getDate() - now.getDay() + 7))
        }
      }
    }),
  ]);

  const paymentsThisMonth = await prisma.payment.findMany({
    where: {
      paid_on: { gte: monthStart, lte: monthEnd },
    },
    include: {
      invoice: {
        include: {
          matter: { select: { practice_area: true } },
        },
      },
    },
  });

  let revenueMonthTotal = 0;
  const byPa = {};
  for (const p of paymentsThisMonth) {
    const amt = money(p.amount);
    revenueMonthTotal += amt;
    const pa = p.invoice?.matter?.practice_area || 'General';
    byPa[pa] = (byPa[pa] || 0) + amt;
  }

  const revenueByPracticeArea = Object.entries(byPa)
    .map(([practiceArea, amount]) => ({
      practiceArea,
      amount,
      pct: revenueMonthTotal > 0 ? Math.round((amount / revenueMonthTotal) * 100) : 0,
      amountFormatted: formatMoney(amount),
    }))
    .sort((a, b) => b.amount - a.amount);

  const recentMatters = await prisma.matter.findMany({
    take: 5,
    orderBy: { updated_at: 'desc' },
    include: { client: { select: { full_name: true } } },
  });

  const recentLeads = await prisma.lead.findMany({
    take: 5,
    orderBy: { created_at: 'desc' },
  });

  const upcomingInvoices = await prisma.invoice.findMany({
    where: {
      due_date: { gte: now },
      status: { in: ['unpaid', 'overdue', 'draft'] },
    },
    take: 4,
    orderBy: { due_date: 'asc' },
    include: { matter: { select: { title: true, matter_number: true } } },
  });

  const upcomingDeadlines = upcomingInvoices.map((inv) => {
    const d = inv.due_date ? new Date(inv.due_date) : now;
    const color = inv.status === 'overdue' ? 'red' : 'amber';
    return {
      day: d.getDate(),
      month: d.toLocaleString('en-US', { month: 'short' }),
      title: `${inv.invoice_number} · ${inv.matter?.title || 'Matter'}`,
      time: '',
      color,
    };
  });

  const activities = await prisma.activity.findMany({
    take: 12,
    orderBy: { created_at: 'desc' },
    include: {
      matter: { select: { title: true, matter_number: true } },
      actor: { select: { full_name: true } },
    },
  });

  const activityFeed = activities.map((a) => ({
    icon: '•',
    text: a.description || `${a.action} · ${a.entity_type}`,
    time: relTime(a.created_at),
    bg: 'bg-slate-100 text-slate-600',
  }));

  return {
    counts: {
      totalLeads,
      totalClients,
      totalMatters,
      activeMatters,
      pendingMatters,
      completedMatters,
      openMatters: activeMatters + pendingMatters,
      totalLawyers,
      pendingInvoices,
      overdueInvoices,
      draftsOpen,
      documentCount,
      communicationCount,
      upcomingDeadlineCount,
      openTasks,
      tasksDueToday,
      overdueTasks,
      completedTasksWeek,
      upcomingCourtDates,
      upcomingCourtAppearances: upcomingCourtDates,
      upcomingFilingDeadlines,
      eventsToday,
      courtEventsThisWeek: eventsToday,
    },
    revenue: {
      monthLabel: monthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      total: revenueMonthTotal,
      totalFormatted: formatMoney(revenueMonthTotal),
      byPracticeArea: revenueByPracticeArea,
    },
    recentMatters: recentMatters.map((m) => ({
      id: m.id,
      matterNumber: m.matter_number,
      title: m.title,
      clientName: m.client?.full_name || '',
      status: m.status,
    })),
    recentLeads: recentLeads.map((l) => ({
      id: l.id,
      fullName: l.full_name,
      matterType: l.matter_type,
      source: l.source,
      status: l.status,
      createdAt: l.created_at,
    })),
    upcomingDeadlines,
    activityFeed,
  };
};

const getLawyerStats = async (userId) => {
  const now = new Date();
  const [matters, drafts, messages, clientCount, myOpenTasks, myTasksDueToday, myOverdueTasks, upcomingCourtDates, upcomingFilingDeadlines, eventsToday] = await Promise.all([
    prisma.matter.count({ where: { assigned_lawyer_id: userId, status: { in: ['active', 'pending'] } } }),
    prisma.draft.count({ where: { created_by_user_id: userId, status: 'draft' } }),
    prisma.communication.count({ where: { sender_user_id: userId } }),
    prisma.matter.groupBy({
      by: ['client_id'],
      where: { assigned_lawyer_id: userId },
    }).then(groups => groups.length),
    prisma.task.count({ where: { assigned_user_id: userId, status: { in: ['open', 'in_progress'] } } }),
    prisma.task.count({
      where: {
        assigned_user_id: userId,
        due_date: {
          gte: new Date(now.setHours(0,0,0,0)),
          lte: new Date(now.setHours(23,59,59,999))
        },
        status: { not: 'completed' }
      }
    }),
    prisma.task.count({
      where: {
        assigned_user_id: userId,
        due_date: { lt: new Date(now.setHours(0,0,0,0)) },
        status: { not: 'completed' }
      }
    }),
    prisma.calendarEvent.count({
      where: {
        type: 'hearing',
        event_date: { gte: now },
        OR: [
          { created_by: userId },
          { matter: { assigned_lawyer_id: userId } }
        ]
      }
    }),
    prisma.calendarEvent.count({
      where: {
        type: 'filing_deadline',
        event_date: { gte: now },
        OR: [
          { created_by: userId },
          { matter: { assigned_lawyer_id: userId } }
        ]
      }
    }),
    prisma.task.count({
      where: {
        assigned_user_id: userId,
        status: 'open',
        priority: 'high'
      }
    })
  ]);

  const assignedMatters = await prisma.matter.findMany({
    where: { assigned_lawyer_id: userId },
    take: 5,
    orderBy: { updated_at: 'desc' },
  });

  return {
    counters: { 
      assignedMatters: matters, 
      openDrafts: drafts, 
      messagesSent: messages, 
      clientCount, 
      myOpenTasks,
      myTasksDueToday,
      myOverdueTasks,
      upcomingCourtDates,
      upcomingFilingDeadlines,
      eventsToday,
      myUpcomingHearings: upcomingCourtDates,
      myFilingDeadlines: upcomingFilingDeadlines,
      myCourtTasks: eventsToday
    },
    assignedMatters,
  };
};

const getClientStats = async (userId) => {
  const client = await prisma.client.findFirst({ where: { user_id: userId } });
  if (!client) {
    return {
      counters: { myMatters: 0, unpaidInvoices: 0, pendingSignatures: 0 },
    };
  }

  const [matters, invoices, drafts] = await Promise.all([
    prisma.matter.count({
      where: {
        OR: [
          { client_id: client.id },
          { parties: { some: { id: client.id } } }
        ],
        status: { in: ['active', 'pending'] }
      }
    }),
    prisma.invoice.count({
      where: {
        matter: {
          OR: [
            { client_id: client.id },
            { parties: { some: { id: client.id } } }
          ]
        },
        status: { in: ['unpaid', 'overdue', 'draft', 'due'] }
      },
    }),
    prisma.draft.count({
      where: {
        matter: {
          OR: [
            { client_id: client.id },
            { parties: { some: { id: client.id } } }
          ]
        },
        status: 'sent_for_signature'
      },
    }),
  ]);

  return {
    counters: { myMatters: matters, unpaidInvoices: invoices, pendingSignatures: drafts },
  };
};

module.exports = {
  getAdminDashboard,
  getLawyerStats,
  getClientStats,
};
