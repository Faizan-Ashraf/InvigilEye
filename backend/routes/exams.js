const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// File filter for CSV only
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Get all exams
router.get('/', (req, res) => {
  const query = `
    SELECT * FROM exams
    ORDER BY created_at DESC
  `;
  
  try {
    const exams = db.prepare(query).all();
    res.json(exams);
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get exams by invigilator email
router.get('/invigilator/:email', (req, res) => {
  const query = `
    SELECT * FROM exams
    WHERE invigilator_email = ?
    ORDER BY exam_date DESC
  `;
  
  try {
    const exams = db.prepare(query).all(req.params.email);
    res.json(exams);
  } catch (error) {
    console.error('Get exams by invigilator error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single exam
router.get('/:id', (req, res) => {
  const query = `
    SELECT * FROM exams
    WHERE id = ?
  `;
  
  try {
    const exam = db.prepare(query).get(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(exam);
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create exam
router.post('/', upload.single('studentCsv'), async (req, res) => {
  const { title, department, venue, exam_date, exam_time, end_time, section, invigilator_email } = req.body;

  // Log incoming request for debugging (file info, body). In production, keep logs minimal.
  try {
    console.log('Create exam request received. body:', req.body);
    if (req.file) console.log('Uploaded file info:', { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size, path: req.file.path });
  } catch (e) { /* ignore logging errors */ }

  if (!title || !venue || !exam_date || !exam_time) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check 1: Room conflict - same room, section, date, and time
    const roomConflictQuery = `
      SELECT id, title, venue, section, exam_date, exam_time 
      FROM exams 
      WHERE venue = ? 
        AND exam_date = ? 
        AND exam_time = ?
        AND (section = ? OR (section IS NULL AND ? IS NULL))
    `;
    
    const roomConflict = db.prepare(roomConflictQuery).get(venue, exam_date, exam_time, section, section);
    
    if (roomConflict) {
      const conflictDetails = `Room conflict: "${roomConflict.title}" is already scheduled in ${roomConflict.venue}${roomConflict.section ? ` (Section ${roomConflict.section})` : ''} on ${roomConflict.exam_date} at ${roomConflict.exam_time}. Please choose a different room, section, or time.`;
      return res.status(409).json({ 
        error: 'Room scheduling conflict',
        message: conflictDetails,
        conflict: roomConflict
      });
    }

    // Check 2: Class conflict - same course/class at the same time
    const classConflictQuery = `
      SELECT id, title, venue, section, exam_date, exam_time 
      FROM exams 
      WHERE title = ? 
        AND exam_date = ? 
        AND exam_time = ?
    `;
    
    const classConflict = db.prepare(classConflictQuery).get(title, exam_date, exam_time);
    
    if (classConflict) {
      const conflictDetails = `Class conflict: "${classConflict.title}" already has an exam scheduled at ${classConflict.exam_time} on ${classConflict.exam_date} in ${classConflict.venue}${classConflict.section ? ` (Section ${classConflict.section})` : ''}. A class cannot have multiple exams at the same time.`;
      return res.status(409).json({ 
        error: 'Class scheduling conflict',
        message: conflictDetails,
        conflict: classConflict
      });
    }

    const query = `
      INSERT INTO exams (title, department, venue, exam_date, exam_time, end_time, section, invigilator_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = db.prepare(query).run(
      title, 
      department || null, 
      venue, 
      exam_date, 
      exam_time, 
      end_time || null, 
      section || null, 
      invigilator_email || null
    );
    const examId = result.lastInsertRowid;

    // Process CSV if uploaded
    if (req.file) {
      const students = [];
      const filePath = req.file.path;
      
      // Wrap CSV processing in a promise
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv({ trim: true, skip_empty_lines: true })) // Trim whitespace from values
          .on('data', (row) => {
            // Normalize keys to be robust against different CSV header formats and BOM
            const normalized = {};
            for (const [key, value] of Object.entries(row)) {
              const k = key.toLowerCase().replace(/\uFEFF/g, '').trim();
              normalized[k] = (value || '').toString().trim();
            }

            students.push({
              roll_number: normalized.roll_number || normalized.rollnumber || normalized['roll number'] || '',
              name: normalized.name || normalized['full name'] || normalized['student name'] || '',
              image_url: normalized.image_path || normalized.imageurl || normalized['image path'] || ''
            });
          })
          .on('end', () => {
            try {
              // Insert students and create attendance records
              if (students.length > 0) {
                const studentQuery = 'INSERT INTO students (exam_id, roll_number, name, image_url) VALUES (?, ?, ?, ?)';
                const attendanceQuery = 'INSERT INTO attendance (exam_id, roll_number, name, image_url, status) VALUES (?, ?, ?, ?, ?)';
                
                const studentStmt = db.prepare(studentQuery);
                const attendanceStmt = db.prepare(attendanceQuery);
                
                for (const student of students) {
                  if (student.roll_number && student.name) {
                    // Insert into students table
                    studentStmt.run(examId, student.roll_number, student.name, student.image_url);
                    
                    // Create attendance record with 'absent' as default status
                    attendanceStmt.run(examId, student.roll_number, student.name, student.image_url, 'absent');
                  }
                }
                
                console.log(` Created ${students.length} students and attendance records for exam ${examId}`);
              }
              
              // Delete uploaded file after successful processing
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              
              resolve(students.length);
            } catch (error) {
              console.error('Insert students error:', error);
              
              // Clean up file on error
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
              
              reject(error);
            }
          })
          .on('error', (error) => {
            console.error('CSV parsing error:', error);
            
            // Clean up file on CSV parsing error
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            
            reject(error);
          });
      });
      
      res.json({ success: true, id: examId, message: `Exam created with ${students.length} students` });
    } else {
      res.json({ success: true, id: examId, message: 'Exam created' });
    }
  } catch (error) {
    console.error('Create exam error:', error);
    console.error('Error details:', error.message);
    console.error('Request body:', req.body);
    const payload = { error: 'Failed to create exam', details: error.message };
    // When not in production, include stack for easier debugging (covers cases where NODE_ENV isn't explicitly set)
    if (process.env.NODE_ENV !== 'production') payload.stack = error.stack;
    res.status(500).json(payload);
  }
});

// Update exam
router.put('/:id', (req, res) => {
  const { title, department, venue, exam_date, exam_time, end_time, section, invigilator_email, status } = req.body;
  
  const query = `
    UPDATE exams 
    SET title = ?, department = ?, venue = ?, exam_date = ?, exam_time = ?, end_time = ?, section = ?, invigilator_email = ?, status = ?
    WHERE id = ?
  `;

  try {
    db.prepare(query).run(
      title, 
      department, 
      venue, 
      exam_date, 
      exam_time, 
      end_time, 
      section, 
      invigilator_email, 
      status, 
      req.params.id
    );
    res.json({ success: true, message: 'Exam updated' });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({ error: 'Failed to update exam' });
  }
});

// Delete exam
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Exam deleted' });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({ error: 'Failed to delete exam' });
  }
});

// Start exam (kept for API compatibility but doesn't change status)
router.post('/:id/start', (req, res) => {
  try {
    // No status change needed - exam stays as 'scheduled'
    res.json({ success: true, message: 'Exam can be started' });
  } catch (error) {
    console.error('Start exam error:', error);
    res.status(500).json({ error: 'Failed to start exam' });
  }
});

// End exam (changes status from 'scheduled' to 'completed')
router.post('/:id/end', (req, res) => {
  try {
    db.prepare('UPDATE exams SET status = ? WHERE id = ?').run('completed', req.params.id);
    res.json({ success: true, message: 'Exam completed' });
  } catch (error) {
    console.error('End exam error:', error);
    res.status(500).json({ error: 'Failed to end exam' });
  }
});

// Get students for an exam
router.get('/:id/students', (req, res) => {
  const query = 'SELECT * FROM students WHERE exam_id = ?';
  
  try {
    const students = db.prepare(query).all(req.params.id);
    res.json(students);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
