require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sequelize } = require('./models');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Make io accessible in routes via req.app.get('io')
app.set('io', io);

// Initialize socket handlers
initSocket(io);

// Sync DB and start server
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // sync({ alter: true }) updates tables to match models without dropping data
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
