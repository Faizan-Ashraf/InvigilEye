const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Get attendance for an exam
router.get('/exam/:examId', (req, res) => {
  const query = `
    SELECT * FROM attendance
    WHERE exam_id = ?
    ORDER BY roll_number
  `;
  
  try {
    const attendance = db.prepare(query).all(req.params.examId);
    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark attendance (update status for existing attendance record)
router.post('/', (req, res) => {
  const { exam_id, roll_number, status, snapshot_url } = req.body;

  if (!exam_id || !roll_number || !status) {
    return res.status(400).json({ error: 'exam_id, roll_number, and status are required' });
  }

  // Update attendance status
  const updateQuery = `
    UPDATE attendance 
    SET status = ?, snapshot_url = ?, marked_at = ? 
    WHERE exam_id = ? AND roll_number = ?
  `;
  
  try {
    const timestamp = new Date().toISOString();
    const result = db.prepare(updateQuery).run(
      status, 
      snapshot_url || null, 
      timestamp, 
      exam_id, 
      roll_number
    );

    if (result.changes > 0) {
      res.json({ success: true, message: 'Attendance updated' });
    } else {
      res.status(404).json({ error: 'Attendance record not found' });
    }
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// Bulk mark attendance
router.post('/bulk', (req, res) => {
  const { records } = req.body;

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'Records array is required' });
  }

  const timestamp = new Date().toISOString();
  const query = `
    UPDATE attendance 
    SET status = ?, snapshot_url = ?, marked_at = ? 
    WHERE exam_id = ? AND roll_number = ?
  `;

  try {
    const stmt = db.prepare(query);
    let updated = 0;
    
    for (const record of records) {
      const result = stmt.run(
        record.status, 
        record.snapshot_url || null, 
        timestamp, 
        record.exam_id, 
        record.roll_number
      );
      updated += result.changes;
    }
    
    res.json({ success: true, message: `Bulk attendance updated: ${updated} records`, count: updated });
  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark bulk attendance' });
  }
});

module.exports = router;
