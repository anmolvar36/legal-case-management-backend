const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { validate } = require('../../middlewares/validate.middleware');
const { authSchema } = require('./auth.schema');
const { protect } = require('../../middlewares/auth.middleware');

router.post('/login', validate(authSchema.login), authController.login);
router.post('/register', validate(authSchema.register), authController.register);
router.get('/me', protect, authController.getMe);
router.patch('/change-password', protect, authController.changePassword);
router.post('/logout', authController.logout);

module.exports = router;
