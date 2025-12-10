const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get exam report
router.get('/exam/:examId', (req, res) => {
  const examId = req.params.examId;

  try {
    // Get exam details
    const examQuery = `
      SELECT e.*
      FROM exams e
      WHERE e.id = ?
    `;

    const exam = db.prepare(examQuery).get(examId);
    
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Get attendance stats
    const attendanceQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
      FROM attendance
      WHERE exam_id = ?
    `;

    const attendance = db.prepare(attendanceQuery).get(examId) || { total: 0, present: 0, absent: 0 };

    // Get alerts count
    const alertsQuery = 'SELECT COUNT(*) as count FROM alerts WHERE exam_id = ?';
    const alertsResult = db.prepare(alertsQuery).get(examId);
    const alerts_count = alertsResult?.count || 0;

    // Get requests count
    const requestsQuery = 'SELECT COUNT(*) as count FROM requests WHERE exam_id = ?';
    const requestsResult = db.prepare(requestsQuery).get(examId);
    const requests_count = requestsResult?.count || 0;

    res.json({
      exam,
      attendance,
      alerts_count,
      requests_count
    });
  } catch (error) {
    console.error('Get exam report error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all reports summary
router.get('/summary', (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.title,
      e.venue,
      e.exam_date,
      e.status,
      e.invigilator_email,
      COUNT(DISTINCT s.id) as total_students,
      COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_count,
      COUNT(DISTINCT al.id) as alerts_count,
      COUNT(DISTINCT r.id) as requests_count
    FROM exams e
    LEFT JOIN students s ON s.exam_id = e.id
    LEFT JOIN attendance a ON a.exam_id = e.id
    LEFT JOIN alerts al ON al.exam_id = e.id
    LEFT JOIN requests r ON r.exam_id = e.id
    GROUP BY e.id, e.title, e.venue, e.exam_date, e.status, e.invigilator_email
    ORDER BY e.created_at DESC
  `;

  try {
    const reports = db.prepare(query).all();
    res.json(reports);
  } catch (error) {
    console.error('Get reports summary error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
