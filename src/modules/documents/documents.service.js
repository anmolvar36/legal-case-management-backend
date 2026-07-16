const prisma = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');
const fs = require('fs');
const path = require('path');

const documentScope = (user) => {
  if (!user || user.role === 'admin') return {};
  if (user.role === 'lawyer') return { matter: { assigned_lawyer_id: user.id } };
  return {
    matter: {
      OR: [
        { client: { user_id: user.id } },
        { parties: { some: { user_id: user.id } } }
      ]
    },
    visibility: { in: ['client_shared', 'client_visible'] }
  };
};

const ensureDocumentAccess = async (doc, user) => {
  if (!doc) return false;
  if (!user || user.role === 'admin') return true;
  if (user.role === 'lawyer') {
    const ok = await prisma.matter.count({ where: { id: doc.matter_id, assigned_lawyer_id: user.id } });
    return ok > 0;
  }
  if (user.role === 'client') {
    const ok = await prisma.matter.count({
      where: {
        id: doc.matter_id,
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      },
    });
    return ok > 0 && (doc.visibility === 'client_shared' || doc.visibility === 'client_visible');
  }
  return false;
};

const getAll = async (query, user) => {
  const { matter_id, visibility, page = 1, limit = 10 } = query;
  const take = parseInt(limit);
  const skip = (parseInt(page) - 1) * take;

  const where = { ...documentScope(user) };
  if (matter_id) where.matter_id = parseInt(matter_id);
  if (query.client_id) {
    where.matter = { ...where.matter, client_id: parseInt(query.client_id) };
  }
  if (visibility) where.visibility = visibility;

  return await prisma.document.findMany({
    where,
    skip,
    take,
    include: {
      uploader: { select: { id: true, full_name: true } },
      matter: { select: { id: true, matter_number: true, title: true } },
    },
    orderBy: { created_at: 'desc' },
  });
};

const getById = async (id, user) => {
  const doc = await prisma.document.findUnique({
    where: { id: parseInt(id) },
    include: {
      matter: { select: { id: true, title: true, matter_number: true } },
      uploader: { select: { id: true, full_name: true } },
    },
  });
  if (!doc) return null;
  if (!(await ensureDocumentAccess(doc, user))) {
    const err = new Error('Not authorized to access this document');
    err.statusCode = 403;
    throw err;
  }
  return doc;
};

const create = async (data, user) => {
  const payload = { ...data };
  if (payload.matter_id !== undefined) payload.matter_id = parseInt(payload.matter_id, 10);
  if (payload.uploaded_by_user_id !== undefined) payload.uploaded_by_user_id = parseInt(payload.uploaded_by_user_id, 10);
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: payload.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to upload document to this matter');
      err.statusCode = 403;
      throw err;
    }
    payload.uploaded_by_user_id = user.id;
    // Lawyer uploads are client-shareable by default so clients can see case files.
    if (!payload.visibility || payload.visibility === 'internal') {
      payload.visibility = 'client_shared';
    }
  }
  if (user?.role === 'client') {
    const allowed = await prisma.matter.count({
      where: {
        id: payload.matter_id,
        OR: [
          { client: { user_id: user.id } },
          { parties: { some: { user_id: user.id } } }
        ]
      },
    });
    if (!allowed) {
      const err = new Error('Not authorized to upload document to this matter');
      err.statusCode = 403;
      throw err;
    }
    payload.uploaded_by_user_id = user.id;
    if (!payload.visibility || payload.visibility === 'internal') payload.visibility = 'client_visible';
  }

  if (payload.file_base64) {
    const raw = String(payload.file_base64).includes(',')
      ? String(payload.file_base64).split(',')[1]
      : String(payload.file_base64);
    const buffer = Buffer.from(raw, 'base64');
    const docsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const safeName = (payload.file_name || `doc_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const diskName = `${Date.now()}_${safeName}`;
    const absPath = path.join(docsDir, diskName);
    fs.writeFileSync(absPath, buffer);
    payload.file_path = absPath;
    payload.file_size = buffer.length;
    payload.file_name = diskName;
    payload.mime_type = payload.mime_type || 'application/octet-stream';
  }
  delete payload.file_base64;

  // Final validation before Prisma create
  const required = ['file_name', 'original_name', 'mime_type', 'file_path', 'file_size', 'matter_id', 'uploaded_by_user_id'];
  const missing = required.filter(f => !payload[f]);
  if (missing.length > 0) {
    const err = new Error(`Missing required fields for document creation: ${missing.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  
  if (payload.folder_path === '') payload.folder_path = null;

  const document = await prisma.document.create({ data: payload });

  await prisma.activity.create({
    data: {
      matter_id: document.matter_id,
      entity_type: 'document',
      entity_id: document.id,
      action: 'uploaded',
      description: `Document uploaded: ${document.file_name}`,
      actor_user_id: document.uploaded_by_user_id,
    },
  });

  // Create real-time notification
  const matterDetail = await prisma.matter.findUnique({
    where: { id: document.matter_id }
  });

  if (user?.role === 'client') {
    const targetUserId = matterDetail.assigned_lawyer_id;
    if (targetUserId) {
      await notificationsService.createNotification({
        user_id: targetUserId,
        title: 'New Document Uploaded',
        message: `A new document "${document.original_name}" has been added to matter ${matterDetail.matter_number}.`,
        type: 'document',
        reference_id: document.matter_id
      });
    }
  } else {
    // Notify all clients linked to the matter
    const clientsToNotify = await prisma.client.findMany({
      where: {
        OR: [
          { id: matterDetail.client_id },
          { matter_parties: { some: { id: document.matter_id } } }
        ],
        user_id: { not: null }
      },
      select: { user_id: true }
    });

    for (const c of clientsToNotify) {
      if (c.user_id && c.user_id !== user.id) {
        await notificationsService.createNotification({
          user_id: c.user_id,
          title: 'New Document Uploaded',
          message: `A new document "${document.original_name}" has been added to matter ${matterDetail.matter_number}.`,
          type: 'document',
          reference_id: document.matter_id
        });
      }
    }
  }

  return document;
};

const createBulk = async (files, metadataList, user) => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const meta = metadataList[i] || metadataList[0] || {};
    const originalName = file.originalname;

    try {
      const payload = {
        matter_id: meta.matter_id,
        category: meta.category || 'General',
        folder_path: meta.folder_path || null,
        visibility: meta.visibility || 'internal',
        file_name: file.filename,
        original_name: originalName,
        mime_type: file.mimetype || 'application/octet-stream',
        file_path: file.path,
        file_size: file.size,
        uploaded_by_user_id: meta.uploaded_by_user_id || (user?.id ? user.id : undefined),
      };

      const doc = await create(payload, user);
      results.push({ original_name: originalName, status: 'success', document: doc });
    } catch (err) {
      // If failed, clean up the physical file
      console.error('Bulk upload failed for file:', originalName, err);
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch(e){}
      }
      results.push({ original_name: originalName, status: 'failed', error: err.message });
    }
  }

  return results;
};

const update = async (id, data, user) => {
  if (user?.role === 'client') {
    const err = new Error('Client cannot update document records');
    err.statusCode = 403;
    throw err;
  }
  const existing = await prisma.document.findUnique({ where: { id: parseInt(id, 10) } });
  if (!existing) {
    const err = new Error('Document not found');
    err.statusCode = 404;
    throw err;
  }
  if (user?.role === 'lawyer') {
    const allowed = await prisma.matter.count({
      where: { id: existing.matter_id, assigned_lawyer_id: user.id },
    });
    if (!allowed) {
      const err = new Error('Not authorized to update this document');
      err.statusCode = 403;
      throw err;
    }
  }
  return await prisma.document.update({
    where: { id: parseInt(id) },
    data,
  });
};

const remove = async (id, user) => {
  if (user?.role !== 'admin') {
    const err = new Error('Only admin can delete documents');
    err.statusCode = 403;
    throw err;
  }
  return await prisma.document.delete({ where: { id: parseInt(id) } });
};

const getDownloadPayload = async (id, user) => {
  const doc = await prisma.document.findUnique({
    where: { id: parseInt(id, 10) },
  });
  if (!doc) return null;
  if (!(await ensureDocumentAccess(doc, user))) {
    const err = new Error('Not authorized to access this document');
    err.statusCode = 403;
    throw err;
  }
  return doc;
};

module.exports = {
  getAll,
  getById,
  getDownloadPayload,
  create,
  createBulk,
  update,
  remove,
};