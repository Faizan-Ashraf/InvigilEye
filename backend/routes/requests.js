const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get all requests
router.get('/', (req, res) => {
  const query = `
    SELECT 
      r.*,
      e.title as exam_title,
      e.venue as exam_venue,
      e.section as exam_section,
      e.exam_date,
      e.exam_time,
      e.end_time,
      e.department as exam_department,
      e.invigilator_email
    FROM requests r
    LEFT JOIN exams e ON r.exam_id = e.id
    ORDER BY r.created_at DESC
  `;
  
  try {
    const requests = db.prepare(query).all();
    res.json(requests);
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get requests by exam
router.get('/exam/:examId', (req, res) => {
  const query = 'SELECT * FROM requests WHERE exam_id = ? ORDER BY created_at DESC';
  
  try {
    const requests = db.prepare(query).all(req.params.examId);
    res.json(requests);
  } catch (error) {
    console.error('Get requests by exam error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create request
router.post('/', (req, res) => {
  const { exam_id, type, description } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Type is required' });
  }

  const query = 'INSERT INTO requests (exam_id, type, description) VALUES (?, ?, ?)';

  try {
    const result = db.prepare(query).run(exam_id || null, type, description || '');
    res.json({ success: true, id: result.lastInsertRowid, message: 'Request created' });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// Update request status
router.put('/:id', (req, res) => {
  const { status } = req.body;
  const resolved_at = status === 'resolved' ? new Date().toISOString() : null;

  const query = 'UPDATE requests SET status = ?, resolved_at = ? WHERE id = ?';

  try {
    db.prepare(query).run(status, resolved_at, req.params.id);
    res.json({ success: true, message: 'Request updated' });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
});

// Delete request
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM requests WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Request deleted' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ error: 'Failed to delete request' });
  }
});

module.exports = router;
