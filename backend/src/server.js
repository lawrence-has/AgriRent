require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sequelize } = require('./models');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTemporaryDatabaseError = (error) => {
  const codes = [
    error?.code,
    error?.parent?.code,
    error?.original?.code,
    ...(error?.parent?.errors || []).map((item) => item.code),
    ...(error?.original?.errors || []).map((item) => item.code),
  ];
  return codes.some((code) => ['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN'].includes(code));
};

const connectToDatabase = async () => {
  const maxAttempts = 8;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connected');
      return;
    } catch (error) {
      if (!isTemporaryDatabaseError(error) || attempt === maxAttempts) throw error;
      const delay = Math.min(1500 * (2 ** (attempt - 1)), 8000);
      console.error(`[Database] Cannot reach ${sequelize.config.host}:${sequelize.config.port} (attempt ${attempt}/${maxAttempts}); retrying in ${Math.ceil(delay / 1000)}s.`);
      await wait(delay);
    }
  }
};

// ── Global error guards ──────────────────────────────────────────
// Prevent the process from crashing on unhandled async errors
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err.message);
  // Give active requests a moment to finish before exiting
  setTimeout(() => process.exit(1), 1000);
});

const server = http.createServer(app);

// Initialize socket.io — allow all origins in dev, restrict in prod
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: false,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// Initialize socket handlers
initSocket(io);

// Sync DB and start server
const start = async () => {
  try {
    await connectToDatabase();
    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

start();
