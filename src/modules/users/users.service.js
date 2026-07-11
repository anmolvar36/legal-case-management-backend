const prisma = require('../../config/db');
const notificationsService = require('../notifications/notifications.service');
const bcrypt = require('bcryptjs');

const getAll = async (query) => {
  const users = await prisma.user.findMany({
    include: {
      roles: true,
      lawyer: true,
      _count: {
        select: { assigned_matters: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  return users.map(u => {
    const userRoles = u.roles?.length > 0 ? u.roles.map(r => r.role) : [u.role];
    const { password_hash, roles, lawyer, ...rest } = u;
    return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
  });
};

const getById = async (id) => {
  const u = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    include: {
      roles: true,
      lawyer: true,
    },
  });

  if (!u) return null;
  const userRoles = u.roles?.length > 0 ? u.roles.map(r => r.role) : [u.role];
  const { password_hash, roles, lawyer, ...rest } = u;
  return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
};

const create = async (data) => {
  const salt = await bcrypt.genSalt(10);
  data.password_hash = await bcrypt.hash(data.password, salt);
  delete data.password;
  
  const { roles, practice_focus, ...userData } = data;
  if (roles && roles.length > 0) {
    userData.role = roles[0]; // Fallback for legacy column
  }
  
  const user = await prisma.user.create({ data: userData });

  if (roles && roles.length > 0) {
    await prisma.userRole.createMany({
      data: roles.map(r => ({ user_id: user.id, role: r }))
    });
  } else if (user.role) {
    await prisma.userRole.create({
      data: { user_id: user.id, role: user.role }
    });
  }

  // Create Lawyer profile if roles includes lawyer
  const resolvedRoles = roles || (user.role ? [user.role] : []);
  if (resolvedRoles.includes('lawyer')) {
    await prisma.lawyer.create({
      data: {
        user_id: user.id,
        display_name: user.full_name,
        practice_focus: practice_focus || null,
      }
    });
  }

  const createdUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { roles: true, lawyer: true }
  });

  if (!createdUser) return null;
  const userRoles = createdUser.roles?.length > 0 ? createdUser.roles.map(r => r.role) : [createdUser.role];
  const { password_hash, roles: _, lawyer, ...rest } = createdUser;

  if (userRoles.includes('client')) {
    const admins = await prisma.user.findMany({
      where: { roles: { some: { role: 'admin' } } },
      select: { id: true }
    });

    for (const admin of admins) {
      await notificationsService.createNotification({
        user_id: admin.id,
        title: 'New Client Registered',
        message: `${rest.full_name} has registered and is awaiting onboarding.`,
        type: 'client',
        reference_id: rest.id
      });
    }
  }

  return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
};

const update = async (id, data) => {
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password_hash = await bcrypt.hash(data.password, salt);
    delete data.password;
  }
  
  const { roles, practice_focus, ...userData } = data;
  if (roles && roles.length > 0) {
    userData.role = roles[0];
  }
  
  await prisma.user.update({
    where: { id: parseInt(id) },
    data: userData,
  });

  if (roles) {
    await prisma.userRole.deleteMany({
      where: { user_id: parseInt(id) }
    });
    if (roles.length > 0) {
      await prisma.userRole.createMany({
        data: roles.map(r => ({ user_id: parseInt(id), role: r }))
      });
    }
  }

  // Upsert Lawyer profile if roles includes lawyer
  const resolvedRoles = roles || [];
  if (resolvedRoles.includes('lawyer')) {
    await prisma.lawyer.upsert({
      where: { user_id: parseInt(id) },
      update: {
        display_name: userData.full_name || "",
        practice_focus: practice_focus || null,
      },
      create: {
        user_id: parseInt(id),
        display_name: userData.full_name || "",
        practice_focus: practice_focus || null,
      }
    });
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: parseInt(id) },
    include: { roles: true, lawyer: true }
  });

  if (!updatedUser) return null;
  const userRoles = updatedUser.roles?.length > 0 ? updatedUser.roles.map(r => r.role) : [updatedUser.role];
  const { password_hash, roles: _, lawyer, ...rest } = updatedUser;
  return { ...rest, roles: userRoles, practice_focus: lawyer?.practice_focus || null };
};

const resetPassword = async (id, newPassword) => {
  if (!newPassword || newPassword.length < 4) {
    const error = new Error('Password must be at least 4 characters');
    error.statusCode = 400;
    throw error;
  }
  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(newPassword, salt);
  await prisma.user.update({
    where: { id: parseInt(id) },
    data: {
      password_hash,
      must_reset_password: false,
    },
  });
  return { success: true };
};

const remove = async (id) => {
  const userId = parseInt(id);

  // 1. Fetch user to ensure they exist
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { client: true }
  });
  if (!targetUser) return null;

  // 2. Fetch all drafts created/updated by this user, or referencing their matters
  const userDrafts = await prisma.draft.findMany({
    where: {
      OR: [
        { created_by_user_id: userId },
        { last_updated_by_user_id: userId },
        ...(targetUser.client ? [{ matter: { client_id: targetUser.client.id } }] : [])
      ]
    },
    select: { id: true }
  });
  const draftIds = userDrafts.map(d => d.id);

  if (draftIds.length > 0) {
    // Delete Signatures referencing these drafts
    await prisma.signature.deleteMany({ where: { draft_id: { in: draftIds } } });
    // Delete Signature Requests
    await prisma.signatureRequest.deleteMany({ where: { draft_id: { in: draftIds } } });
    // Delete the Drafts themselves
    await prisma.draft.deleteMany({ where: { id: { in: draftIds } } });
  }

  // 3. Clear/delete any Signatures signed by this user
  await prisma.signature.deleteMany({ where: { signed_by_user_id: userId } });

  // 4. If client profile exists, clean up client-specific relations
  if (targetUser.client) {
    const clientId = targetUser.client.id;

    // Fetch all client matters
    const clientMatters = await prisma.matter.findMany({
      where: { client_id: clientId },
      select: { id: true }
    });
    const matterIds = clientMatters.map(m => m.id);

    if (matterIds.length > 0) {
      // Delete conflict checks
      await prisma.conflictCheck.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete time entries
      await prisma.timeEntry.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete tasks
      await prisma.task.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete communications
      await prisma.communication.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete folders
      await prisma.folder.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete custom field values
      await prisma.matterCustomFieldValue.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete matter status history
      await prisma.matterStatusHistory.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete calendar events
      await prisma.calendarEvent.deleteMany({ where: { matter_id: { in: matterIds } } });
      
      // Delete payments
      await prisma.payment.deleteMany({ where: { matter_id: { in: matterIds } } });
      // Delete invoices
      await prisma.invoice.deleteMany({ where: { matter_id: { in: matterIds } } });
      
      // Delete documents
      await prisma.document.deleteMany({ where: { matter_id: { in: matterIds } } });

      // Delete trust transactions referencing client matters
      await prisma.trustTransaction.deleteMany({ where: { matter_id: { in: matterIds } } });
    }

    // Delete trust transactions for this client
    await prisma.trustTransaction.deleteMany({ where: { client_id: clientId } });

    // Delete trust account for this client
    await prisma.trustAccount.deleteMany({ where: { client_id: clientId } });

    // Clear client references from converted leads
    await prisma.lead.updateMany({
      where: { converted_client_id: clientId },
      data: { converted_client_id: null }
    });

    // Delete the matters
    await prisma.matter.deleteMany({ where: { client_id: clientId } });

    // Delete the Client profile itself
    await prisma.client.delete({ where: { id: clientId } });
  }

  // 5. Clean up any remaining records directly created by or assigned to the User:

  // Delete notifications
  await prisma.notification.deleteMany({ where: { user_id: userId } });

  // Delete activities
  await prisma.activity.deleteMany({ where: { actor_user_id: userId } });

  // Delete conflict checks created by user
  await prisma.conflictCheck.deleteMany({ where: { created_by_user_id: userId } });

  // Delete time entries
  await prisma.timeEntry.deleteMany({ where: { user_id: userId } });

  // Delete tasks
  await prisma.task.deleteMany({
    where: {
      OR: [
        { assigned_user_id: userId },
        { created_by_user_id: userId }
      ]
    }
  });

  // Delete templates
  await prisma.template.deleteMany({ where: { created_by_user_id: userId } });

  // Delete documents uploaded by user
  await prisma.document.deleteMany({ where: { uploaded_by_user_id: userId } });

  // Delete communications sent by user
  await prisma.communication.deleteMany({ where: { sender_user_id: userId } });

  // Delete payments handled
  await prisma.payment.deleteMany({ where: { created_by_user_id: userId } });

  // Delete trust transactions
  await prisma.trustTransaction.deleteMany({ where: { created_by_user_id: userId } });

  // Nullify created matters/assigned matters references
  await prisma.matter.updateMany({
    where: { created_by_user_id: userId },
    data: { created_by_user_id: 1 } // Safe fallback to Admin user (ID 1)
  });
  await prisma.matter.updateMany({
    where: { assigned_lawyer_id: userId },
    data: { assigned_lawyer_id: null }
  });

  // Nullify lead creation
  await prisma.lead.updateMany({
    where: { created_by_user_id: userId },
    data: { created_by_user_id: null }
  });

  // Delete invoices
  await prisma.invoice.deleteMany({ where: { created_by_user_id: userId } });

  // Delete calendar events created by user
  await prisma.calendarEvent.deleteMany({ where: { created_by: userId } });

  // Delete user roles
  await prisma.userRole.deleteMany({ where: { user_id: userId } });

  // Delete lawyer profile
  await prisma.lawyer.deleteMany({ where: { user_id: userId } });

  // 6. Finally, hard delete the User record itself
  return await prisma.user.delete({
    where: { id: userId }
  });
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  resetPassword,
  remove,
};
