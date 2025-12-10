const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// Store active detection processes
const activeDetections = new Map();

// Start cheating detection for an exam
router.post('/start-detection', (req, res) => {
  try {
    const { examId, studentId } = req.body;
    
    if (!examId || !studentId) {
      return res.status(400).json({ error: 'examId and studentId are required' });
    }

    // Check if detection already running for this exam
    if (activeDetections.has(examId)) {
      return res.status(400).json({ error: 'Detection already running for this exam' });
    }

    // Spawn Python cheating detection process directly
    const pythonScript = path.join(__dirname, '..', '..', 'core', 'ai', 'pose_estimation', 'CheatingDetection.py');
    console.log(`[Monitoring] Starting detection for exam ${examId}`);
    console.log(`[Monitoring] Python script: ${pythonScript}`);
    
    const pythonProcess = spawn('python', [pythonScript], {
      cwd: path.join(__dirname, '..', '..', 'core', 'ai', 'pose_estimation'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store process reference
    activeDetections.set(examId, pythonProcess);
    console.log(`[Monitoring] Process spawned with PID: ${pythonProcess.pid}`);

    // Log Python stdout
    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Detection ${examId}] ${data.toString()}`);
    });

    // Log Python stderr (important for debugging)
    pythonProcess.stderr.on('data', (data) => {
      console.log(`[Detection ${examId}] STDERR: ${data.toString()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`[Detection ${examId}] Process exited with code ${code}`);
      activeDetections.delete(examId);
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Detection ${examId}] Process error:`, err);
      activeDetections.delete(examId);
    });

    res.json({ 
      success: true, 
      message: 'Detection started',
      pid: pythonProcess.pid
    });
  } catch (error) {
    console.error('Error starting detection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop cheating detection for an exam
router.post('/stop-detection', (req, res) => {
  try {
    const { examId } = req.body;
    
    if (!examId) {
      return res.status(400).json({ error: 'examId is required' });
    }

    const pythonProcess = activeDetections.get(examId);
    if (!pythonProcess) {
      console.log(`[Monitoring] No detection process found for exam ${examId}`);
      console.log(`[Monitoring] Active exams: ${Array.from(activeDetections.keys()).join(', ')}`);
      return res.status(400).json({ error: 'No detection running for this exam' });
    }

    console.log(`[Monitoring] Stopping detection for exam ${examId} (PID: ${pythonProcess.pid})`);
    
    // Kill the process
    pythonProcess.kill('SIGTERM');
    
    // Give it time to cleanup, then force kill if needed
    setTimeout(() => {
      if (!pythonProcess.killed) {
        console.log(`[Monitoring] Force killing process ${pythonProcess.pid}`);
        pythonProcess.kill('SIGKILL');
      }
    }, 2000);
    
    activeDetections.delete(examId);

    res.json({ success: true, message: 'Detection stopped' });
  } catch (error) {
    console.error('Error stopping detection:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get snapshots for an exam - they will be saved by CheatingDetection.py in snapshots/{examId}/ folder
router.get('/snapshots/:examId', (req, res) => {
  try {
    const { examId } = req.params;
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));

    if (!fs.existsSync(snapshotFolder)) {
      return res.json({ snapshots: [] });
    }

    const files = fs.readdirSync(snapshotFolder);
    const snapshots = files
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .map(f => ({
        filename: f,
        url: `/api/monitoring/snapshot/${examId}/${f}`
      }))
      .sort((a, b) => b.filename.localeCompare(a.filename)); // Most recent first

    res.json({ snapshots });
  } catch (error) {
    console.error('Error getting snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific snapshot
router.get('/snapshot/:examId/:filename', (req, res) => {
  try {
    const { examId, filename } = req.params;
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));
    const filePath = path.join(snapshotFolder, filename);

    // Verify the file is in the snapshot folder (security check)
    if (!path.resolve(filePath).startsWith(path.resolve(snapshotFolder))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    console.error('Error getting snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete all snapshots for an exam (called when exam ends)
router.delete('/snapshots/:examId', (req, res) => {
  try {
    const { examId } = req.params;
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));

    if (fs.existsSync(snapshotFolder)) {
      // Remove the entire folder
      fs.rmSync(snapshotFolder, { recursive: true, force: true });
      console.log(`[Monitoring] Deleted snapshots folder for exam ${examId}`);
    }

    res.json({ success: true, message: 'Snapshots deleted' });
  } catch (error) {
    console.error('Error deleting snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
