const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TitanEmailProvider {
  async syncAccount(userId, accountId) {
    return { success: true, message: 'Sync complete' };
  }

  async getMessages(userId, accountId, filters) {
    const where = {
      sender_user_id: userId,
      communication_type: 'titan_email',
      is_deleted: false,
    };

    if (accountId) where.email_account_id = accountId;
    if (filters.folder) where.folder = filters.folder;
    if (filters.is_starred !== undefined) where.is_starred = filters.is_starred === 'true';
    if (filters.is_flagged !== undefined) where.is_flagged = filters.is_flagged === 'true';
    if (filters.is_draft !== undefined) where.is_draft = filters.is_draft === 'true';
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search } },
        { message_body: { contains: filters.search } },
        { to: { contains: filters.search } },
        { cc: { contains: filters.search } }
      ];
    }

    const messages = await prisma.communication.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        replies: true,
      }
    });

    return messages;
  }

  async sendEmail(userId, role, accountId, payload) {
    const message = await prisma.communication.create({
      data: {
        sender_user_id: userId,
        sender_role: role,
        communication_type: 'titan_email',
        email_account_id: accountId || null,
        folder: 'sent',
        to: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
        cc: Array.isArray(payload.cc) ? payload.cc.join(',') : payload.cc,
        bcc: Array.isArray(payload.bcc) ? payload.bcc.join(',') : payload.bcc,
        subject: payload.subject,
        message_body: payload.message_body,
        is_draft: false,
        sync_status: 'synced',
        external_message_id: `msg-${Date.now()}`
      }
    });
    return message;
  }

  async saveDraft(userId, role, accountId, payload) {
    if (payload.id) {
      return await prisma.communication.update({
        where: { id: parseInt(payload.id, 10) },
        data: {
          to: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
          cc: Array.isArray(payload.cc) ? payload.cc.join(',') : payload.cc,
          bcc: Array.isArray(payload.bcc) ? payload.bcc.join(',') : payload.bcc,
          subject: payload.subject,
          message_body: payload.message_body,
          updated_at: new Date()
        }
      });
    }

    return await prisma.communication.create({
      data: {
        sender_user_id: userId,
        sender_role: role,
        communication_type: 'titan_email',
        email_account_id: accountId || null,
        folder: 'drafts',
        to: Array.isArray(payload.to) ? payload.to.join(',') : payload.to,
        cc: Array.isArray(payload.cc) ? payload.cc.join(',') : payload.cc,
        bcc: Array.isArray(payload.bcc) ? payload.bcc.join(',') : payload.bcc,
        subject: payload.subject,
        message_body: payload.message_body,
        is_draft: true,
        sync_status: 'synced'
      }
    });
  }

  async updateMessageState(userId, messageId, data) {
    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data
    });
  }

  async moveMessage(userId, messageId, folder) {
    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data: { folder }
    });
  }

  async deleteMessage(userId, messageId) {
    const msg = await prisma.communication.findUnique({ where: { id: parseInt(messageId, 10) } });
    if (!msg) throw new Error("Message not found");

    if (msg.folder === 'trash') {
      return await prisma.communication.update({
        where: { id: parseInt(messageId, 10) },
        data: { is_deleted: true }
      });
    }

    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data: { folder: 'trash' }
    });
  }
}

module.exports = new TitanEmailProvider();
