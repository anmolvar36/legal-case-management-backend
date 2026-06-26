const prisma = require('../../config/db');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const getAll = async (query, user) => {
  const { matter_id, status, page = 1, limit = 10 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (matter_id) where.matter_id = parseInt(matter_id);
  if (status) where.status = status;
  if (user?.role === 'lawyer') where.matter = { assigned_lawyer_id: user.id };
  if (user?.role === 'client') where.matter = { client: { user_id: user.id } };

  return await prisma.draft.findMany({
    where,
    skip,
    take,
    include: {
      matter: { select: { id: true, title: true } },
      created_by: { select: { id: true, full_name: true } }
    },
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id, user) => {
  const draft = await prisma.draft.findUnique({
    where: { id: parseInt(id) },
    include: {
      signatures: {
        select: { id: true, signed_at: true, ip_address: true, signed_by_user_id: true }
      },
      created_by: { select: { id: true, full_name: true } }
    }
  });
  if (!draft) return null;
  if (user?.role === 'lawyer') {
    const ok = await prisma.matter.count({ where: { id: draft.matter_id, assigned_lawyer_id: user.id } });
    if (!ok) {
      const err = new Error('Not authorized to access this draft');
      err.statusCode = 403;
      throw err;
    }
  }
  if (user?.role === 'client') {
    const ok = await prisma.matter.count({ where: { id: draft.matter_id, client: { user_id: user.id } } });
    if (!ok || !['sent_for_signature', 'signed'].includes(draft.status)) {
      const err = new Error('Not authorized to access this draft');
      err.statusCode = 403;
      throw err;
    }
  }
  return draft;
};

const create = async (data, user) => {
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: data.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to create draft for this matter');
      err.statusCode = 403;
      throw err;
    }
    data.created_by_user_id = user.id;
    data.last_updated_by_user_id = user.id;
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot create drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.draft.create({ data });
};

const update = async (id, data, user) => {
  const existing = await prisma.draft.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) {
    const err = new Error('Draft not found');
    err.statusCode = 404;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: existing.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to update this draft');
      err.statusCode = 403;
      throw err;
    }
    data.last_updated_by_user_id = user.id;
  }
  if (user?.role === 'client') {
    const err = new Error('Client cannot update drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.draft.update({
    where: { id: parseInt(id) },
    data,
  });
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.draft.delete({ where: { id: parseInt(id) } });
};

const signDraft = async (draftId, userId, signatureData, ipAddress, deviceInfo, user) => {
  if (user?.role !== 'client') {
    const err = new Error('Only client can sign drafts');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.$transaction(async (tx) => {
    const draftForClient = await tx.draft.findUnique({
      where: { id: parseInt(draftId, 10) },
      include: { matter: { include: { client: true } } },
    });
    if (!draftForClient || draftForClient.matter?.client?.user_id !== userId) {
      const err = new Error('Not authorized to sign this draft');
      err.statusCode = 403;
      throw err;
    }
    // 1. Create signature record
    const signature = await tx.signature.create({
      data: {
        draft_id: parseInt(draftId),
        signed_by_user_id: userId,
        signature_data: signatureData,
        ip_address: ipAddress,
        device_info: deviceInfo,
        signed_at: new Date()
      }
    });

    // 2. Update draft status
    const draft = await tx.draft.update({
      where: { id: parseInt(draftId) },
      data: {
        status: 'signed',
        signed_at: new Date()
      }
    });

    // 3. Log activity
    await tx.activity.create({
      data: {
        matter_id: draft.matter_id,
        entity_type: 'signature',
        entity_id: signature.id,
        action: 'signed',
        description: `Draft "${draft.title}" signed by client`,
        actor_user_id: userId
      }
    });

    return { signature, draft };
  });
};

const generatePdf = (draftId, user) => {
  return new Promise(async (resolve, reject) => {
    try {
      const draft = await getById(draftId, user);
      if (!draft) return reject(new Error('Draft not found'));

      const company = await prisma.companyProfile.findFirst() || {};

      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Letterhead / Logo
      let logoDrawn = false;
      let letterheadDrawnAsBackground = false;

      if (company.letterhead_url) {
        try {
          const letterheadPath = path.join(process.cwd(), company.letterhead_url);
          if (fs.existsSync(letterheadPath)) {
            const img = doc.openImage(letterheadPath);
            const aspectRatio = img.width / img.height;

            if (aspectRatio > 1.8) {
              // Banner (Wide): Put at the top
              doc.image(img, 0, 0, { width: doc.page.width });
              letterheadDrawnAsBackground = true;
              doc.y = (doc.page.width / aspectRatio) + 20; 
            } else if (aspectRatio >= 0.65 && aspectRatio <= 0.85) {
              // A4 or full page size (A4 is approx 0.77)
              doc.image(img, 0, 0, { width: doc.page.width, height: doc.page.height });
              letterheadDrawnAsBackground = true;
              doc.y = 120;
            } else {
              // Square, QR code, or normal logo uploaded as letterhead
              doc.image(img, 50, 40, { width: 80 });
              logoDrawn = true;
              doc.y = 120;
            }
          }
        } catch (e) {
          console.warn('Could not load letterhead', e);
        }
      } 
      
      if (company.logo_url && !logoDrawn) {
        try {
          const logoPath = path.join(process.cwd(), company.logo_url);
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 40, { width: 80 });
            logoDrawn = true;
            if (doc.y < 120 && !letterheadDrawnAsBackground) {
              doc.y = 120;
            }
          }
        } catch (e) {
          console.warn('Could not load logo', e);
        }
      }

      // Firm Contact Info
      if (company.company_name) {
        if (logoDrawn || letterheadDrawnAsBackground) {
          // If logo or banner is drawn, print info on the right
          doc.fontSize(10).fillColor('#666666');
          doc.text(company.company_name, { align: 'right' });
          if (company.address) doc.text(company.address, { align: 'right' });
          if (company.phone) doc.text(`Phone: ${company.phone}`, { align: 'right' });
          if (company.email) doc.text(`Email: ${company.email}`, { align: 'right' });
          if (company.website) doc.text(company.website, { align: 'right' });
          doc.moveDown(2);
        } else {
          // No imagery, print at top center
          doc.fontSize(14).fillColor('#333333').text(company.company_name, { align: 'center' });
          doc.fontSize(10).fillColor('#666666');
          if (company.address) doc.text(company.address, { align: 'center' });
          if (company.phone) doc.text(`Phone: ${company.phone} | Email: ${company.email}`, { align: 'center' });
          doc.moveDown(2);
        }
      } else {
         doc.moveDown(2);
      }

      doc.fillColor('#000000');
      doc.fontSize(20).text(draft.title, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Matter ID: ${draft.matter_id}`);
      doc.text(`Created By: ${draft.created_by?.full_name || 'System'}`);
      doc.moveDown();
      doc.fontSize(11).text(draft.content || 'No content provided.');
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const sendForSignature = async (draftId, recipient_email, user) => {
  if (!recipient_email) {
    const err = new Error('Recipient email is required');
    err.statusCode = 400;
    throw err;
  }
  const draft = await getById(draftId, user);
  if (!draft) throw new Error('Draft not found');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const request = await prisma.signatureRequest.create({
    data: {
      draft_id: parseInt(draftId, 10),
      token,
      recipient_email,
      expires_at: expiresAt,
    }
  });

  await prisma.draft.update({
    where: { id: parseInt(draftId, 10) },
    data: { status: 'sent_for_signature', sent_for_signature_at: new Date() }
  });

  await prisma.activity.create({
    data: {
      matter_id: draft.matter_id,
      entity_type: 'signature_request',
      entity_id: request.id,
      action: 'sent',
      description: `Sent draft "${draft.title}" for signature to ${recipient_email}`,
      actor_user_id: user.id
    }
  });

  console.log(`\n================================`);
  console.log(`MOCK EMAIL SENT TO: ${recipient_email}`);
  console.log(`SUBJECT: Action Required: Signature Requested for ${draft.title}`);
  console.log(`SIGNING LINK: http://localhost:5173/sign/${token}`);
  console.log(`================================\n`);

  return request;
};

const getSignatureRequest = async (token) => {
  const request = await prisma.signatureRequest.findUnique({
    where: { token },
    include: { draft: { include: { matter: true, created_by: true } } }
  });
  if (!request) {
    const err = new Error('Invalid signature token');
    err.statusCode = 404;
    throw err;
  }
  if (request.status === 'completed') {
    const err = new Error('Signature already completed');
    err.statusCode = 400;
    throw err;
  }
  if (new Date() > request.expires_at) {
    const err = new Error('Signature token expired');
    err.statusCode = 400;
    throw err;
  }
  return request;
};

const completeSignature = async (token, signature_data, ip_address, device_info) => {
  const request = await getSignatureRequest(token);

  return await prisma.$transaction(async (tx) => {
    // 1. Create Signature record
    const signature = await tx.signature.create({
      data: {
        draft_id: request.draft_id,
        signed_by_user_id: request.draft.created_by_user_id, // Defaulting to creator since guest signer has no user id
        signature_data,
        ip_address,
        device_info,
        signed_at: new Date()
      }
    });

    // 2. Mark Request completed
    await tx.signatureRequest.update({
      where: { id: request.id },
      data: { status: 'completed', completed_at: new Date() }
    });

    // 3. Generate signed PDF
    const draft = request.draft;
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    
    doc.fontSize(20).text(draft.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(draft.content || '');
    doc.moveDown(2);
    doc.fontSize(14).text('SIGNATURES', { underline: true });
    doc.moveDown();
    doc.fontSize(10).text(`Signed by: ${request.recipient_email}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.text(`IP: ${ip_address || 'Unknown'}`);
    
    if (signature_data && signature_data.startsWith('data:image/png;base64,')) {
      try {
        const imgBuffer = Buffer.from(signature_data.split(',')[1], 'base64');
        doc.moveDown();
        doc.image(imgBuffer, { fit: [200, 100] });
      } catch (e) {
        console.error('Failed to embed signature image', e);
      }
    }
    
    const docEndPromise = new Promise(resolve => doc.on('end', resolve));
    doc.end();
    await docEndPromise;
    const finalPdfBuffer = Buffer.concat(buffers);

    // 4. Save to disk
    const docsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const diskName = `${Date.now()}_signed_${draft.id}.pdf`;
    const absPath = path.join(docsDir, diskName);
    fs.writeFileSync(absPath, finalPdfBuffer);

    // 5. Create Document record
    const documentRecord = await tx.document.create({
      data: {
        matter_id: draft.matter_id,
        uploaded_by_user_id: draft.created_by_user_id,
        file_name: diskName,
        original_name: `Signed_${draft.title}.pdf`,
        mime_type: 'application/pdf',
        file_path: absPath,
        file_size: finalPdfBuffer.length,
        visibility: 'client_shared',
        category: 'Contract',
      }
    });

    // 6. Update Draft status and signed_document_id
    const updatedDraft = await tx.draft.update({
      where: { id: draft.id },
      data: { 
        status: 'signed', 
        signed_at: new Date(),
        signed_document_id: documentRecord.id
      }
    });

    // 7. Log Activity
    await tx.activity.create({
      data: {
        matter_id: draft.matter_id,
        entity_type: 'draft',
        entity_id: draft.id,
        action: 'signed',
        description: `Draft "${draft.title}" was signed via E-Sign by ${request.recipient_email}`
      }
    });

    return { signature, document: documentRecord, draft: updatedDraft };
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  signDraft,
  generatePdf,
  sendForSignature,
  getSignatureRequest,
  completeSignature,
};