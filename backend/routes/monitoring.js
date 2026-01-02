const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');
const logger = require('../logger');

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
    logger.info(`[Monitoring] Starting detection for exam ${examId}`);
    logger.debug(`[Monitoring] Python script: ${pythonScript}`);
    
    // Pass examId as a CLI argument so the Python process saves snapshots under snapshots/{examId}
    const pythonProcess = spawn('python', [pythonScript, String(examId)], {
      cwd: path.join(__dirname, '..', '..', 'core', 'ai', 'pose_estimation'),
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store process reference
    activeDetections.set(examId, pythonProcess);
    logger.info(`[Monitoring] Process spawned with PID: ${pythonProcess.pid}`);

    // Create snapshots folder and write a PID file for diagnostics
    try {
      const snapshotsDir = path.join(__dirname, '..', '..', 'snapshots', String(examId));
      fs.mkdirSync(snapshotsDir, { recursive: true });
      const pidFile = path.join(snapshotsDir, 'detection.pid');
      fs.writeFileSync(pidFile, String(pythonProcess.pid));
      pythonProcess.pidFile = pidFile;
      logger.debug(`[Monitoring] PID file written: ${pidFile}`);
    } catch (e) {
      logger.warn('[Monitoring] Failed to write PID file:', e);
    }

    // Log Python stdout
    pythonProcess.stdout.on('data', (data) => {
      logger.info(`[Detection ${examId}] ${data.toString()}`);
    });

    // Log Python stderr (important for debugging)
    pythonProcess.stderr.on('data', (data) => {
      const text = data.toString();
      logger.warn(`[Detection ${examId}] STDERR: ${text}`);
      if (text.toLowerCase().includes('could not open camera') || text.toLowerCase().includes('camera index out of range')) {
        // Try to kill process gracefully and use our fallbacks
        try { if (!pythonProcess.killed) pythonProcess.kill(); } catch (e) { /* ignore */ }
        try {
          if (os.platform() === 'win32') {
            spawn('taskkill', ['/F', '/FI', 'WINDOWTITLE eq Cheating Detection']);
          } else {
            spawn('pkill', ['-f', 'CheatingDetection.py']);
          }
        } catch (e) { /* ignore */ }
      }
    });

    pythonProcess.on('close', (code) => {
      logger.info(`[Detection ${examId}] Process exited with code ${code}`);
      activeDetections.delete(examId);
    });

    pythonProcess.on('error', (err) => {
      logger.error(`[Detection ${examId}] Process error:`, err);
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
      logger.info(`[Monitoring] No detection process found for exam ${examId}`);
      logger.debug(`[Monitoring] Active exams: ${Array.from(activeDetections.keys()).join(', ')}`);
      return res.status(400).json({ error: 'No detection running for this exam' });
    }

    logger.info(`[Monitoring] Stopping detection for exam ${examId} (PID: ${pythonProcess.pid})`);

    // Try graceful kill first
    try {
      if (!pythonProcess.killed) pythonProcess.kill();
    } catch (e) { /* ignore */ }

    // After timeout, force kill cross-platform if still alive
    setTimeout(() => {
      if (!pythonProcess.killed) {
        logger.warn(`[Monitoring] Force killing process ${pythonProcess.pid}`);
        if (os.platform() === 'win32') {
          // Use taskkill on Windows: attempt to kill by PID and any window titled 'Cheating Detection'
          const killer = spawn('taskkill', ['/PID', String(pythonProcess.pid), '/T', '/F']);
          killer.on('close', () => {
            // As an extra fallback try to kill any process with the OpenCV window title
            spawn('taskkill', ['/F', '/FI', 'WINDOWTITLE eq Cheating Detection']);
            activeDetections.delete(examId);
            // Remove pid file if present
            try { if (pythonProcess.pidFile && fs.existsSync(pythonProcess.pidFile)) fs.unlinkSync(pythonProcess.pidFile); } catch (e) { logger.warn('Failed to remove pidFile after force kill:', e); }
          });
        } else {
          try { pythonProcess.kill('SIGKILL'); } catch (err) { /* ignore */ }
          // POSIX fallback: kill any process whose command line references the script
          try { spawn('pkill', ['-f', 'CheatingDetection.py']); } catch (e) { /* ignore */ }
          activeDetections.delete(examId);
          try { if (pythonProcess.pidFile && fs.existsSync(pythonProcess.pidFile)) fs.unlinkSync(pythonProcess.pidFile); } catch (e) { logger.warn('Failed to remove pidFile:', e); }
        }
      } else {
        activeDetections.delete(examId);
        try { if (pythonProcess.pidFile && fs.existsSync(pythonProcess.pidFile)) fs.unlinkSync(pythonProcess.pidFile); } catch (e) { /* ignore */ }
      }
    }, 2000);

    res.json({ success: true, message: 'Detection stopped' });
  } catch (error) {
    logger.error('Error stopping detection:', error);
  }
});

// Get snapshots for an exam - they will be saved by CheatingDetection.py in snapshots/{examId}/ folder
router.get('/snapshots/:examId', (req, res) => {
  try {
    const { examId } = req.params;
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));
    const coreSnapshotFolder = path.join(__dirname, '..', '..', 'core', 'snapshots', String(examId));

    // Prefer project-level snapshots folder; if missing, fallback to core snapshots folder
    let finalFolder = snapshotFolder;
    if (!fs.existsSync(finalFolder) && fs.existsSync(coreSnapshotFolder)) {
      finalFolder = coreSnapshotFolder;
    }

    if (!fs.existsSync(finalFolder)) {
      return res.json({ snapshots: [] });
    }

    const files = fs.readdirSync(finalFolder);
    const snapshots = files
      .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
      .map(f => ({
        filename: f,
        url: `/api/monitoring/snapshot/${examId}/${f}`
      }))
      .sort((a, b) => b.filename.localeCompare(a.filename)); // Most recent first

    res.json({ snapshots });
  } catch (error) {
    logger.error('Error getting snapshots:', error);
  }
});

// Get a specific snapshot
router.get('/snapshot/:examId/:filename', (req, res) => {
  try {
    const { examId, filename } = req.params;
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));
    const coreSnapshotFolder = path.join(__dirname, '..', '..', 'core', 'snapshots', String(examId));

    // Prefer project-level snapshots folder; fallback to core snapshots if needed
    let finalFolder = snapshotFolder;
    if (!fs.existsSync(finalFolder) && fs.existsSync(coreSnapshotFolder)) finalFolder = coreSnapshotFolder;

    const filePath = path.join(finalFolder, filename);

    // Verify the file is in the final snapshot folder (security check)
    if (!path.resolve(filePath).startsWith(path.resolve(finalFolder))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error getting snapshot:', error);
  }
});

// Open snapshot folder in OS file explorer (useful for quick access)
router.get('/open-snapshots/:examId', (req, res) => {
  try {
    const { examId } = req.params;
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));

    if (!fs.existsSync(snapshotFolder)) {
      return res.status(404).json({ error: 'Snapshot folder not found' });
    }

    // Cross-platform open
    if (os.platform() === 'win32') {
      spawn('explorer', [snapshotFolder]);
    } else if (os.platform() === 'darwin') {
      spawn('open', [snapshotFolder]);
    } else {
      spawn('xdg-open', [snapshotFolder]);
    }

    res.json({ success: true, message: 'Opening folder' });
  } catch (error) {
    logger.error('Error opening snapshot folder:', error);
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
      logger.info(`[Monitoring] Deleted snapshots folder for exam ${examId}`);
    }

    res.json({ success: true, message: 'Snapshots deleted' });
  } catch (error) {
    logger.error('Error deleting snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

// Diagnostic route - check if detection is running and list snapshot files
router.get('/status/:examId', (req, res) => {
  try {
    const { examId } = req.params;
    const running = activeDetections.has(examId);
    const processRef = activeDetections.get(examId);

    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));
    const coreSnapshotFolder = path.join(__dirname, '..', '..', 'core', 'snapshots', String(examId));

    // Prefer project-level snapshots folder; fallback to core snapshots if needed
    let finalFolder = snapshotFolder;
    if (!fs.existsSync(finalFolder) && fs.existsSync(coreSnapshotFolder)) finalFolder = coreSnapshotFolder;

    const pidFile = path.join(finalFolder, 'detection.pid');

    let snapshots = [];
    if (fs.existsSync(finalFolder)) {
      snapshots = fs.readdirSync(finalFolder).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    }

    res.json({
      examId,
      running,
      pid: processRef ? processRef.pid : null,
      pidFileExists: fs.existsSync(pidFile),
      snapshotFolderExists: fs.existsSync(finalFolder),
      snapshotCount: snapshots.length,
      snapshots: snapshots.slice(0, 50), // return up to first 50 names
    });
  } catch (error) {
    logger.error('Error in status route:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper: stop detection and clean snapshots for a specific exam
const stopDetectionForExam = (examId) => {
  try {
    const pidStr = String(examId);
    const pythonProcess = activeDetections.get(pidStr) || activeDetections.get(Number(examId));
    if (pythonProcess) {
      logger.info(`[Monitoring] Stopping detection process for exam ${examId} (PID: ${pythonProcess.pid})`);
      try { if (!pythonProcess.killed) pythonProcess.kill(); } catch (e) { /* ignore */ }
      // Try cross-platform force kill as an extra safety
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/PID', String(pythonProcess.pid), '/T', '/F']);
        } else {
          try { pythonProcess.kill('SIGKILL'); } catch (err) { /* ignore */ }
          spawn('pkill', ['-f', 'CheatingDetection.py']);
        }
      } catch (e) { /* ignore */ }
      activeDetections.delete(pidStr);
    }

    // Remove snapshots folder in project-level and core-level paths
    const snapshotFolder = path.join(__dirname, '..', '..', 'snapshots', String(examId));
    const coreSnapshotFolder = path.join(__dirname, '..', '..', 'core', 'snapshots', String(examId));

    if (fs.existsSync(snapshotFolder)) {
      try {
        fs.rmSync(snapshotFolder, { recursive: true, force: true });
        logger.info(`[Monitoring] Deleted snapshots folder: ${snapshotFolder}`);
      } catch (e) {
        logger.warn(`[Monitoring] Failed to delete snapshots folder ${snapshotFolder}:`, e);
      }
    }

    if (fs.existsSync(coreSnapshotFolder)) {
      try {
        fs.rmSync(coreSnapshotFolder, { recursive: true, force: true });
        logger.info(`[Monitoring] Deleted core snapshots folder: ${coreSnapshotFolder}`);
      } catch (e) {
        logger.warn(`[Monitoring] Failed to delete core snapshots folder ${coreSnapshotFolder}:`, e);
      }
    }

    return true;
  } catch (error) {
    logger.error('Error in stopDetectionForExam:', error);
    return false;
  }
};

// Attach helpers to router so they can be used by server tasks
router.stopDetectionForExam = stopDetectionForExam;

module.exports = router;
