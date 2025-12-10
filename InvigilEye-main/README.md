# InvigilEye - Exam Invigilation System

<div align="center">
  
  ![InvigilEye Logo](https://img.shields.io/badge/InvigilEye-v1.0.0-blue)
  ![License](https://img.shields.io/badge/license-MIT-green)
  ![Electron](https://img.shields.io/badge/Electron-28.3.3-47848f)
  ![React](https://img.shields.io/badge/React-18.2.0-61dafb)
  ![Node](https://img.shields.io/badge/Node-v16+-339933)
  ![Python](https://img.shields.io/badge/Python-3.8+-3776ab)
  
  A comprehensive desktop application for physical exam invigilation and real-time monitoring using AI-powered cheating detection.
  
</div>

---

## 📥 Quick Start

For detailed setup instructions, see [SETUP.md](./SETUP.md)

### Windows Users (Fastest Way)
1. Download the latest **InvigilEye-Setup.exe** from [Releases](../../releases)
2. Run the installer and follow the wizard
3. Launch from Start Menu → InvigilEye

### Developers (Dev Mode)
```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/InvigilEye.git
cd InvigilEye

# Install dependencies
npm install
python -m pip install -r requirements.txt

# Start development environment
npm run dev
```

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [System Requirements](#system-requirements)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [User Roles](#user-roles)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 Overview

**InvigilEye** is a desktop application designed to streamline and automate the examination invigilation process. It provides intelligent monitoring using pose estimation and behavioral analysis to detect suspicious activity in real-time. The system includes separate dashboards for administrators and invigilators, enabling efficient exam management, live monitoring, attendance tracking, and incident reporting.

### Key Highlights
- **AI-Powered Detection**: Real-time pose estimation and cheating behavior analysis
- **Multi-Role Access**: Dedicated dashboards for Admin and Invigilator roles
- **Real-Time Snapshots**: Auto-capture suspicious student behavior
- **Offline-Ready**: Local SQLite database for reliable offline operation
- **Cross-Platform**: Windows, macOS, and Linux support
- **Easy Deployment**: Single-file installers with automatic updates

---

## ✨ Features

### Admin Dashboard
- **Exam Management**: Create, view, edit, and delete exam sessions with date/time scheduling
- **Student Management**: Import student lists via CSV with bulk operations
- **Invigilator Management**: Assign invigilators to exam rooms and sections
- **Request Monitoring**: Review and manage UMC (Unfair Means Case) and material requests
- **Reports**: Download attendance logs, activity reports, and incident summaries
- **Real-time Overview**: Live status of all ongoing exams with participant counts
- **Statistics**: Exam completion rates, average attendance, incident trends

### Invigilator Dashboard
- **Exam Selection**: Browse and select assigned ongoing exams
- **Attendance Marking**: Mark student attendance in real-time (Present/Absent/Late)
- **Live Monitoring**: Monitor student video feed with AI-detected alert highlights
- **Snapshot Gallery**: Browse and download captured evidence from suspicious behavior
- **UMC Reporting**: Report unfair means cases with detailed descriptions and snapshots
- **Material Requests**: Request extra sheets, question papers, or clarifications
- **Session Persistence**: Auto-save exam selection across navigation

### General Features
- **Dual Authentication**: Separate secure login for Admin and Invigilator roles
- **Real-Time Alerts**: Visual and audio notifications for suspicious activity
- **Responsive UI**: Modern, intuitive interface with Tailwind CSS and Lucide icons
- **Local Database**: SQLite for fast, offline-capable operations
- **Session Management**: Persistent exam state across application navigation
- **Auto-Cleanup**: Automatic snapshot and session cleanup on exam end
- **IPC Communication**: Efficient electron main-process ↔ renderer communication

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18.2.0 with React Router v6
- **Build Tool**: Vite 5.0.8
- **Styling**: Tailwind CSS 3.4.0 + PostCSS
- **Icons**: Lucide React 0.294.0
- **UI Utilities**: clsx, tailwind-merge, class-variance-authority

### Backend
- **Runtime**: Node.js (v16+)
- **Server**: Express.js 4.18.2
- **Database**: SQLite 3 (via better-sqlite3 12.5.0)
- **File Upload**: Multer 1.4.5
- **CSV Parsing**: PapaParse 5.4.1 + csv-parser 3.0.0
- **Utilities**: date-fns 2.30.0, CORS

### Desktop (Electron)
- **Framework**: Electron 28.3.3
- **Builder**: electron-builder 24.9.1
- **Native Module Rebuild**: electron-rebuild 3.2.9

### AI & Computer Vision (Python)
- **Pose Estimation**: MediaPipe 0.10.9
- **Object Detection**: YOLOv8 (ultralytics 8.3.227)
- **Image Processing**: OpenCV 4.12.0.88, Pillow 10.1.0
- **Data Processing**: NumPy 2.2.6, Pandas 2.3.3

### Development & Build
- **Concurrency**: concurrently 8.2.2
- **Process Waiter**: wait-on 7.2.0
- **TypeScript Support**: @types/react, @types/react-dom

---

## 💻 System Requirements

### Minimum Requirements
- **OS**: Windows 10, macOS 10.12+, or Linux (Ubuntu 18.04+)
- **RAM**: 4 GB minimum (8 GB recommended)
- **Storage**: 2 GB free space
- **CPU**: Dual-core processor (Intel i5 or equivalent)
- **Webcam**: Required for student monitoring (1080p or higher recommended)

### Development Requirements
- **Node.js**: v16.0.0 or higher
- **npm**: v8.0.0 or higher (comes with Node.js)
- **Python**: 3.8 or higher
- **Git**: v2.0 or higher

### Build Requirements (for packaging)
- **For Windows**: Visual C++ Build Tools or Visual Studio
- **For macOS**: Xcode Command Line Tools
- **For Linux**: GCC, build-essential

---

## 📦 Installation

### Option 1: Use the Executable (Easiest - Windows)

1. Download `InvigilEye-Setup-1.0.0.exe` from the [Releases](../../releases) page
2. Double-click the installer
3. Follow the installation wizard prompts
4. Choose installation directory (default: `C:\Program Files\InvigilEye`)
5. Optionally add Start Menu shortcuts
6. Launch from Start Menu or Desktop

**First Run**:
- Admin account is auto-created with default credentials (see SETUP.md)
- Database initializes automatically
- All required directories are created

### Option 2: Install from Source (Development)

See detailed instructions in [SETUP.md](./SETUP.md)

---

## 🚀 Running the Application

### Development Mode (All-in-One)
```bash
npm run dev
```
This command:
- Starts the backend server (Express) on `http://localhost:5001`
- Starts the React development server (Vite) on `http://localhost:3000`
- Launches the Electron application with hot-reload enabled

### Production Build
```bash
npm run build:win
```
Builds an optimized standalone executable for Windows.

### Manual Start (Separate Terminals)

**Terminal 1 - Backend:**
```bash
npm run backend
```
Backend will be available at `http://localhost:5001`

**Terminal 2 - Frontend (React):**
```bash
npm run react:dev
```
Frontend will be available at `http://localhost:3000`

**Terminal 3 - Electron (after both are running):**
```bash
npm run electron:dev
```

---

## 📁 Project Structure

```
InvigilEye/
├── main/                           # Electron main process
│   ├── main.js                     # App entry point, window creation, IPC handlers
│   └── preload.js                  # Security layer for IPC communication
├── renderer/                        # React frontend (Electron renderer process)
│   ├── src/
│   │   ├── App.jsx                 # Main app component
│   │   ├── main.jsx                # Entry point
│   │   ├── index.css               # Global styles
│   │   ├── components/
│   │   │   ├── common/             # Reusable UI components
│   │   │   ├── layout/             # Layout components (Sidebar, Topbar)
│   │   │   └── ui/                 # Modal, Toast components
│   │   ├── pages/                  # Page components
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── InvigilatorDashboard.jsx
│   │   │   ├── admin/              # Admin-specific pages
│   │   │   └── invigilator/        # Invigilator-specific pages
│   │   ├── contexts/               # React Context (Auth, Toast)
│   │   └── lib/                    # Utilities (API client, helpers)
│   ├── public/                      # Static assets
│   ├── vite.config.js              # Vite configuration
│   └── dist/                        # Build output (generated)
├── backend/                         # Node.js + Express backend
│   ├── server.js                   # Express app initialization
│   ├── routes/                      # API endpoints
│   │   ├── auth.js
│   │   ├── exams.js
│   │   ├── attendance.js
│   │   ├── monitoring.js
│   │   ├── alerts.js
│   │   ├── requests.js
│   │   └── reports.js
│   ├── database/
│   │   ├── db.js                   # SQLite connection
│   │   ├── migrate.js              # Database migrations
│   │   └── seed.sql                # Sample data
│   ├── uploads/                     # CSV uploads & snapshots
│   │   └── README.md               # Upload documentation
│   └── utils/
│       └── cleanup-uploads.js      # Cleanup utility
├── core/
│   └── ai/
│       └── pose_estimation/        # Python AI detection modules
│           ├── CheatingDetection.py
│           ├── pose_estimation.py
│           ├── poseDetection.py
│           ├── behaviorAnalysis.py
│           └── suspectDegree.py
├── snapshots/                       # AI-detected student snapshots
├── db/                              # SQLite database files
├── logs/                            # Application logs
├── package.json                     # Node.js dependencies
├── requirements.txt                 # Python dependencies
├── vite.config.js                  # Vite config for renderer
├── postcss.config.js               # PostCSS for Tailwind
├── tailwind.config.js              # Tailwind CSS config
├── electron-builder.config.js      # Electron build config
├── SETUP.md                         # Installation & setup guide
├── DEPLOYMENT.md                    # Deployment instructions
└── README.md                        # This file
```

---

## 👥 User Roles

### Admin
- Access: Admin Dashboard only
- Capabilities: Full exam management, student import, report generation, request review
- Default Credentials: admin / admin123 (change on first login)

### Invigilator
- Access: Invigilator Dashboard only
- Capabilities: Exam monitoring, attendance marking, incident reporting, snapshot review
- Login: Uses credentials created by admin

### Guest
- No access to sensitive data
- Read-only access to exam schedule (if enabled by admin)

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login (admin/invigilator)
- `POST /api/auth/logout` - User logout
- `POST /api/auth/register-invigilator` - Create invigilator account (admin only)

### Exams
- `GET /api/exams` - List all exams (filtered by role)
- `POST /api/exams` - Create exam (admin)
- `PUT /api/exams/:id` - Update exam (admin)
- `DELETE /api/exams/:id` - Delete exam (admin)
- `GET /api/exams/:id` - Get exam details

### Attendance
- `GET /api/attendance/:examId` - Get attendance for exam
- `POST /api/attendance/:examId/mark` - Mark student attendance
- `PUT /api/attendance/:examId/:studentId` - Update attendance record
- `GET /api/attendance/:examId/report` - Export attendance report

### Monitoring
- `GET /api/monitoring/snapshots/:examId` - List snapshots for exam
- `GET /api/monitoring/snapshot/:examId/:filename` - Download snapshot
- `DELETE /api/monitoring/snapshots/:examId` - Clean up exam snapshots

### Alerts (UMC)
- `POST /api/alerts/umccase` - Report unfair means case
- `GET /api/alerts/umccases` - List all UMC cases
- `PUT /api/alerts/umccases/:id` - Update UMC case status

### Requests
- `POST /api/requests/material` - Submit material request
- `GET /api/requests/material` - List material requests
- `PUT /api/requests/material/:id` - Update request status

### Reports
- `GET /api/reports/attendance/:examId` - Generate attendance report
- `GET /api/reports/incidents/:examId` - Generate incident report

---

## 🗄 Database Schema

The SQLite database includes the following main tables:

### Users
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT (admin|invigilator),
  full_name TEXT,
  created_at TIMESTAMP
)
```

### Exams
```sql
CREATE TABLE exams (
  id INTEGER PRIMARY KEY,
  title TEXT,
  exam_date DATE,
  exam_time TIME,
  end_time TIME,
  venue TEXT,
  section TEXT,
  invigilator_id INTEGER,
  status TEXT (pending|ongoing|completed),
  created_at TIMESTAMP
)
```

### Students
```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY,
  roll_number TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  photo_path TEXT,
  created_at TIMESTAMP
)
```

### Attendance
```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY,
  exam_id INTEGER,
  student_id INTEGER,
  status TEXT (present|absent|late),
  marked_at TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
)
```

### UMC Cases
```sql
CREATE TABLE umc_cases (
  id INTEGER PRIMARY KEY,
  exam_id INTEGER,
  student_id INTEGER,
  description TEXT,
  invigilator_id INTEGER,
  snapshot_path TEXT,
  status TEXT (reported|reviewed|resolved),
  created_at TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
)
```

### Material Requests
```sql
CREATE TABLE material_requests (
  id INTEGER PRIMARY KEY,
  exam_id INTEGER,
  invigilator_id INTEGER,
  description TEXT,
  status TEXT (pending|approved|fulfilled),
  created_at TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
)
```

---

## 🐛 Troubleshooting

### Application Won't Start
1. **Check Python Installation**: `python --version` (should be 3.8+)
2. **Install Python Dependencies**: `pip install -r requirements.txt`
3. **Rebuild Native Modules**: `npm rebuild` or `npm install`
4. **Check Node Version**: `node --version` (should be v16+)

### Webcam Not Detected
1. Ensure webcam is connected and not in use by other applications
2. Check Windows Device Manager for unknown devices
3. Update camera drivers
4. Restart application and grant camera permissions

### Snapshots Not Saving
1. Check folder permissions: `snapshots/` directory must be writable
2. Verify disk space available (at least 1 GB free)
3. Check backend logs for errors
4. Ensure Python detection process is running (check Windows Task Manager)

### Database Locked Error
1. Close all instances of the application
2. Delete `.db` files in `db/` folder
3. Restart application to reinitialize database
4. Check for leftover node processes: `tasklist | findstr node`

### High CPU/Memory Usage
1. Limit concurrent exams (close others)
2. Reduce camera resolution in settings
3. Close snapshots auto-refresh (view manually)
4. Clear old snapshots: `npm run cleanup:uploads`

### Build Fails on Windows
1. Install Visual C++ Build Tools
2. Ensure Python is in PATH: `python --version`
3. Clear npm cache: `npm cache clean --force`
4. Delete `node_modules/` and `package-lock.json`, reinstall: `npm install`

---

## 🔧 Development

### Setting Up Development Environment
1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Install Python packages: `pip install -r requirements.txt`
4. Create `.env` file (if needed for secrets)
5. Run: `npm run dev`

### Code Structure
- **Frontend**: React components in `renderer/src/`
  - Use functional components and hooks
  - Context API for state management
  - Tailwind CSS for styling
- **Backend**: Express routes in `backend/routes/`
  - RESTful endpoints following REST conventions
  - Error handling with try-catch
  - Validation of inputs
- **Python**: AI modules in `core/ai/pose_estimation/`
  - Modular design for each detection type
  - Command-line argument support
  - JSON output for backend integration

### Building for Release
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux

# All platforms
npm run build:all
```

Builds are output to `dist/` folder.

### Running Tests (if available)
```bash
npm test
```

### Code Style
- Use ES6+ syntax
- Follow existing code patterns
- Add comments for complex logic
- Use meaningful variable names

---

## 📝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/YourFeature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature/YourFeature`
5. Open a Pull Request

**Guidelines**:
- Keep commits atomic and descriptive
- Update documentation for new features
- Test thoroughly before submitting PR
- Follow existing code style

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📧 Support

For issues and questions:
- Open an issue on [GitHub Issues](../../issues)
- Check [SETUP.md](SETUP.md) for common setup problems
- Review existing issues for solutions

---

## 🎉 Acknowledgments

- Built with Electron, React, and Express.js
- AI detection powered by MediaPipe and YOLOv8
- Icons by Lucide React
- UI framework by Tailwind CSS

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: InvigilEye Team
