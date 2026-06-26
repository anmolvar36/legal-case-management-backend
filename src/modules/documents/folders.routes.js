const express = require('express');
const router = express.Router();
const folderController = require('./folders.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.get('/', protect, folderController.getFolders);
router.post('/', protect, folderController.createFolder);

module.exports = router;
