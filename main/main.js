const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const logger = require('./logger');

let mainWindow;
let backendServer;
let detectionProcess = null;
let detectionPidFile = null;

// Helper: Try to force-kill any lingering detector processes by matching script name or window title
function forceKillDetectorByName() {
  try {
    if (process.platform === 'win32') {
      // Kill processes that have an OpenCV window titled 'Cheating Detection' (Windows-specific)
      spawn('taskkill', ['/F', '/FI', 'WINDOWTITLE eq Cheating Detection']);
    } else {
      // POSIX: kill any process whose command line includes the script name
      spawn('pkill', ['-f', 'CheatingDetection.py']);
    }
  } catch (e) {
    logger.warn('Force kill detector by name failed:', e);
  }
} 

// Start the backend server directly in the main process
function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      logger.info('Starting backend server in main process...');
      logger.info('Platform:', process.platform);
      logger.info('isDev:', isDev);
      
      // Get user data path for database
      const userDataPath = app.getPath('userData');
      // In development, backend is started separately via "npm run backend"
      // So we just wait for it and check if it's running
      if (isDev) {
        logger.info('Development mode: Waiting for backend to start (started via npm run backend)...');
        const http = require('http');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        const checkBackend = () => {
          const testReq = http.get('http://localhost:5001/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              logger.info(' Backend health check passed:', data);
              resolve();
            });
          });
          
          testReq.on('error', (err) => {
            attempts++;
            if (attempts < maxAttempts) {
              logger.info(`Waiting for backend... (${attempts}/${maxAttempts})`);
              setTimeout(checkBackend, 1000);
            } else {
              logger.error(' Backend not responding after 30 seconds');
              resolve(); // Still open window even if backend fails
            }
          });
          
          testReq.setTimeout(1000);
        };
        
        checkBackend();
        return;
      }
      
      // Production: Start backend in this process
      const dbPath = path.join(userDataPath, 'invigleye.db');
      logger.info('Database will be stored at:', dbPath);
      
      // Set environment variables for backend
      process.env.NODE_ENV = 'production';
      process.env.DB_PATH = dbPath;
      process.env.USER_DATA_PATH = userDataPath;
      
      // Determine backend path
      const backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js');
      
      logger.info('Loading backend from:', backendPath);
      
      // Change working directory for backend
      const originalCwd = process.cwd();
      const backendDir = path.join(process.resourcesPath, 'app.asar.unpacked');
      
      logger.info('Changing cwd to:', backendDir);
      process.chdir(backendDir);
      
      // Pre-check: Try to require sql.js (SQLite via JavaScript)
      try {
        logger.info('Testing sql.js...');
        const sqlJsPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js');
        logger.debug('sql.js path:', sqlJsPath);
        const initSqlJs = require(sqlJsPath);
        logger.info('sql.js loaded successfully');
      } catch (sqliteError) {
        logger.error(' sql.js FAILED to load:', sqliteError.message);
      }
      
      // Require and start the backend server
      try {
        logger.info('About to require backend...');
        backendServer = require(backendPath);
        logger.info(' Backend module loaded');
        
        // Test if backend is actually running
        setTimeout(() => {
          const http = require('http');
          const testReq = http.get('http://localhost:5001/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              logger.info(' Backend health check passed:', data);
              resolve();
            });
          });
          
          testReq.on('error', (err) => {
            logger.error(' Backend health check FAILED:', err.message);
            resolve();
          });
          
          testReq.setTimeout(5000);
        }, 3000);
        
      } catch (requireError) {
        console.error(' Failed to require backend:', requireError.message);
        process.chdir(originalCwd);
        resolve();
      }
      
    } catch (error) {
      console.error(' Failed to start backend:', error);
      console.error('Stack:', error.stack);
      reject(error);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, '../resources/InvigilEye.png'),
    title: 'InvigilEye - Exam Invigilation System'
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');

    // Automatically open DevTools in development on the right side.
    // Use 'dom-ready' to ensure the renderer has loaded before opening.
    mainWindow.webContents.once('dom-ready', () => {
      try {
        mainWindow.webContents.openDevTools({ mode: 'right' });
      } catch (e) {
        logger.warn('Failed to open DevTools:', e);
      }
    });
  } else {
    // Fixed path for production build
    const indexPath = path.join(__dirname, '..', 'renderer', 'dist', 'index.html');
    logger.info('Loading from:', indexPath);
    
    mainWindow.loadFile(indexPath).catch(err => {
      logger.error('Failed to load:', err);
    });

    // Ensure DevTools remain closed in production
  }

  // Log any console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    logger.info(`Renderer Log: ${message}`);
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    logger.error('Failed to load:', errorCode, errorDescription);
  });

  // Context menu handling:
  // - In development: allow right-click → Inspect Element (useful to debug renderer)
  // - In production: disable context menu for security
  mainWindow.webContents.on('context-menu', (event, params) => {
    if (isDev) {
      // Open DevTools inspector for the element under the cursor
      mainWindow.webContents.inspectElement(params.x, params.y);
    } else {
      event.preventDefault();
    }
  });

  // In production, disable F12 and Ctrl+Shift+I to prevent opening dev tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!isDev) {
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        event.preventDefault();
      }
      if (input.key === 'F12') {
        event.preventDefault();
      }
    }
    // In development we allow these shortcuts so DevTools and Inspect Element work
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Start backend server first
  logger.info('Starting backend server...');
  
  try {
    await startBackendServer();
    logger.info('Backend server started, creating window...');
  } catch (error) {
    logger.error('CRITICAL: Backend failed to start:', error);
    logger.error('App will open anyway to show error...');
    // Continue to create window even if backend fails
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}).catch(error => {
  console.error('FATAL: App failed to start:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  // Backend will stop when app quits (runs in same process)
  logger.info('All windows closed');
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Clean up: Stop detection process if running
  if (detectionProcess) {
    logger.info('App quitting: Force stopping detection process...');
    try {
      if (!detectionProcess.killed) detectionProcess.kill();
      // On Windows, use taskkill to ensure process tree termination
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(detectionProcess.pid), '/T', '/F']);
        // Also try killing by window title as a fallback
        spawn('taskkill', ['/F', '/FI', 'WINDOWTITLE eq Cheating Detection']);
      } else {
        // POSIX: extra fallback
        spawn('pkill', ['-f', 'CheatingDetection.py']);
      }
    } catch (err) {
      console.error('Error killing detection process on quit:', err);
    }

    // Remove PID file if exists
    try {
      if (detectionPidFile && fs.existsSync(detectionPidFile)) fs.unlinkSync(detectionPidFile);
    } catch (e) { /* ignore */ }

    detectionProcess = null;
  }
  
  // Backend server closes automatically when process exits
  logger.info('App quitting...');
});

// IPC Handlers
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('show-notification', (event, { title, body }) => {
  const { Notification } = require('electron');
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// Start cheating detection
ipcMain.handle('start-detection', async (event, examId, cameraIndex) => {
  try {
    if (detectionProcess) {
      return { success: false, message: 'Detection already running' };
    }

    // Get the correct path - in packaged app, use app.asar.unpacked
    let detectionScript;
    let cwd;
    
    if (app.isPackaged) {
      // In packaged app, use the asar unpacked resources
      const resourcePath = path.join(process.resourcesPath, 'app.asar.unpacked');
      detectionScript = path.join(resourcePath, 'core', 'ai', 'pose_estimation', 'CheatingDetection.py');
      cwd = resourcePath;
    } else {
      // In development, use relative paths
      detectionScript = path.join(__dirname, '..', 'core', 'ai', 'pose_estimation', 'CheatingDetection.py');
      cwd = path.join(__dirname, '..');
    }

    logger.info('Starting detection from:', detectionScript);
    logger.debug('Exam ID:', examId);
    logger.debug('App packaged:', app.isPackaged);
    logger.debug('Working directory:', cwd);

    // Find Python executable
    // On Windows, the 'python' command can be a Microsoft Store alias that fails
    // Try to find the actual Python installation
    let pythonExecutable = 'python';
    
    if (process.platform === 'win32') {
      // Common Python installation paths on Windows
      const potentialPaths = [
        'C:\\Python311\\python.exe',
        'C:\\Python310\\python.exe',
        'C:\\Python39\\python.exe',
        path.join(process.env.APPDATA || '', 'Local', 'Programs', 'Python', 'Python311', 'python.exe'),
        path.join(process.env.APPDATA || '', 'Local', 'Programs', 'Python', 'Python310', 'python.exe'),
      ];
      
      // Try to find an existing Python installation
      for (const pythonPath of potentialPaths) {
        if (fs.existsSync(pythonPath)) {
          pythonExecutable = pythonPath;
          logger.info('Found Python at:', pythonExecutable);
          break;
        }
      }
    }
    
    try {
      // Build arguments: script path (no extra quoting) + examId + optional cameraIndex
      const cameraIndex = arguments.length >= 3 ? arguments[2] : undefined;
      const scriptArgs = [detectionScript, String(examId || 'default')];
      if (typeof cameraIndex !== 'undefined' && cameraIndex !== null) {
        scriptArgs.push(String(cameraIndex));
        // Also set env var for safety
        process.env.CAMERA_SOURCE = String(cameraIndex);
      }

      // Spawn without a shell so we get the Python process handle directly (avoids intermediate shell that can survive kills)
      detectionProcess = spawn(pythonExecutable, scriptArgs, {
        cwd: cwd,
        stdio: 'pipe',
        detached: false,
        shell: false,
        env: { ...process.env }
      });

      logger.info(`Detection process started with PID: ${detectionProcess.pid} using ${pythonExecutable}`);
      // Write PID file for extra safety and diagnostics
      try {
        const pidFile = path.join(app.getPath('userData'), `detection_${String(examId || 'default')}.pid`);
        fs.writeFileSync(pidFile, String(detectionProcess.pid));
        detectionPidFile = pidFile;
        logger.debug('Detection PID file written:', pidFile);
      } catch (e) {
        console.warn('Failed to write detection PID file:', e);
      }
      let detectionStarted = true;

      // Handle process error
      let errorOccurred = false;
      detectionProcess.on('error', (err) => {
        errorOccurred = true;
        console.error('Detection process error:', err);
        detectionProcess = null;
        mainWindow?.webContents.send('detection-error', { error: err.message });
      });

      // Capture stdout
      detectionProcess.stdout.on('data', (data) => {
        const text = data.toString();
        logger.info(`[DETECTION] ${text}`);
        mainWindow?.webContents.send('detection-output', { type: 'stdout', data: text });

        // Detect camera open errors reported by the Python script
        if (text.toLowerCase().includes('could not open camera') || text.toLowerCase().includes('camera index out of range')) {
          mainWindow?.webContents.send('detection-error', { error: text.trim() });
          // Also try to stop/kill the process if still running
          try {
            if (detectionProcess && !detectionProcess.killed) detectionProcess.kill();
          } catch (e) { /* ignore */ }
        }
      });

      // Capture stderr
      detectionProcess.stderr.on('data', (data) => {
        const text = data.toString();
        console.error(`[DETECTION ERROR] ${text}`);
        mainWindow?.webContents.send('detection-output', { type: 'stderr', data: text });

        if (text.toLowerCase().includes('could not open camera') || text.toLowerCase().includes('camera index out of range')) {
          mainWindow?.webContents.send('detection-error', { error: text.trim() });
          try {
            if (detectionProcess && !detectionProcess.killed) detectionProcess.kill();
            // Fallback: try to kill by window title / script name
            forceKillDetectorByName();
          } catch (e) { /* ignore */ }
        }
      });

      // Handle process close
      detectionProcess.on('close', (code) => {
        logger.info(`Detection process exited with code ${code}`);
        const exitCode = Number(code);
        detectionProcess = null;
        if (exitCode !== 0) {
          mainWindow?.webContents.send('detection-error', { error: `Detection exited with code ${exitCode}` });
        }
        mainWindow?.webContents.send('detection-stopped', { code });
      });

      return { success: true, pid: detectionProcess.pid };
    } catch (error) {
      console.error('Failed to start detection:', error);
      return { success: false, message: error.message };
    }
  } catch (error) {
    console.error('Start detection handler error:', error);
    return { success: false, message: error.message };
  }
});

// Stop cheating detection
ipcMain.handle('stop-detection', async (event) => {
  try {
    if (!detectionProcess) {
      return { success: true, message: 'No detection process running' };
    }

    const pid = detectionProcess.pid;
    logger.info('Stopping detection process (PID:', pid + ')');

    // Try a graceful kill first (no signal specified - default)
    try {
      if (!detectionProcess.killed) detectionProcess.kill();
    } catch (e) { /* ignore */ }

    // Wait up to 5 seconds for process to exit; if not, force kill (cross-platform)
    const exited = await new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(async () => {
        if (!resolved) {
          try {
            logger.warn('Force killing detection process...', pid);
            if (process.platform === 'win32') {
              // Use taskkill to terminate process tree on Windows
              const killer = spawn('taskkill', ['/PID', String(pid), '/T', '/F']);
              killer.on('close', () => resolve(true));
            } else {
              // POSIX: send SIGKILL
              try { process.kill(pid, 'SIGKILL'); } catch (err) { /* ignore */ }
              resolve(true);
            }
          } catch (err) {
            resolve(false);
          }
          resolved = true;
        }
      }, 5000);

      detectionProcess.on('close', () => {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          resolve(true);
        }
      });
    });

    // If PID file exists, remove it
    try {
      if (detectionPidFile && fs.existsSync(detectionPidFile)) {
        fs.unlinkSync(detectionPidFile);
        detectionPidFile = null;
      }
    } catch (e) {
      console.warn('Failed to remove PID file:', e);
    }

    // As a final safety net, try to kill by script name / window title
    try {
      forceKillDetectorByName();
    } catch (e) { /* ignore */ }

    detectionProcess = null;
    return { success: true, message: 'Detection stopped' };
  } catch (error) {
    console.error('Failed to stop detection:', error);
    detectionProcess = null;
    // Try cleanup anyway
    try {
      if (detectionPidFile && fs.existsSync(detectionPidFile)) fs.unlinkSync(detectionPidFile);
      forceKillDetectorByName();
    } catch (e) { /* ignore */ }
    return { success: false, message: error.message };
  }
});

