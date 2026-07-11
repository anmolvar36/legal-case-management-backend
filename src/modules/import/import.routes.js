const express = require('express');
const router = express.Router();
const multer = require('multer');
const { importClioMatters } = require('./import.controller');
const { importClioTimeEntries } = require('./timeEntryImport.controller');
const { importClioMatterNotes } = require('./matterNoteImport.controller');
const { importClioContactNotes } = require('./contactNoteImport.controller');
const { importClioCommunications } = require('./communicationImport.controller');
const { protect } = require('../../middlewares/auth.middleware');

// Configure multer for CSV uploads
const upload = multer({ dest: 'uploads/imports/' });

router.post('/clio/matters', protect, upload.single('file'), importClioMatters);
router.post('/clio/time-entries', protect, upload.single('file'), importClioTimeEntries);
router.post('/clio/matter-notes', protect, upload.single('file'), importClioMatterNotes);
router.post('/clio/contact-notes', protect, upload.single('file'), importClioContactNotes);
router.post('/clio/communications', protect, upload.single('file'), importClioCommunications);

module.exports = router;
