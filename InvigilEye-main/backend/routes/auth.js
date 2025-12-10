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

    // For invigilator login, we just validate the email is in our list
    // and return a mock user object
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

    res.json({
      success: true,
      user: {
        id: email,
        email: email,
        full_name: email.split('@')[0],
        role: 'invigilator'
      },
      token: 'mock-jwt-token-' + email
    });
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
