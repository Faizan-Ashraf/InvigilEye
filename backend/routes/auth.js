const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

// Login endpoint
router.post('/login', (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    const query = 'SELECT * FROM users WHERE username = ? AND password = ? AND role = ?';
    const user = db.prepare(query).get(username, password, role);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token: 'mock-jwt-token-' + user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Invigilator login endpoint (email-based)
router.post('/login-invigilator', (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log('Invigilator login attempt for:', email);

    // Try to find existing user by email or username
    const existing = db.prepare('SELECT id, username, full_name, email, role FROM users WHERE email = ? OR username = ?').get(email, email);

    if (existing) {
      if (existing.role !== 'invigilator') {
        return res.status(403).json({ error: 'User exists but is not an invigilator' });
      }

      return res.json({ success: true, user: existing, token: 'mock-jwt-token-' + existing.id });
    }

    const isDev = process.env.NODE_ENV !== 'production';

    // In production, fall back to a static allowed list (existing behavior) and do not auto-create users
    if (!isDev) {
      const validEmails = [
        'admin@ucp.edu.pk',
        'abidbashir@ucp.edu.pk',
        'ahsan.azhar@ucp.edu.pk',
        'zahid.hussain@ucp.edu.pk',
        'zain.asghar@ucp.edu.pk',
        'saad.ali@ucp.edu.pk'
      ];

      if (!validEmails.includes(email)) {
        return res.status(401).json({ error: 'Email not authorized' });
      }

      // Return a mock user without creating a DB entry
      const mockUser = { id: email, email, full_name: email.split('@')[0], role: 'invigilator' };
      return res.json({ success: true, user: mockUser, token: 'mock-jwt-token-' + email });
    }

    // Development: auto-create an invigilator user so any email can be used to log in locally
    const username = email;
    const full_name = email.split('@')[0];

    try {
      const insertRes = db.prepare('INSERT INTO users (username, password, role, full_name, email) VALUES (?, ?, ?, ?, ?)').run(username, 'invigilator', 'invigilator', full_name, email);
      const newId = insertRes && insertRes.lastInsertRowid ? insertRes.lastInsertRowid : username;
      const newUser = db.prepare('SELECT id, username, full_name, email, role FROM users WHERE id = ?').get(newId);

      console.log('Created invigilator user:', newUser);
      return res.json({ success: true, user: newUser, token: 'mock-jwt-token-' + newUser.id });
    } catch (insertErr) {
      console.error('Failed to create invigilator user:', insertErr);
      // If insert fails for any reason, fallback to returning a mock user (still usable for dev)
      const fallbackUser = { id: email, email, full_name, role: 'invigilator' };
      return res.json({ success: true, user: fallbackUser, token: 'mock-jwt-token-' + email });
    }
  } catch (error) {
    console.error('Invigilator login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get all invigilators
router.get('/invigilators', (req, res) => {
  try {
    const query = 'SELECT id, username, full_name, email FROM users WHERE role = ?';
    const invigilators = db.prepare(query).all('invigilator');
    res.json(invigilators);
  } catch (error) {
    console.error('Get invigilators error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
