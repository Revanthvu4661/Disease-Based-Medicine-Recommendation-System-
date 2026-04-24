const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const { Server } = require('socket.io');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { initializeEmailService } = require('./services/emailService');
const { setupSwagger } = require('./swagger');
const { startReminderService } = require('./services/reminderService');
const { initSocketService } = require('./services/socketService');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Security middleware
app.use(helmet());

// Logging
app.use(morgan('combined'));

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// Swagger documentation
setupSwagger(app);

// Fail fast if DB is disconnected (prevents "it worked" but nothing in MongoDB)
mongoose.set('bufferCommands', false);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/records', require('./routes/records'));
app.use('/api/medical', require('./routes/medical'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/messages', require('./routes/messages'));

// Serve client for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/MediCare')
  .then(() => {
    console.log('✅ MongoDB Connected');
    initializeEmailService();
    initSocketService(io);
    startReminderService();
    server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Close the other process or change PORT in .env.`);
        process.exitCode = 1;
        return;
      }
      console.error('❌ Server error:', err.message || err);
      process.exitCode = 1;
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('💡 Make sure to set MONGO_URI in your .env file');
    const allow = String(process.env.ALLOW_DB_DISCONNECTED || '').toLowerCase() === 'true';
    if (allow) {
      console.log('⚠️ Starting anyway because ALLOW_DB_DISCONNECTED=true');
      initSocketService(io);
      server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT} (DB disconnected)`));
      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use. Close the other process or change PORT in .env.`);
          process.exitCode = 1;
          return;
        }
        console.error('❌ Server error:', err.message || err);
        process.exitCode = 1;
      });
      return;
    }
    process.exitCode = 1;
  });

module.exports = app;
