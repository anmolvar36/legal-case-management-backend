const titanEmailService = require('../services/email/titanEmail.service');

const syncAccount = async (req, res) => {
  try {
    const { accountId } = req.body;
    const result = await titanEmailService.syncAccount(req.user.id, accountId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { accountId, folder, is_starred, is_flagged, is_draft, search } = req.query;
    const messages = await titanEmailService.getMessages(req.user.id, accountId, {
      folder, is_starred, is_flagged, is_draft, search
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const sendEmail = async (req, res) => {
  try {
    const { accountId, ...payload } = req.body;
    const message = await titanEmailService.sendEmail(req.user.id, req.user.role, accountId, payload);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const saveDraft = async (req, res) => {
  try {
    const { accountId, ...payload } = req.body;
    const message = await titanEmailService.saveDraft(req.user.id, req.user.role, accountId, payload);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateMessageState = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await titanEmailService.updateMessageState(req.user.id, id, req.body);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const moveMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { folder } = req.body;
    const message = await titanEmailService.moveMessage(req.user.id, id, folder);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await titanEmailService.deleteMessage(req.user.id, id);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const restoreMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await titanEmailService.restoreMessage(req.user.id, id);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getThread = async (req, res) => {
  try {
    const { id } = req.params;
    const thread = await titanEmailService.getThread(req.user.id, id);
    res.json({ success: true, data: thread });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const bulkAction = async (req, res) => {
  try {
    const { messageIds, action } = req.body;
    if (!messageIds || !Array.isArray(messageIds) || !action) {
      return res.status(400).json({ success: false, message: 'messageIds (array) and action are required' });
    }
    const result = await titanEmailService.bulkAction(req.user.id, messageIds, action);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getFolderCounts = async (req, res) => {
  try {
    const { accountId } = req.query;
    const counts = await titanEmailService.getFolderCounts(req.user.id, accountId);
    res.json({ success: true, data: counts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomFolders = async (req, res) => {
  try {
    const { accountId } = req.query;
    const folders = await titanEmailService.getCustomFolders(req.user.id, accountId);
    res.json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEmailAccounts = async (req, res) => {
  try {
    const accounts = await titanEmailService.getEmailAccounts(req.user.id);
    res.json({ success: true, data: accounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const addEmailAccount = async (req, res) => {
  try {
    const account = await titanEmailService.addEmailAccount(req.user.id, req.body);
    res.json({ success: true, data: account });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteEmailAccount = async (req, res) => {
  try {
    const { id } = req.params;
    await titanEmailService.deleteEmailAccount(req.user.id, id);
    res.json({ success: true, message: 'Account disconnected successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  syncAccount,
  getMessages,
  sendEmail,
  saveDraft,
  updateMessageState,
  moveMessage,
  deleteMessage,
  restoreMessage,
  getThread,
  bulkAction,
  getFolderCounts,
  getCustomFolders,
  getEmailAccounts,
  addEmailAccount,
  deleteEmailAccount,
};

