const express = require('express');
const router = express.Router();
const controller = require('./search.controller');
const { protect } = require('../../middlewares/auth.middleware');

router.get('/', protect, controller.search);

module.exports = router;
