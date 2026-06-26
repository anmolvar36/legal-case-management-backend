const folderService = require('./folders.service');

exports.getFolders = async (req, res) => {
  try {
    const folders = await folderService.getAll(req.query);
    res.json({ success: true, data: folders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFolder = async (req, res) => {
  try {
    const folder = await folderService.create(req.body);
    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
