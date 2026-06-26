const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRE: process.env.JWT_EXPIRE || '24h',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:3000',
};
// Trigger nodemon reload
