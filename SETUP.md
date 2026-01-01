# InvigilEye Setup Guide

This guide provides step-by-step instructions to get InvigilEye running on your system. Choose the method that best suits your needs.

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation Methods](#installation-methods)
3. [Post-Installation](#post-installation)
4. [Development Setup](#development-setup)
5. [Building for Release](#building-for-release)
6. [Environment Configuration](#environment-configuration)
7. [Troubleshooting](#troubleshooting)
8. [Uninstallation](#uninstallation)

---

## 🖥 System Requirements

### Minimum Specifications
| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, macOS 10.12+, Linux (Ubuntu 18.04+) |
| **RAM** | 4 GB minimum (8 GB recommended) |
| **Disk Space** | 2 GB free space |
| **CPU** | Dual-core (Intel i5 or AMD Ryzen 5 equivalent) |
| **Webcam** | Required for monitoring (1080p+ recommended) |
| **Internet** | Required for first-time setup and updates |

### Software Prerequisite Versions
- **Node.js**: 16.0.0 or higher ([Download](https://nodejs.org/))
- **npm**: 8.0.0+ (comes with Node.js)
- **Python**: 3.8+ ([Download](https://www.python.org/))
- **Git**: 2.0+ (optional, for cloning from GitHub)

### For Building from Source
- **Windows**: Visual C++ Build Tools or Visual Studio 2019+
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `build-essential`, `python3-dev` (`sudo apt-get install build-essential python3-dev`)

---

## 📦 Installation Methods

### Method 1: Windows Executable (Recommended for End Users)

**Easiest way to get started on Windows**

#### Step 1: Download
1. Go to [GitHub Releases](https://github.com/YOUR-USERNAME/InvigilEye/releases)
2. Download `InvigilEye-Setup-1.0.0.exe` (latest version)
3. Save to a known location (e.g., Desktop or Downloads)

#### Step 2: Install
1. Double-click `InvigilEye-Setup-1.0.0.exe`
2. Windows may show a security prompt - click "More info" → "Run anyway"
3. Choose installation directory (default: `C:\Program Files\InvigilEye`)
4. Optionally check "Create Start Menu shortcut"
5. Wait for installation to complete (~2-3 minutes)

#### Step 3: First Launch
1. Click "Launch InvigilEye" at end of installer, or
2. Open Start Menu → Search "InvigilEye" → Click
3. Grant any permission prompts (webcam, file access)
4. Application will initialize database on first run

#### Step 4: Login
- **Admin**:
  - Username: `admin`
  - Password: `admin123`
  - ⚠️ Change password immediately after first login
- **Invigilator**: Ask admin to create your account

**That's it!** The application is ready to use.

---

### Method 2: Install from Source (Windows/Mac/Linux)

**Best for developers and advanced users**

#### Step 1: Prerequisites Installation

**Windows:**
```powershell
# Install Node.js from https://nodejs.org/
# Install Python 3.8+ from https://www.python.org/
# Install Visual C++ Build Tools (required for native modules)

# Verify installations
node --version      # Should be v16 or higher
npm --version       # Should be 8 or higher
python --version    # Should be 3.8 or higher
```

**macOS:**
```bash
# Install Node.js (using Homebrew recommended)
brew install node

# Install Xcode Command Line Tools
xcode-select --install

# Install Python (usually pre-installed)
python3 --version

# Verify
node --version
npm --version
python3 --version
```

**Linux (Ubuntu/Debian):**
```bash
# Update package manager
sudo apt-get update

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python
sudo apt-get install -y python3 python3-pip python3-dev

# Install build tools
sudo apt-get install -y build-essential

# Verify
node --version
npm --version
python3 --version
```

#### Step 2: Clone Repository

```bash
# Using Git
git clone https://github.com/YOUR-USERNAME/InvigilEye.git
cd InvigilEye

# Or download and extract ZIP from GitHub
# Then navigate to the extracted folder
cd InvigilEye-main
```

#### Step 3: Install Dependencies

```bash
# Install Node.js dependencies
npm install

# This will also run postinstall script to install Electron app dependencies
```

#### Step 4: Install Python Dependencies

```bash
# Using pip (recommended)
pip install -r requirements.txt

# Or if you use Python 3 specifically:
pip3 install -r requirements.txt
```

**Expected Python Packages**:
- opencv-python (computer vision)
- mediapipe (pose estimation)
- ultralytics (YOLOv8 detection)
- numpy, pandas (data processing)
- pillow (image processing)

#### Step 5: Verify Installation

```bash
# Check Node modules
ls node_modules | grep -E "electron|react|express"

# Check Python packages
python -m pip list | grep -E "opencv|mediapipe|ultralytics"
```

---

## 🚀 Post-Installation

### Step 1: Start Development Environment

```bash
# This starts all services automatically:
npm run dev
```

This command:
1. Starts **React dev server** (http://localhost:3000)
2. Starts **Express backend** (http://localhost:5001)
3. Launches **Electron app** after both are ready
4. Enables hot-reload on file changes

**Expected Console Output**:
```
[0] VITE v5.4.21 ready in 798 ms
[0] ➜  Local:   http://localhost:3000/
[1] ✅ InvigilEye Backend running on http://localhost:5001
[2] ✓ Electron app ready
```

### Step 2: Initial Login

1. **Admin Login**:
   - Username: `admin`
   - Password: `admin123`
   - Click "Admin Login"

2. **First-Time Actions**:
   - Change admin password (recommended)
   - Create invigilator accounts
   - Upload exam schedules
   - Assign invigilators to exams

### Step 3: Configure Webcam

1. Go to Settings (if available)
2. Select camera input device
3. Test camera feed
4. Adjust resolution (1080p recommended)

### Step 4: Database Initialization

Database is initialized automatically with:
- Admin user account
- Database tables (exams, students, attendance, etc.)
- Required directories (snapshots, uploads)

**Database Location**:
- **Packaged App**: `C:\Users\{Username}\AppData\Roaming\InvigilEye\invigleye.db`
- **Development**: `./db/invigleye.db`

---

## 👨‍💻 Development Setup

### Running Individual Services

**Terminal 1 - Backend Only**:
```bash
npm run backend
```
Starts Express server on http://localhost:5001

**Terminal 2 - Frontend Only**:
```bash
npm run react:dev
```
Starts Vite dev server on http://localhost:3000

**Terminal 3 - Electron**:
```bash
# After other services are running
npm run electron:dev
```

### File Watching & Hot Reload

Changes to these files trigger automatic reload:
- React components (`.jsx`, `.js`)
- Tailwind CSS (`tailwind.config.js`)
- Backend routes (`backend/routes/*.js`)
- Main process (`main/main.js`)

**Note**: Python files require manual restart of detection process.

### Using VS Code

1. Open folder in VS Code
2. Install recommended extensions:
   - ES7+ React/Redux/React-Native snippets
   - Tailwind CSS IntelliSense
   - Prettier
   - Python

3. Open integrated terminal: `` Ctrl+` ``
4. Run: `npm run dev`

---

## 🏗 Building for Release

### Windows Build

```bash
# Build React and package with Electron Builder
npm run build:win
```

**Output**: `dist/InvigilEye-1.0.0.exe` (~150 MB)

### macOS Build

```bash
npm run build:mac
```

**Output**: `dist/InvigilEye-1.0.0.dmg` (~100 MB)

### Linux Build

```bash
npm run build:linux
```

**Output**: `dist/InvigilEye-1.0.0.AppImage` (~120 MB)

### All Platforms

```bash
npm run build:all
```

Creates installers for Windows, macOS, and Linux.

### Troubleshooting Builds

**Issue**: Native module ABI errors
```bash
# Rebuild native modules for current Electron version
npx electron-rebuild -f

# Then try building again
npm run build:win
```

**Issue**: build-essential not found (Linux)
```bash
sudo apt-get install build-essential python3-dev
npm install
npm run build:linux
```

---

## ⚙️ Environment Configuration

### .env File (Optional)

Create a `.env` file in project root for custom configuration:

```env
# Backend
BACKEND_PORT=5001
DATABASE_PATH=./db/invigleye.db
UPLOAD_LIMIT=50mb

# Frontend
VITE_API_URL=http://localhost:5001

# Electron
ELECTRON_ENABLE_LOGGING=true
NODE_ENV=development
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm run react:dev\" \"npm run backend\" \"wait-on http://localhost:3000 && electron .\"",
    "backend": "node backend/server.js",
    "react:dev": "vite",
    "react:build": "vite build",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win",
    "build:mac": "vite build && electron-builder --mac --x64 --arm64",
    "build:linux": "vite build && electron-builder --linux",
    "cleanup:uploads": "node backend/utils/cleanup-uploads.js",
    "migrate:db": "node backend/database/migrate.js"
  }
}
```

---

## 🔍 Troubleshooting

### Common Issues

#### 1. "Node command not found"
```bash
# Windows PowerShell
$env:Path -split ';' | findstr nodejs

# Linux/macOS
which node
echo $PATH

# If not found, reinstall Node.js and add to PATH
```

#### 2. "Python not found"
```bash
# Windows
python --version
# If not found: Add C:\PythonXX to PATH

# Linux/macOS
python3 --version
# If not found:
sudo apt-get install python3 python3-pip
```

#### 3. "Module not found: better-sqlite3"
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 4. "Electron won't start in dev mode"
```bash
# Kill any running Electron processes
# Windows
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force

# Linux/macOS
killall electron

# Then retry
npm run dev
```

#### 5. "Port 3000/5001 already in use"
```bash
# Find and kill process using port
# Windows (port 3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:3000 | xargs kill -9
lsof -ti:5001 | xargs kill -9
```

#### 6. "Webcam permission denied"
- **Windows**: Settings → Privacy → Camera → Allow app
- **macOS**: System Preferences → Security & Privacy → Camera → Allow
- **Linux**: Check `/dev/video*` permissions: `sudo chmod 666 /dev/video0`

#### 7. "Database locked" error
```bash
# Close all app instances
# Delete database and let it reinitialize
rm ./db/invigleye.db

# Restart application
npm run dev
```

#### 8. "Build fails: Visual C++ not found" (Windows)
1. Download [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. Run installer
3. Select "Desktop development with C++"
4. Retry build: `npm run build:win`

#### 9. "High memory usage"
```bash
# Clear old snapshots
npm run cleanup:uploads

# Limit concurrent exams (close unused exams)
# Reduce camera resolution in settings
```

#### 10. "Snapshots not saving"
1. Check folder permissions: `snapshots/` must be writable
2. Verify disk space: `df -h` (Linux/macOS) or `dir` (Windows)
3. Check backend logs for Python errors
4. Ensure Python version is 3.8+: `python --version`

---

## 🗑 Uninstallation

### Windows Executable

1. Open Control Panel → Programs → Programs and Features
2. Find "InvigilEye" in the list
3. Click "Uninstall"
4. Follow the uninstaller wizard
5. Remove Start Menu shortcuts if created

**Note**: User data (database, snapshots) may persist in:
- `C:\Users\{Username}\AppData\Roaming\InvigilEye\`

To completely remove user data:
```powershell
Remove-Item -Path "$env:APPDATA\InvigilEye" -Recurse -Force
```

### From Source

1. Delete the project folder
2. (Optional) Remove global npm packages if no longer needed

---

## 📚 Next Steps

1. **First Time Using**:
   - Read [README.md](README.md) for feature overview
   - Login as admin and explore dashboards
   - Create test exams and invigilators
   - Test the snapshot capture and attendance marking

2. **For Development**:
   - Review [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
   - Check `backend/routes/` for API implementation
   - Explore `renderer/src/` for React component structure
   - Review `core/ai/` for AI detection modules

3. **For Production**:
   - Change default admin credentials immediately
   - Set up SSL/HTTPS for backend (if exposed)
   - Configure database backups
   - Test on actual exam hardware (webcam, network)
   - Review [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 💡 Tips & Best Practices

### Performance
- Use a wired network connection for stable monitoring
- Close other applications to free up CPU
- Use 1080p or lower camera resolution
- Keep Python process separate from UI for stability

### Security
- Change default credentials on first login
- Use strong passwords for all accounts
- Regularly backup database: `./db/invigleye.db`
- Keep software updated to latest version

### Maintenance
- Periodically delete old snapshots: `npm run cleanup:uploads`
- Archive old exam records (manual backup)
- Check logs for errors: `./logs/` directory
- Update Python packages: `pip install --upgrade -r requirements.txt`

---

## 📞 Getting Help

1. **Check this guide** for your specific issue
2. **GitHub Issues**: Open an issue with:
   - Your OS and version
   - Steps to reproduce
   - Error messages or logs
3. **Email Support**: invigleye.support@example.com

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Application launches without errors
- [ ] Can login as admin (admin/admin123)
- [ ] Can navigate to all main dashboards
- [ ] Webcam is detected and working
- [ ] Can create a test exam
- [ ] Backend API is responsive on http://localhost:5001
- [ ] Database file exists and grows when data is added
- [ ] No errors in browser console (F12)

If all checks pass, you're ready to use InvigilEye!

---

**Last Updated**: December 2024  
**Version**: 1.0.0  
**Need Help?** See [README.md](README.md) or open a GitHub issue.
