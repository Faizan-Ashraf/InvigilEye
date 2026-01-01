const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let backendServer;
let detectionProcess = null;

// Start the backend server directly in the main process
function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      console.log('Starting backend server in main process...');
      console.log('Platform:', process.platform);
      console.log('isDev:', isDev);
      
      // Get user data path for database
      const userDataPath = app.getPath('userData');
      // In development, backend is started separately via "npm run backend"
      // So we just wait for it and check if it's running
      if (isDev) {
        console.log('Development mode: Waiting for backend to start (started via npm run backend)...');
        const http = require('http');
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds timeout
        
        const checkBackend = () => {
          const testReq = http.get('http://localhost:5001/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log('✅ Backend health check passed:', data);
              resolve();
            });
          });
          
          testReq.on('error', (err) => {
            attempts++;
            if (attempts < maxAttempts) {
              console.log(`Waiting for backend... (${attempts}/${maxAttempts})`);
              setTimeout(checkBackend, 1000);
            } else {
              console.error('❌ Backend not responding after 30 seconds');
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
      console.log('Database will be stored at:', dbPath);
      
      // Set environment variables for backend
      process.env.NODE_ENV = 'production';
      process.env.DB_PATH = dbPath;
      process.env.USER_DATA_PATH = userDataPath;
      
      // Determine backend path
      const backendPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js');
      
      console.log('Loading backend from:', backendPath);
      
      // Change working directory for backend
      const originalCwd = process.cwd();
      const backendDir = path.join(process.resourcesPath, 'app.asar.unpacked');
      
      console.log('Changing cwd to:', backendDir);
      process.chdir(backendDir);
      
      // Pre-check: Try to require sql.js (SQLite via JavaScript)
      try {
        console.log('Testing sql.js...');
        const sqlJsPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js');
        console.log('sql.js path:', sqlJsPath);
        const initSqlJs = require(sqlJsPath);
        console.log('✅ sql.js loaded successfully');
      } catch (sqliteError) {
        console.error('❌ sql.js FAILED to load:', sqliteError.message);
      }
      
      // Require and start the backend server
      try {
        console.log('About to require backend...');
        backendServer = require(backendPath);
        console.log('✅ Backend module loaded');
        
        // Test if backend is actually running
        setTimeout(() => {
          const http = require('http');
          const testReq = http.get('http://localhost:5001/health', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
              console.log('✅ Backend health check passed:', data);
              resolve();
            });
          });
          
          testReq.on('error', (err) => {
            console.error('❌ Backend health check FAILED:', err.message);
            resolve();
          });
          
          testReq.setTimeout(5000);
        }, 3000);
        
      } catch (requireError) {
        console.error('❌ Failed to require backend:', requireError.message);
        process.chdir(originalCwd);
        resolve();
      }
      
    } catch (error) {
      console.error('❌ Failed to start backend:', error);
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
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'InvigilEye - Exam Invigilation System'
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // Dev tools disabled - uncomment below to enable for debugging
    // mainWindow.webContents.openDevTools();
  } else {
    // Fixed path for production build
    const indexPath = path.join(__dirname, '..', 'renderer', 'dist', 'index.html');
    console.log('Loading from:', indexPath);
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load:', err);
    });
    
    // Dev tools disabled in production
    // mainWindow.webContents.openDevTools();
  }

  // Log any console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer Log: ${message}`);
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // Disable right-click context menu
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // Disable F12 and Ctrl+Shift+I to prevent opening dev tools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault();
    }
    if (input.key === 'F12') {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Start backend server first
  console.log('Starting backend server...');
  
  try {
    await startBackendServer();
    console.log('Backend server started, creating window...');
  } catch (error) {
    console.error('CRITICAL: Backend failed to start:', error);
    console.error('App will open anyway to show error...');
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
  console.log('All windows closed');
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  // Clean up: Stop detection process if running
  if (detectionProcess) {
    console.log('App quitting: Force stopping detection process...');
    try {
      detectionProcess.kill('SIGKILL');
    } catch (err) {
      console.error('Error killing detection process on quit:', err);
    }
    detectionProcess = null;
  }
  
  // Backend server closes automatically when process exits
  console.log('App quitting...');
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
ipcMain.handle('start-detection', async (event, examId) => {
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

    console.log('Starting detection from:', detectionScript);
    console.log('Exam ID:', examId);
    console.log('App packaged:', app.isPackaged);
    console.log('Working directory:', cwd);

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
          console.log('Found Python at:', pythonExecutable);
          break;
        }
      }
    }
    
    try {
      // Quote the script path in case it contains spaces
      const quotedScript = `"${detectionScript}"`;
      detectionProcess = spawn(pythonExecutable, [quotedScript, String(examId || 'default')], {
        cwd: cwd,
        stdio: 'pipe',
        detached: false,
        shell: true,
        env: { ...process.env }
      });

      console.log(`Detection process started with PID: ${detectionProcess.pid} using ${pythonExecutable}`);
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
        console.log(`[DETECTION] ${data.toString()}`);
        mainWindow?.webContents.send('detection-output', { type: 'stdout', data: data.toString() });
      });

      // Capture stderr
      detectionProcess.stderr.on('data', (data) => {
        console.error(`[DETECTION ERROR] ${data.toString()}`);
        mainWindow?.webContents.send('detection-output', { type: 'stderr', data: data.toString() });
      });

      // Handle process close
      detectionProcess.on('close', (code) => {
        console.log(`Detection process exited with code ${code}`);
        detectionProcess = null;
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

    console.log('Stopping detection process (PID:', detectionProcess.pid + ')');
    
    // Try to kill gracefully first
    if (!detectionProcess.killed) {
      detectionProcess.kill('SIGTERM');
    }

    // Wait for process to exit, then force kill if needed
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (detectionProcess && !detectionProcess.killed) {
          console.log('Detection process still running, force killing...');
          detectionProcess.kill('SIGKILL');
        } else {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (detectionProcess && !detectionProcess.killed) {
          console.log('Force killing detection process after timeout');
          detectionProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });

    detectionProcess = null;
    return { success: true, message: 'Detection stopped' };
  } catch (error) {
    console.error('Failed to stop detection:', error);
    detectionProcess = null;
    return { success: false, message: error.message };
  }
});

