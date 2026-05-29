const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const cron = require('node-cron');
const { connectDB } = require('./models/db');
const { initWebSocket } = require('./websocket/wsServer');
const { initFCM } = require('./notifications/fcm');
const { runDailySummary } = require('./cron/dailySummary');

// Routes
const patientRoutes = require('./routes/patients');
const vitalsRoutes = require('./routes/vitals');
const alertRoutes = require('./routes/alerts');
const medicationRoutes = require('./routes/medications');
const visitRoutes = require('./routes/visits');
const analysisRoutes = require('./routes/analysis');
const authRoutes = require('./routes/auth');
const inboundRoutes = require('./routes/inbound');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'primecare-cloud', time: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/vitals', vitalsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/inbound', inboundRoutes);

// WebSocket
initWebSocket(server);

// FCM
initFCM();

// Daily summary cron — runs at 8am every day
cron.schedule('0 8 * * *', () => {
  console.log('Running daily summary cron job...');
  runDailySummary();
}, {
  timezone: 'Asia/Kolkata'
});

// Start
const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`PrimeCare Cloud running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});
