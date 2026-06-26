const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/env');

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRE,
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
};
