const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all alerts
router.get('/', (req, res) => {
  const query = `
    SELECT a.*, e.title as exam_title, e.venue
    FROM alerts a
    LEFT JOIN exams e ON a.exam_id = e.id
    ORDER BY a.created_at DESC
    LIMIT 50
  `;
  
  try {
    const alerts = db.prepare(query).all();
    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get alerts by exam
router.get('/exam/:examId', (req, res) => {
  const query = 'SELECT * FROM alerts WHERE exam_id = ? ORDER BY created_at DESC';
  
  try {
    const alerts = db.prepare(query).all(req.params.examId);
    res.json(alerts);
  } catch (error) {
    console.error('Get alerts by exam error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create alert
router.post('/', (req, res) => {
  const { exam_id, student_id, exam_title, type, description, severity, snapshot_url } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Type is required' });
  }

  const query = 'INSERT INTO alerts (exam_id, student_id, exam_title, type, description, severity, snapshot_url) VALUES (?, ?, ?, ?, ?, ?, ?)';

  try {
    const result = db.prepare(query).run(
      exam_id || null,
      student_id || null,
      exam_title || null,
      type,
      description || '',
      severity || 'medium',
      snapshot_url || null
    );
    res.json({ success: true, id: result.lastInsertRowid, message: 'Alert created' });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Acknowledge alert
router.put('/:id/acknowledge', (req, res) => {
  const query = 'UPDATE alerts SET acknowledged = 1 WHERE id = ?';

  try {
    db.prepare(query).run(req.params.id);
    res.json({ success: true, message: 'Alert acknowledged' });
  } catch (error) {
    console.error('Acknowledge alert error:', error);
    res.status(500).json({ error: 'Failed to acknowledge alert' });
  }
});

// Delete alert
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

module.exports = router;
