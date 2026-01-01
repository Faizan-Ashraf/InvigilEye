const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5001;

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
        const updateStmt = `UPDATE exams SET status = 'completed' WHERE status != 'completed' AND (exam_date || ' ' || IFNULL(end_time, '00:00')) <= ?`;
        const info = require('./database/db').db.prepare(updateStmt).run(ts);
        if (info && info.changes && info.changes > 0) {
          console.log(`⏱ Auto-completed ${info.changes} exam(s) as of ${ts}`);
        }
      } catch (err) {
        console.error('Auto-complete exams error:', err);
      }
    };

    // run immediately and then every minute
    markExpiredExams();
    setInterval(markExpiredExams, 60 * 1000);

    app.listen(PORT, 'localhost', () => {
      console.log(`🚀 InvigilEye Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;

