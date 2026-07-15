const { verifyToken } = require('../utils/jwt');
const { sendResponse } = require('../utils/response');
const prisma = require('../config/db');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json(sendResponse(false, 'Not authorized to access this route'));
  }

  try {
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json(sendResponse(false, 'Not authorized to access this route'));
    }

    req.user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        full_name: true,
        email: true,
        role: true,
        is_active: true,
        roles: true
      }
    });

    if (!req.user || !req.user.is_active) {
      return res.status(401).json(sendResponse(false, 'User not found or inactive'));
    }

    // Attach mapped roles or fallback
    req.user.roles = req.user.roles?.length > 0 ? req.user.roles.map(r => r.role) : [req.user.role];

    next();
  } catch (err) {
    return res.status(401).json(sendResponse(false, 'Not authorized to access this route'));
  }
};

module.exports = { protect };
