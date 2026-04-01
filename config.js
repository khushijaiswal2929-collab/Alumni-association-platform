// server/config.js
// single place for secrets (change before production)
module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'supersecret123'
};