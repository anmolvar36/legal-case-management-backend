const { processClioMatterImport } = require('./import.service');

exports.importClioMatters = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const dryRun = req.query.dryRun === 'true';
    const userId = req.user.id; // Assuming authentication middleware attaches user

    const filePath = req.file.path;

    const report = await processClioMatterImport(filePath, dryRun, userId);

    res.status(200).json(report);
  } catch (error) {
    next(error);
  }
};
