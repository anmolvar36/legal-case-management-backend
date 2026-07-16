const prisma = require('../../config/db');
const PDFDocument = require('pdfkit');
const settingsService = require('../settings/settings.service');

/** 
 * Build a professional PDF using pdfkit.
 */
async function buildInvoicePdfBuffer(invoice) {
  return new Promise(async (resolve, reject) => {
    try {
      const company = await prisma.companyProfile.findFirst() || {};

      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- Colors & Styles ---
      const primaryColor = '#0B1F3A'; // Indigo
      const accentColor = '#C9A24A';  // Gold
      const lightGray = '#F8FAFC';
      const borderGray = '#E2E8F0';
      const textGray = '#64748B';

      // --- Header / Branding ---
      doc.rect(0, 0, 612, 120).fill(lightGray);

      const fs = require('fs');
      const path = require('path');
      
      let logoDrawn = false;
      let letterheadDrawnAsBackground = false;

      if (company.letterhead_url) {
        try {
          const letterheadPath = path.join(process.cwd(), company.letterhead_url);
          if (fs.existsSync(letterheadPath)) {
            const img = doc.openImage(letterheadPath);
            const aspectRatio = img.width / img.height;
            
            if (aspectRatio > 1.8) {
              // Banner
              doc.image(img, 0, 0, { width: doc.page.width });
              letterheadDrawnAsBackground = true;
            } else if (aspectRatio >= 0.65 && aspectRatio <= 0.85) {
              // A4 background
              doc.image(img, 0, 0, { width: doc.page.width, height: doc.page.height });
              letterheadDrawnAsBackground = true;
              
              // Draw a semi-transparent white overlay to ensure text is readable
              doc.save();
              doc.fillColor('white').opacity(0.85);
              doc.rect(40, 30, doc.page.width - 80, doc.page.height - 60).fill();
              doc.restore();
            } else {
              // Render as logo
              doc.image(img, 50, 20, { width: 80 });
              logoDrawn = true;
            }
          }
        } catch (e) { console.warn('Could not load letterhead', e); }
      } 
      
      if (company.logo_url && !logoDrawn) {
        try {
          const logoPath = path.join(process.cwd(), company.logo_url);
          if (fs.existsSync(logoPath)) {
            const img = doc.openImage(logoPath);
            doc.image(img, 50, 20, { width: 80 });
            logoDrawn = true;
          }
        } catch (e) { console.warn('Could not load logo', e); }
      }

      if (company.company_name) {
        if (!logoDrawn && !letterheadDrawnAsBackground) {
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(20).text(company.company_name, 50, 40, { width: 300 });
        } else {
          // Push text down a bit if it's rendered alongside a logo
          doc.fillColor(primaryColor).font('Helvetica-Bold').fontSize(16).text(company.company_name, 150, 25, { width: 300 });
        }
        doc.fillColor(accentColor).font('Helvetica').fontSize(9);
        if (company.address) doc.text(company.address, logoDrawn ? 150 : 50, logoDrawn ? 45 : 65, { width: 300 });
        if (company.phone) doc.text(company.phone, logoDrawn ? 150 : 50, doc.y + 2, { width: 300 });
        if (company.email) doc.text(company.email, logoDrawn ? 150 : 50, doc.y + 2, { width: 300 });
      } else {
        doc.fillColor(primaryColor)
           .font('Helvetica-Bold')
           .fontSize(20)
           .text('VICTORIA TULSIDAS LAW', 50, 40, { width: 300 });
        
        doc.fillColor(accentColor)
           .font('Helvetica')
           .fontSize(9)
           .text('A PROFESSIONAL LEGAL CORPORATION', 50, 65, { characterSpacing: 1.5, width: 300 });
      }

      doc.fillColor(primaryColor)
         .fontSize(20)
         .font('Helvetica-Bold')
         .text('INVOICE', 350, 45, { align: 'right', width: 212 });

      doc.moveDown(5);

      // --- Separator between header and billing info ---
      doc.save().lineWidth(1).strokeColor(borderGray).moveTo(50, 125).lineTo(562, 125).stroke().restore();

      // --- Invoice Info Grid ---
      const metaY = 140;
      
      // Billed To
      doc.fillColor(textGray).fontSize(8).font('Helvetica-Bold').text('BILLED TO', 50, metaY);
      doc.fillColor('#000000').fontSize(12).font('Helvetica-Bold').text(invoice.matter?.client?.full_name || 'Valued Client', 50, metaY + 15);
      doc.fillColor(textGray).fontSize(10).font('Helvetica').text('Secure Portal Verified', 50, metaY + 32);

      // Details
      const rightAlignX = 350;
      doc.fillColor(textGray).fontSize(8).font('Helvetica-Bold').text('INVOICE DETAILS', rightAlignX, metaY);
      
      const drawMetaRow = (label, value, y, color = '#000000') => {
        doc.fillColor(textGray).fontSize(9).font('Helvetica').text(label, rightAlignX, y);
        doc.fillColor(color).font('Helvetica-Bold').fontSize(9).text(value, rightAlignX + 80, y, { align: 'right', width: 130 });
      };

      drawMetaRow('Invoice #:', invoice.invoice_number, metaY + 15);
      drawMetaRow('Date Issued:', new Date(invoice.issued_at || invoice.created_at).toLocaleDateString(), metaY + 30);
      drawMetaRow('Due Date:', invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon Receipt', metaY + 45);
      drawMetaRow('Billing Attorney:', invoice.created_by?.full_name || 'Firm Administrator', metaY + 60);
      drawMetaRow('Status:', invoice.status.toUpperCase(), metaY + 75, invoice.status === 'paid' ? '#10B981' : '#F59E0B');

      doc.moveDown(6);

      // --- Separator before matter ---
      const sepBefore = doc.y + 5;
      doc.save().lineWidth(0.75).strokeColor(borderGray).moveTo(50, sepBefore).lineTo(562, sepBefore).stroke().restore();

      // --- Matter Context ---
      const matterY = sepBefore + 10;
      doc.roundedRect(50, matterY, 512, 35, 4).fill(lightGray);
      doc.save().lineWidth(0.75).strokeColor(borderGray).roundedRect(50, matterY, 512, 35, 4).stroke().restore();
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text(`Matter: ${invoice.matter?.matter_number || ''} \u2014 ${invoice.matter?.title || 'General Legal Services'}`, 65, matterY + 12);

      doc.moveDown(4);

      // --- Separator line before table ---
      const sepBeforeTable = doc.y + 5;
      doc.save().lineWidth(0.75).strokeColor(borderGray).moveTo(50, sepBeforeTable).lineTo(562, sepBeforeTable).stroke().restore();
      doc.y = sepBeforeTable + 10;

      // --- Table Header ---
      const tableTop = doc.y;
      doc.rect(50, tableTop, 512, 28).fill(primaryColor);
      // Left & right vertical borders on header
      doc.save().lineWidth(0.5).strokeColor(primaryColor);
      doc.moveTo(50, tableTop).lineTo(50, tableTop + 28).stroke();
      doc.moveTo(562, tableTop).lineTo(562, tableTop + 28).stroke();
      doc.restore();
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text('DESCRIPTION OF SERVICES', 65, tableTop + 9);
      doc.text('AMOUNT', 460, tableTop + 9, { width: 90, align: 'right' });

      // --- Table Rows ---
      let rowY = tableTop + 28;
      const items = (invoice.items && invoice.items.length > 0)
        ? invoice.items
        : [{ description: invoice.description || 'Legal Advisory Services', amount: invoice.amount }];

      const rowHeight = 30;
      items.forEach((item, i) => {
        // Alternate row background
        if (i % 2 === 0) {
          doc.rect(50, rowY, 512, rowHeight).fill('#FFFFFF');
        } else {
          doc.rect(50, rowY, 512, rowHeight).fill(lightGray);
        }

        // Row borders: top line
        doc.save().lineWidth(0.5).strokeColor(borderGray);
        doc.moveTo(50, rowY).lineTo(562, rowY).stroke();
        // Left border
        doc.moveTo(50, rowY).lineTo(50, rowY + rowHeight).stroke();
        // Right border
        doc.moveTo(562, rowY).lineTo(562, rowY + rowHeight).stroke();
        doc.restore();

        doc.fillColor('#1E293B').font('Helvetica').fontSize(9).text(item.description, 65, rowY + 10, { width: 380 });
        const amt = Number(item.amount || 0);
        doc.fillColor('#000000').font('Helvetica-Bold').fontSize(9).text('$' + amt.toFixed(2), 460, rowY + 10, { width: 90, align: 'right' });

        rowY += rowHeight;

        // Page break check
        if (rowY > 700) {
          doc.addPage();
          rowY = 50;
        }
      });

      // Bottom border of last row
      doc.save().lineWidth(0.75).strokeColor(borderGray).moveTo(50, rowY).lineTo(562, rowY).stroke().restore();

      // --- Summary Section ---
      const summaryY = rowY + 25;
      const summaryX = 350;

      const drawSummaryRow = (label, value, y, isTotal = false) => {
        doc.fillColor(isTotal ? primaryColor : textGray).fontSize(isTotal ? 12 : 10).font(isTotal ? 'Helvetica-Bold' : 'Helvetica').text(label, summaryX, y);
        doc.fillColor(isTotal ? primaryColor : '#000000').fontSize(isTotal ? 14 : 10).font('Helvetica-Bold').text(value, summaryX + 80, y - (isTotal ? 2 : 0), { align: 'right', width: 130 });
      };

      let currentSumY = summaryY;
      const subtotal = Number(invoice.amount || 0);
      drawSummaryRow('Subtotal:', '$' + subtotal.toFixed(2), currentSumY);

      // Separator after subtotal
      currentSumY += 18;
      doc.save().lineWidth(0.3).strokeColor(borderGray).moveTo(summaryX, currentSumY).lineTo(562, currentSumY).stroke().restore();
      currentSumY += 8;

      drawSummaryRow('Tax (0.0%):', '$0.00', currentSumY);

      const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
      if (paidAmount > 0) {
        currentSumY += 18;
        doc.save().lineWidth(0.3).strokeColor(borderGray).moveTo(summaryX, currentSumY).lineTo(562, currentSumY).stroke().restore();
        currentSumY += 8;
        drawSummaryRow('Amount Paid:', '-$' + paidAmount.toFixed(2), currentSumY);
      }

      // Heavy separator before TOTAL DUE
      currentSumY += 22;
      doc.save().lineWidth(1.5).strokeColor(primaryColor).moveTo(summaryX, currentSumY).lineTo(562, currentSumY).stroke().restore();
      currentSumY += 10;

      const dueAmount = Math.max(0, subtotal - paidAmount);
      drawSummaryRow('TOTAL DUE', '$' + dueAmount.toFixed(2), currentSumY, true);

      // Double line under TOTAL DUE
      currentSumY += 22;
      doc.save().lineWidth(1.0).strokeColor(primaryColor).moveTo(summaryX, currentSumY).lineTo(562, currentSumY).stroke().restore();
      doc.save().lineWidth(0.5).strokeColor(primaryColor).moveTo(summaryX, currentSumY + 3).lineTo(562, currentSumY + 3).stroke().restore();

      // --- Footer ---
      const footerTop = Math.max(currentSumY + 40, 730);
      doc.save().lineWidth(0.75).strokeColor(borderGray).moveTo(50, footerTop).lineTo(562, footerTop).stroke().restore();
      doc.fillColor(textGray).fontSize(8).font('Helvetica').text('Legal Services rendered by ' + (company.company_name || 'Victoria Tulsidas Law') + '. All amounts are in USD.', 50, footerTop + 12, { align: 'center', width: 512 });
      doc.text('This is a computer generated document. Securely managed via VkTori Portal.', 50, doc.y + 2, { align: 'center', width: 512 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

const ensureInvoiceAccess = async (invoice, user) => {
  if (!invoice || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'lawyer') {
    const ok = await prisma.matter.count({ where: { id: invoice.matter_id, assigned_lawyer_id: user.id } });
    return ok > 0;
  }
  if (user.role === 'client') {
    const ok = await prisma.matter.count({
      where: {
        id: invoice.matter_id,
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      }
    });
    return ok > 0;
  }
  return false;
};

const money = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v.toNumber === 'function') return v.toNumber();
  return Number(v) || 0;
};

const calculateInvoiceFields = (invoice) => {
  if (!invoice) return invoice;
  const paid_amount = (invoice.payments || []).reduce((sum, p) => sum + money(p.amount), 0);
  const total_amount = money(invoice.amount);
  const due_amount = Math.max(0, total_amount - paid_amount);
  
  let status = invoice.status;
  if (status !== 'void' && status !== 'draft') {
    if (due_amount <= 0) status = 'paid';
    else if (paid_amount <= 0) status = 'unpaid';
    else status = 'due';
  }

  return {
    ...invoice,
    paid_amount,
    due_amount,
    status
  };
};

const getAll = async (query, user) => {
  const { matter_id, status, page = 1, limit = 10 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (matter_id) where.matter_id = parseInt(matter_id);
  if (query.client_id) {
    where.matter = { ...where.matter, client_id: parseInt(query.client_id) };
  }
  if (status) where.status = status;
  if (user?.role === 'lawyer') where.matter = { assigned_lawyer_id: user.id };
  if (user?.role === 'client') {
    where.matter = {
      OR: [
        { client: { user_id: user.id } },
        { parties: { some: { user_id: user.id } } }
      ]
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    skip,
    take,
    include: {
      matter: {
        select: {
          id: true,
          title: true,
          matter_number: true,
          client: { select: { id: true, full_name: true } },
        },
      },
      items: true,
      payments: true,
    },
    orderBy: { created_at: 'desc' },
  });

  return invoices.map(calculateInvoiceFields);
};

const getById = async (id, user) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: parseInt(id) },
    include: {
      matter: {
        include: { client: true }
      },
      items: true,
      payments: true,
      created_by: { select: { id: true, full_name: true } }
    }
  });
  if (!invoice) return null;
  if (!(await ensureInvoiceAccess(invoice, user))) {
    const err = new Error('Not authorized to access this invoice');
    err.statusCode = 403;
    throw err;
  }
  return calculateInvoiceFields(invoice);
};

const getInvoicePdf = async (id, user) => {
  const invoiceId = parseInt(id, 10);
  if (Number.isNaN(invoiceId)) {
    const err = new Error('Invalid invoice id');
    err.statusCode = 400;
    throw err;
  }
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      payments: true,
      created_by: { select: { full_name: true } },
      matter: {
        select: {
          matter_number: true,
          title: true,
          client: { select: { full_name: true } },
        },
      },
    },
  });
  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }
  if (!(await ensureInvoiceAccess(invoice, user))) {
    const err = new Error('Not authorized to access this invoice');
    err.statusCode = 403;
    throw err;
  }
  const computed = calculateInvoiceFields(invoice);
  // Match frontend status mapping: 'draft' displays as 'pending'
  if (computed.status === 'draft') computed.status = 'pending';
  const buffer = await buildInvoicePdfBuffer(computed);
  const safeName = String(invoice.invoice_number || invoice.id).replace(/[^a-zA-Z0-9._-]/g, '_');
  const filename = `invoice-${safeName}.pdf`;
  return { buffer, filename };
};

const create = async (data, user) => {
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: data.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to create invoice for this matter');
      err.statusCode = 403;
      throw err;
    }
    data.created_by_user_id = user.id;
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot create invoices');
    err.statusCode = 403;
    throw err;
  }

  // Auto-calculate due date (Current Date + 5 days) if not provided
  if (!data.due_date) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    data.due_date = dueDate;
  }

  const invoice = await prisma.invoice.create({ data });
  
  // Log activity
  await prisma.activity.create({
    data: {
      matter_id: invoice.matter_id,
      entity_type: 'invoice',
      entity_id: invoice.id,
      action: 'created',
      description: `Invoice ${invoice.invoice_number} created for $${invoice.amount}`,
      actor_user_id: invoice.created_by_user_id
    }
  });

  return invoice;
};

const update = async (id, data, user) => {
  const existing = await prisma.invoice.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: existing.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to update this invoice');
      err.statusCode = 403;
      throw err;
    }
    if (data.status === 'paid') {
      const err = new Error('Lawyer cannot mark invoice as paid');
      err.statusCode = 403;
      throw err;
    }
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot update invoices');
    err.statusCode = 403;
    throw err;
  }
  const invoice = await prisma.invoice.update({
    where: { id: parseInt(id) },
    data,
  });

  if (data.status === 'paid') {
     await prisma.activity.create({
      data: {
        matter_id: invoice.matter_id,
        entity_type: 'invoice',
        entity_id: invoice.id,
        action: 'paid',
        description: `Invoice ${invoice.invoice_number} marked as paid`,
      }
    });
  }

  return invoice;
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete invoices');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.invoice.delete({ where: { id: parseInt(id) } });
};

const pay = async (id, payload, user) => {
  const invoiceId = parseInt(id, 10);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { matter: { include: { client: true } } },
  });

  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (!(await ensureInvoiceAccess(invoice, user))) {
    const err = new Error('Not authorized to pay this invoice');
    err.statusCode = 403;
    throw err;
  }

  if (user?.role === 'lawyer') {
    const err = new Error('Lawyer cannot record invoice payments');
    err.statusCode = 403;
    throw err;
  }

  if (invoice.status === 'paid') {
    const err = new Error('Invoice is already paid');
    err.statusCode = 400;
    throw err;
  }
  if (invoice.status === 'void') {
    const err = new Error('Void invoice cannot be paid');
    err.statusCode = 400;
    throw err;
  }

  const paidAt = new Date();
  const paymentReference = payload?.payment_reference || 'internal-manual';
  const paymentMethod = payload?.payment_method || 'manual';

  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoice_id: invoice.id,
        matter_id: invoice.matter_id,
        amount: invoice.amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        paid_on: paidAt,
        created_by_user_id: user?.id || null,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'paid',
        paid_at: paidAt,
      },
      include: {
        matter: {
          select: {
            id: true,
            title: true,
            matter_number: true,
            client: { select: { id: true, full_name: true } },
          },
        },
        payments: true,
      },
    });

    await tx.activity.create({
      data: {
        matter_id: invoice.matter_id,
        actor_user_id: user?.id || null,
        entity_type: 'invoice',
        entity_id: invoice.id,
        action: 'paid',
        description: `Invoice ${invoice.invoice_number} marked paid via manual workflow`,
      },
    });

    return { invoice: updatedInvoice, payment };
  });
};

const createFromTimeEntry = async (timeEntry) => {
  const matterId = timeEntry.matter_id;
  
  // Fetch billing rate from Firm Settings
  const settings = await settingsService.getAll();
  const billingRateStr = settings.billing_rate;
  if (!billingRateStr) {
    console.warn('Billing: Default billing rate not found in settings, falling back to 100');
  }
  const hourlyRate = parseFloat(billingRateStr) || 100;

  const durationMinutes = timeEntry.duration_minutes || 0;
  // amount = (minutes / 60) * hourlyRate. Since durationMinutes is now rounded to multiples of 6 (0.1 hrs), 
  // this will always result in clean 0.1 hr increments.
  const amount = (durationMinutes / 60) * hourlyRate;

  // Find or create a draft invoice for this matter
  let invoice = await prisma.invoice.findFirst({
    where: {
      matter_id: matterId,
      status: 'draft',
    },
    include: { items: true },
  });

  if (!invoice) {
    const invoiceCount = await prisma.invoice.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(4, '0')}`;
    
    // Get matter creator or assigned lawyer for created_by
    const matter = await prisma.matter.findUnique({
      where: { id: matterId },
      select: { created_by_user_id: true, assigned_lawyer_id: true }
    });

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);

    invoice = await prisma.invoice.create({
      data: {
        matter_id: matterId,
        invoice_number: invoiceNumber,
        amount: 0,
        due_date: dueDate,
        status: 'draft',
        created_by_user_id: matter.assigned_lawyer_id || matter.created_by_user_id,
        description: `Consolidated billing for matter ${matterId}`,
      },
      include: { items: true },
    });
  }

  // Add the invoice item
  await prisma.invoiceItem.create({
    data: {
      invoice_id: invoice.id,
      description: `Legal Services: ${(durationMinutes / 60).toFixed(1)} hrs`,
      amount: amount,
    },
  });

  // Update total amount
  const allItems = await prisma.invoiceItem.findMany({
    where: { invoice_id: invoice.id },
  });
  const newTotal = allItems.reduce((sum, item) => sum + Number(item.amount), 0);

  return await prisma.invoice.update({
    where: { id: invoice.id },
    data: { amount: newTotal },
    include: { items: true },
  });
};

async function getTrustAccounts(user) {
  const where = {};
  if (user?.role === 'lawyer') {
    where.client = { matters: { some: { assigned_lawyer_id: user.id } } };
  }
  if (user?.role === 'client') {
    where.client = { user_id: user.id };
  }

  return await prisma.trustAccount.findMany({
    where,
    include: {
      client: {
        select: { id: true, full_name: true }
      },
      transactions: {
        take: 1,
        orderBy: { created_at: 'desc' }
      }
    }
  });
}

async function getTrustTransactions(accountId, user) {
  const account = await prisma.trustAccount.findUnique({
    where: { id: parseInt(accountId) },
    include: { client: true }
  });
  if (!account) throw new Error('Trust account not found');

  // RBAC
  if (user.role === 'lawyer') {
    const hasMatter = await prisma.matter.count({
      where: { client_id: account.client_id, assigned_lawyer_id: user.id }
    });
    if (!hasMatter) throw new Error('Not authorized to view this trust ledger');
  }
  if (user.role === 'client' && account.client.user_id !== user.id) {
    throw new Error('Not authorized to view this trust ledger');
  }

  return await prisma.trustTransaction.findMany({
    where: { trust_account_id: parseInt(accountId) },
    include: {
      matter: { select: { id: true, matter_number: true, title: true } },
      created_by: { select: { id: true, full_name: true } }
    },
    orderBy: { created_at: 'desc' }
  });
}

async function depositTrust(payload, user) {
  if (user.role === 'client') throw new Error('Clients cannot record deposits');
  
  const { client_id, matter_id, amount, reference, notes } = payload;
  const clientId = parseInt(client_id);
  const amt = parseFloat(amount);
  const userId = user.id;

  if (Number.isNaN(clientId) || Number.isNaN(amt) || amt <= 0) {
    throw new Error('Invalid client or deposit amount');
  }

  return await prisma.$transaction(async (tx) => {
    let account = await tx.trustAccount.findUnique({ where: { client_id: clientId } });
    if (!account) {
      account = await tx.trustAccount.create({
        data: { client_id: clientId, balance: 0 }
      });
    }

    const transaction = await tx.trustTransaction.create({
      data: {
        trust_account_id: account.id,
        client_id: clientId,
        matter_id: matter_id ? parseInt(matter_id) : null,
        transaction_type: 'deposit',
        amount: amt,
        reference: reference || 'Trust Deposit',
        notes,
        created_by_user_id: userId
      }
    });

    const updatedAccount = await tx.trustAccount.update({
      where: { id: account.id },
      data: { balance: { increment: amt } }
    });

    return { account: updatedAccount, transaction };
  });
}

async function applyTrustToInvoice(payload, user) {
  if (user.role === 'client') throw new Error('Clients cannot apply trust funds');

  const { trust_account_id, invoice_id, amount } = payload;
  const accountId = parseInt(trust_account_id);
  const invoiceId = parseInt(invoice_id);
  const amt = parseFloat(amount);

  if (Number.isNaN(accountId) || Number.isNaN(invoiceId) || Number.isNaN(amt) || amt <= 0) {
    throw new Error('Invalid input for trust application');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Fetch data
    const account = await tx.trustAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Trust account not found');
    if (Number(account.balance) < amt) throw new Error('Insufficient trust balance');

    const invoice = await tx.invoice.findUnique({ 
      where: { id: invoiceId },
      include: { payments: true }
    });
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.status === 'paid' || invoice.status === 'void') {
      throw new Error('Invoice is already paid or void');
    }

    // 2. Create Trust Transaction
    const trustTx = await tx.trustTransaction.create({
      data: {
        trust_account_id: accountId,
        client_id: account.client_id,
        matter_id: invoice.matter_id,
        transaction_type: 'applied_to_invoice',
        amount: amt,
        reference: `Applied to Invoice ${invoice.invoice_number}`,
        created_by_user_id: user.id
      }
    });

    // 3. Update Trust Balance
    const updatedAccount = await tx.trustAccount.update({
      where: { id: accountId },
      data: { balance: { decrement: amt } }
    });

    // 4. Record Invoice Payment
    const payment = await tx.payment.create({
      data: {
        invoice_id: invoiceId,
        matter_id: invoice.matter_id,
        amount: amt,
        payment_method: 'trust_account',
        payment_reference: `Trust Tx ID: ${trustTx.id}`,
        paid_on: new Date(),
        created_by_user_id: user.id
      }
    });

    // 5. Recalculate Invoice Status
    const allPayments = await tx.payment.findMany({ where: { invoice_id: invoiceId } });
    const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    let newStatus = 'due';
    let paidAt = null;

    if (totalPaid >= Number(invoice.amount)) {
      newStatus = 'paid';
      paidAt = new Date();
    }

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: newStatus,
        paid_at: paidAt || invoice.paid_at
      },
      include: {
        matter: {
          select: { id: true, title: true, matter_number: true }
        },
        items: true,
        payments: true
      }
    });

    // 6. Log Activity
    await tx.activity.create({
      data: {
        matter_id: invoice.matter_id,
        actor_user_id: user.id,
        entity_type: 'invoice',
        entity_id: invoice.id,
        action: 'payment_received',
        description: `Trust application of ${amt} to invoice ${invoice.invoice_number}. New status: ${newStatus}`
      }
    });

    return { trustTx, payment, invoice: calculateInvoiceFields(updatedInvoice), account: updatedAccount };
  });
}

const sendInvoice = async (id, user) => {
  const invoiceId = parseInt(id, 10);
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: true,
      payments: true,
      created_by: { select: { full_name: true } },
      matter: {
        select: {
          matter_number: true,
          title: true,
          client: { select: { id: true, full_name: true, email: true } },
        },
      },
    },
  });

  if (!invoice) {
    const err = new Error('Invoice not found');
    err.statusCode = 404;
    throw err;
  }

  if (!(await ensureInvoiceAccess(invoice, user))) {
    const err = new Error('Not authorized to access this invoice');
    err.statusCode = 403;
    throw err;
  }

  try {
    // Generate PDF
    const buffer = await buildInvoicePdfBuffer(invoice);
    const safeName = String(invoice.invoice_number || invoice.id).replace(/[^a-zA-Z0-9._-]/g, '_');
    const filename = `invoice-${safeName}.pdf`;

    // Store in Document module if not already stored or create a new one
    let documentId = invoice.pdf_document_id;
    if (!documentId) {
      const fs = require('fs');
      const path = require('path');
      const uploadDir = path.join(process.cwd(), 'uploads', 'invoices');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const filepath = path.join(uploadDir, `${Date.now()}-${filename}`);
      fs.writeFileSync(filepath, buffer);

      const doc = await prisma.document.create({
        data: {
          title: `Invoice ${invoice.invoice_number}`,
          file_url: `uploads/invoices/${path.basename(filepath)}`,
          file_type: 'application/pdf',
          file_size: buffer.length,
          matter_id: invoice.matter_id,
          uploaded_by_user_id: user.id || invoice.created_by_user_id,
        }
      });
      documentId = doc.id;
    }

    // Simulate sending email (No email provider configured)
    const emailStatus = 'sent';
    const emailError = null;

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        sent_at: new Date(),
        pdf_document_id: documentId,
        email_status: emailStatus,
        email_error: emailError,
      }
    });

    // Log Activity
    await prisma.activity.create({
      data: {
        matter_id: invoice.matter_id,
        entity_type: 'invoice',
        entity_id: invoice.id,
        action: 'emailed',
        description: `Invoice ${invoice.invoice_number} emailed to ${invoice.matter?.client?.email || 'Client'}`,
        actor_user_id: user.id || invoice.created_by_user_id
      }
    });

    return {
      success: true,
      message: 'Invoice emailed successfully (Simulated - no email provider configured)',
      invoice: updatedInvoice
    };
  } catch (error) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        email_status: 'failed',
        email_error: error.message
      }
    });
    throw error;
  }
};

module.exports = {
  getAll,
  getById,
  getInvoicePdf,
  create,
  update,
  remove,
  pay,
  createFromTimeEntry,
  getTrustAccounts,
  getTrustTransactions,
  depositTrust,
  applyTrustToInvoice,
  calculateInvoiceFields,
  sendInvoice,
};