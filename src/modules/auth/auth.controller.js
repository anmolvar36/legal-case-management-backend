const authService = require('./auth.service');
const { sendResponse } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body);
    res.status(200).json(sendResponse(true, 'Login successful', data));
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const data = await authService.register(req.body);
    res.status(201).json(sendResponse(true, 'Registration successful', data));
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    res.status(200).json(sendResponse(true, 'User data fetched', req.user));
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    res.status(200).json(sendResponse(true, 'User logged out'));
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const data = await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json(sendResponse(true, data.message));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  getMe,
  logout,
  changePassword,
};
