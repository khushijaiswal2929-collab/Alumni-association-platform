// server/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const sequelize = require('./db');

const User = require('./models/User');
const Opportunity = require('./models/Opportunity');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const oppRoutes = require('./routes/opportunities');

const app = express();
const PORT = process.env.PORT || 3000;

// Associations
User.hasMany(Opportunity);
Opportunity.belongsTo(User);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/opportunities', oppRoutes);

// Fallback: serve index.html for any unmatched GET (helps if you use SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Start
sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('DB sync error:', err);
});