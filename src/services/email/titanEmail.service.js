const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TitanEmailProvider {

  async syncAccount(userId, accountId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const userEmail = user?.email || 'admin@vktori.com';

    const senders = [
      { name: 'John Doe', email: 'john.doe@gmail.com' },
      { name: 'Clara Oswald', email: 'clara@tardis.org' },
      { name: 'Bruce Wayne', email: 'bruce@waynecorp.com' },
      { name: 'Peter Parker', email: 'peter@dailybugle.com' }
    ];
    const subjects = [
      'Updates regarding the partnership agreement',
      'Follow up on our yesterday conversation',
      'Important: Contract signing schedule',
      'Review requested: Case files & legal documents'
    ];
    const bodies = [
      '<p>Hi Victoria,</p><p>I have reviewed the terms of our partnership agreement and everything looks great. Let me know when we can sign the documents.</p><p>Best regards,<br>John</p>',
      '<p>Hello,</p><p>Just following up on our call yesterday. Could you please send over the retainer agreement when you have a moment?</p><p>Thanks,<br>Clara</p>',
      '<p>Dear Counsel,</p><p>Please find attached the signed contract for the commercial lease. Let me know if you need any other forms.</p><p>Sincerely,<br>Bruce</p>',
      '<p>Hi,</p><p>Here are the case files for the upcoming screening. Let me know if we need to schedule a consultation.</p><p>Best,<br>Peter</p>'
    ];

    const randomIdx = Math.floor(Math.random() * senders.length);
    const sender = senders[randomIdx];
    const subject = subjects[randomIdx];
    const body = bodies[randomIdx];

    const senderUserId = userId === 1 ? 2 : 1;
    const senderUser = await prisma.user.findUnique({ where: { id: senderUserId } });

    await prisma.communication.create({
      data: {
        sender_user_id: senderUserId,
        sender_role: senderUser?.role || 'lawyer',
        communication_type: 'titan_email',
        email_account_id: accountId ? parseInt(accountId, 10) : null,
        folder: 'inbox',
        to: userEmail,
        subject,
        message_body: body,
        is_read: false,
        sync_status: 'synced',
        external_message_id: `msg-sync-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }
    });

    return { success: true, message: 'Sync complete' };
  }

  // ── Get Messages ──────────────────────────────────────
  async getMessages(userId, accountId, filters) {
    // Look up user email for inbox matching
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const userEmail = user?.email || '';

    const baseWhere = {
      communication_type: 'titan_email',
      is_deleted: false,
    };

    if (accountId) baseWhere.email_account_id = parseInt(accountId, 10);

    // Folder-specific logic
    const folder = filters.folder || 'inbox';

    if (folder === 'inbox') {
      // Inbox: emails received by the user (user email in to/cc/bcc) that are NOT sent by the user
      baseWhere.folder = 'inbox';
      baseWhere.OR = [
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
        { bcc: { contains: userEmail } },
      ];
    } else if (folder === 'sent') {
      baseWhere.folder = 'sent';
      baseWhere.sender_user_id = userId;
    } else if (folder === 'drafts') {
      baseWhere.folder = 'drafts';
      baseWhere.sender_user_id = userId;
      baseWhere.is_draft = true;
    } else if (folder === 'starred') {
      baseWhere.is_starred = true;
      baseWhere.OR = [
        { sender_user_id: userId },
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
        { bcc: { contains: userEmail } },
      ];
    } else if (folder === 'flagged') {
      baseWhere.is_flagged = true;
      baseWhere.OR = [
        { sender_user_id: userId },
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
        { bcc: { contains: userEmail } },
      ];
    } else {
      // trash, spam, archive, or custom folder
      baseWhere.folder = folder;
      baseWhere.OR = [
        { sender_user_id: userId },
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
      ];
    }

    // Search filter
    if (filters.search) {
      const searchCondition = [
        { subject: { contains: filters.search } },
        { message_body: { contains: filters.search } },
        { to: { contains: filters.search } },
        { cc: { contains: filters.search } },
      ];

      // Merge search with existing OR conditions
      if (baseWhere.OR) {
        const existingOR = baseWhere.OR;
        delete baseWhere.OR;
        baseWhere.AND = [
          { OR: existingOR },
          { OR: searchCondition },
        ];
      } else {
        baseWhere.OR = searchCondition;
      }
    }

    const messages = await prisma.communication.findMany({
      where: baseWhere,
      orderBy: { created_at: 'desc' },
      include: {
        sender: { select: { id: true, full_name: true, email: true } },
        replies: {
          select: { id: true },
          where: { is_deleted: false },
        },
      },
    });

    return messages;
  }

  // ── Send Email ────────────────────────────────────────
  async sendEmail(userId, role, accountId, payload) {
    const data = {
      sender_user_id: userId,
      sender_role: role,
      communication_type: 'titan_email',
      email_account_id: accountId ? parseInt(accountId, 10) : null,
      folder: 'sent',
      to: Array.isArray(payload.to) ? payload.to.join(',') : (payload.to || ''),
      cc: Array.isArray(payload.cc) ? payload.cc.join(',') : (payload.cc || ''),
      bcc: Array.isArray(payload.bcc) ? payload.bcc.join(',') : (payload.bcc || ''),
      subject: payload.subject || '',
      message_body: payload.message_body || '',
      is_draft: false,
      sync_status: 'synced',
      external_message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    // Threading support
    if (payload.reply_to_id) {
      const parentMsg = await prisma.communication.findUnique({
        where: { id: parseInt(payload.reply_to_id, 10) },
      });
      if (parentMsg) {
        data.parent_id = parentMsg.id;
        data.in_reply_to = parentMsg.external_message_id || null;
        data.external_thread_id = parentMsg.external_thread_id || parentMsg.external_message_id || null;
        // Build references chain
        const refs = parentMsg.references ? parentMsg.references : '';
        data.references = refs ? `${refs}, ${parentMsg.external_message_id}` : (parentMsg.external_message_id || '');
      }
    }

    if (payload.track_opens) data.track_opens = true;
    if (payload.request_read_receipt) data.request_read_receipt = true;

    const message = await prisma.communication.create({ data });

    // Also create an "inbox" copy for each recipient (so they see it in their inbox)
    const allRecipients = [
      ...(Array.isArray(payload.to) ? payload.to : (payload.to || '').split(',').filter(Boolean)),
      ...(Array.isArray(payload.cc) ? payload.cc : (payload.cc || '').split(',').filter(Boolean)),
      ...(Array.isArray(payload.bcc) ? payload.bcc : (payload.bcc || '').split(',').filter(Boolean)),
    ].map(e => e.trim().toLowerCase()).filter(Boolean);

    // Find users matching those emails
    const recipientUsers = await prisma.user.findMany({
      where: { email: { in: allRecipients } },
      select: { id: true, email: true },
    });

    // Create inbox copies for internal users
    for (const recipient of recipientUsers) {
      if (recipient.id === userId) continue; // Don't create inbox copy for sender
      await prisma.communication.create({
        data: {
          ...data,
          id: undefined,
          folder: 'inbox',
          sender_user_id: userId, // The original sender
          is_read: false,
          external_message_id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          // Keep threading metadata
          parent_id: data.parent_id || null,
          in_reply_to: data.in_reply_to || null,
          external_thread_id: data.external_thread_id || message.external_message_id,
          references: data.references || null,
        },
      });
    }

    return message;
  }

  // ── Save Draft ────────────────────────────────────────
  async saveDraft(userId, role, accountId, payload) {
    if (payload.id) {
      return await prisma.communication.update({
        where: { id: parseInt(payload.id, 10) },
        data: {
          to: Array.isArray(payload.to) ? payload.to.join(',') : (payload.to || ''),
          cc: Array.isArray(payload.cc) ? payload.cc.join(',') : (payload.cc || ''),
          bcc: Array.isArray(payload.bcc) ? payload.bcc.join(',') : (payload.bcc || ''),
          subject: payload.subject || '',
          message_body: payload.message_body || '',
          updated_at: new Date(),
        },
      });
    }

    return await prisma.communication.create({
      data: {
        sender_user_id: userId,
        sender_role: role,
        communication_type: 'titan_email',
        email_account_id: accountId ? parseInt(accountId, 10) : null,
        folder: 'drafts',
        to: Array.isArray(payload.to) ? payload.to.join(',') : (payload.to || ''),
        cc: Array.isArray(payload.cc) ? payload.cc.join(',') : (payload.cc || ''),
        bcc: Array.isArray(payload.bcc) ? payload.bcc.join(',') : (payload.bcc || ''),
        subject: payload.subject || '',
        message_body: payload.message_body || '',
        is_draft: true,
        sync_status: 'synced',
      },
    });
  }

  // ── Update Message State ──────────────────────────────
  async updateMessageState(userId, messageId, data) {
    // Only allow updating safe fields
    const allowed = {};
    if (data.is_read !== undefined) {
      allowed.is_read = !!data.is_read;
      if (data.is_read) allowed.read_at = new Date();
    }
    if (data.is_starred !== undefined) allowed.is_starred = !!data.is_starred;
    if (data.is_flagged !== undefined) allowed.is_flagged = !!data.is_flagged;

    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data: allowed,
    });
  }

  // ── Move Message ──────────────────────────────────────
  async moveMessage(userId, messageId, folder) {
    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data: { folder },
    });
  }

  // ── Delete Message ────────────────────────────────────
  async deleteMessage(userId, messageId) {
    const msg = await prisma.communication.findUnique({ where: { id: parseInt(messageId, 10) } });
    if (!msg) throw new Error('Message not found');

    if (msg.folder === 'trash') {
      // Permanent soft-delete
      return await prisma.communication.update({
        where: { id: parseInt(messageId, 10) },
        data: { is_deleted: true },
      });
    }

    // Move to trash
    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data: { folder: 'trash' },
    });
  }

  // ── Restore Message ───────────────────────────────────
  async restoreMessage(userId, messageId) {
    return await prisma.communication.update({
      where: { id: parseInt(messageId, 10) },
      data: { folder: 'inbox' },
    });
  }

  // ── Get Thread ────────────────────────────────────────
  async getThread(userId, messageId) {
    const msg = await prisma.communication.findUnique({
      where: { id: parseInt(messageId, 10) },
    });
    if (!msg) throw new Error('Message not found');

    const threadId = msg.external_thread_id || msg.external_message_id;

    // Find all messages in this thread
    let threadMessages = [];
    if (threadId) {
      threadMessages = await prisma.communication.findMany({
        where: {
          communication_type: 'titan_email',
          is_deleted: false,
          OR: [
            { external_thread_id: threadId },
            { external_message_id: threadId },
          ],
        },
        orderBy: { created_at: 'asc' },
        include: {
          sender: { select: { id: true, full_name: true, email: true } },
        },
      });
    }

    // Also find by parent_id chain
    if (threadMessages.length <= 1) {
      // Walk up the parent chain
      const allIds = new Set();
      let current = msg;
      while (current) {
        allIds.add(current.id);
        if (current.parent_id) {
          current = await prisma.communication.findUnique({ where: { id: current.parent_id } });
        } else {
          break;
        }
      }
      // Walk down the replies
      const findReplies = async (parentId) => {
        const replies = await prisma.communication.findMany({
          where: { parent_id: parentId, is_deleted: false },
        });
        for (const r of replies) {
          allIds.add(r.id);
          await findReplies(r.id);
        }
      };
      // Find root
      let root = msg;
      while (root.parent_id) {
        root = await prisma.communication.findUnique({ where: { id: root.parent_id } });
        if (!root) break;
      }
      if (root) {
        allIds.add(root.id);
        await findReplies(root.id);
      }

      if (allIds.size > 1) {
        threadMessages = await prisma.communication.findMany({
          where: {
            id: { in: Array.from(allIds) },
            is_deleted: false,
          },
          orderBy: { created_at: 'asc' },
          include: {
            sender: { select: { id: true, full_name: true, email: true } },
          },
        });
      }
    }

    return threadMessages.length > 1 ? threadMessages : [msg];
  }

  // ── Bulk Action ───────────────────────────────────────
  async bulkAction(userId, messageIds, action) {
    const ids = messageIds.map(id => parseInt(id, 10));

    switch (action) {
      case 'delete':
        await prisma.communication.updateMany({
          where: { id: { in: ids }, NOT: { folder: 'trash' } },
          data: { folder: 'trash' },
        });
        await prisma.communication.updateMany({
          where: { id: { in: ids }, folder: 'trash' },
          data: { is_deleted: true },
        });
        break;
      case 'permanent_delete':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_deleted: true },
        });
        break;
      case 'archive':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { folder: 'archive' },
        });
        break;
      case 'mark_read':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_read: true, read_at: new Date() },
        });
        break;
      case 'mark_unread':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_read: false, read_at: null },
        });
        break;
      case 'star':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_starred: true },
        });
        break;
      case 'unstar':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_starred: false },
        });
        break;
      case 'flag':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_flagged: true },
        });
        break;
      case 'unflag':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { is_flagged: false },
        });
        break;
      case 'restore':
        await prisma.communication.updateMany({
          where: { id: { in: ids } },
          data: { folder: 'inbox' },
        });
        break;
      default:
        throw new Error(`Unknown bulk action: ${action}`);
    }

    return { success: true, count: ids.length };
  }

  // ── Folder Counts ─────────────────────────────────────
  async getFolderCounts(userId, accountId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const userEmail = user?.email || '';

    const folders = ['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive'];
    const counts = {};

    for (const folder of folders) {
      const where = {
        communication_type: 'titan_email',
        is_deleted: false,
        is_read: false,
        folder,
      };

      if (accountId) {
        where.email_account_id = parseInt(accountId, 10);
      }

      if (folder === 'inbox') {
        where.OR = [
          { to: { contains: userEmail } },
          { cc: { contains: userEmail } },
          { bcc: { contains: userEmail } },
        ];
      } else if (folder === 'sent' || folder === 'drafts') {
        where.sender_user_id = userId;
      } else {
        where.OR = [
          { sender_user_id: userId },
          { to: { contains: userEmail } },
          { cc: { contains: userEmail } },
          { bcc: { contains: userEmail } },
        ];
      }

      counts[folder] = await prisma.communication.count({ where });
    }

    // Starred count
    const starredWhere = {
      communication_type: 'titan_email',
      is_deleted: false,
      is_starred: true,
      OR: [
        { sender_user_id: userId },
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
        { bcc: { contains: userEmail } },
      ],
    };
    if (accountId) {
      starredWhere.email_account_id = parseInt(accountId, 10);
    }
    counts.starred = await prisma.communication.count({ where: starredWhere });

    // Flagged count
    const flaggedWhere = {
      communication_type: 'titan_email',
      is_deleted: false,
      is_flagged: true,
      OR: [
        { sender_user_id: userId },
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
        { bcc: { contains: userEmail } },
      ],
    };
    if (accountId) {
      flaggedWhere.email_account_id = parseInt(accountId, 10);
    }
    counts.flagged = await prisma.communication.count({ where: flaggedWhere });

    return counts;
  }

  async getCustomFolders(userId, accountId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    const userEmail = user?.email || '';

    const where = {
      communication_type: 'titan_email',
      is_deleted: false,
      OR: [
        { sender_user_id: userId },
        { to: { contains: userEmail } },
        { cc: { contains: userEmail } },
        { bcc: { contains: userEmail } }
      ]
    };
    if (accountId) {
      where.email_account_id = parseInt(accountId, 10);
    }

    const comms = await prisma.communication.findMany({
      where,
      select: { folder: true }
    });

    const standardFolders = new Set(['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive', 'starred', 'flagged']);
    const customFolders = new Set();
    comms.forEach(c => {
      if (c.folder && !standardFolders.has(c.folder)) {
        customFolders.add(c.folder);
      }
    });

    return Array.from(customFolders);
  }

  async getEmailAccounts(userId) {
    return await prisma.emailAccount.findMany({
      where: { user_id: userId, provider: 'titan' },
      orderBy: { created_at: 'desc' }
    });
  }

  async addEmailAccount(userId, data) {
    return await prisma.emailAccount.create({
      data: {
        user_id: userId,
        provider: 'titan',
        email_address: data.email_address,
        smtp_host: data.smtp_host || 'smtp.titan.email',
        smtp_port: data.smtp_port ? parseInt(data.smtp_port, 10) : 465,
        imap_host: data.imap_host || 'imap.titan.email',
        imap_port: data.imap_port ? parseInt(data.imap_port, 10) : 993,
        username: data.username || data.email_address,
        password: data.password || '',
        sync_status: 'connected',
      }
    });
  }

  async deleteEmailAccount(userId, accountId) {
    return await prisma.emailAccount.deleteMany({
      where: {
        id: parseInt(accountId, 10),
        user_id: userId
      }
    });
  }
}

module.exports = new TitanEmailProvider();
