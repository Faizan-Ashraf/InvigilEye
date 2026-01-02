const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
// Allow configuring port via env var for flexibility (BACKEND_PORT or PORT)
const PORT = process.env.BACKEND_PORT || process.env.PORT || 5001;

// Import routes
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const requestRoutes = require('./routes/requests');
const reportRoutes = require('./routes/reports');
const attendanceRoutes = require('./routes/attendance');
const alertRoutes = require('./routes/alerts');
const monitoringRoutes = require('./routes/monitoring');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Create snapshots directory if it doesn't exist
const snapshotsDir = path.join(__dirname, '..', 'snapshots');
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
}

// Static files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'InvigilEye backend is running' });
});

// Initialize and start server
const logger = require('./logger');

const startServer = async () => {
  try {
    // Initialize database
    const db = require('./database/db');
    await db.init();

    // Auto-complete exams whose end time has passed
    const markExpiredExams = () => {
      try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

        // Find exams that should be marked as completed
        const rows = require('./database/db').db.prepare(`
          SELECT id FROM exams WHERE status != 'completed' AND (exam_date || ' ' || IFNULL(end_time, '00:00')) <= ?
        `).all(ts);

        if (rows && rows.length > 0) {
          const ids = rows.map(r => r.id);
          // Mark them as completed
          const placeholders = ids.map(() => '?').join(',');
          const updateStmt = `UPDATE exams SET status = 'completed' WHERE id IN (${placeholders})`;
          require('./database/db').db.prepare(updateStmt).run(...ids);

          logger.info(`⏱ Auto-completed ${ids.length} exam(s) as of ${ts}:`, ids.join(', '));

          // For each completed exam, stop detection and clean up snapshots (if any)
          try {
            ids.forEach(id => {
              if (monitoringRoutes && typeof monitoringRoutes.stopDetectionForExam === 'function') {
                logger.info(`[Server] Stopping detection and cleaning snapshots for exam ${id}`);
                monitoringRoutes.stopDetectionForExam(id);
              }
            });
          } catch (innerErr) {
            logger.error('Error while stopping detections for expired exams:', innerErr);
          }
        }
      } catch (err) {
        logger.error('Auto-complete exams error:', err);
      }
    };

    // run immediately and then every minute
    markExpiredExams();
    setInterval(markExpiredExams, 60 * 1000);

    const server = app.listen(PORT, 'localhost', () => {
      logger.info(`🚀 InvigilEye Backend running on http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. If you have another instance running, stop it or set a different port using BACKEND_PORT or PORT environment variable.`);
        logger.error(`Example to run on a different port (PowerShell): $env:BACKEND_PORT='5002'; npm run backend`);
        logger.error('Or find the PID using the port and kill it:');
        logger.error('  netstat -ano | findstr ":' + PORT + '"   (then taskkill /PID <pid> /F)');
        process.exit(1);
      } else {
        logger.error('Server error:', err);
        process.exit(1);
      }
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;

