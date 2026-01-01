# Backend API Documentation

This document describes the InvigilEye backend API endpoints, architecture, and usage.

---

## 📍 Overview

The backend is a Node.js + Express.js server that provides RESTful API endpoints for all frontend operations. It handles user authentication, exam management, attendance tracking, snapshot serving, and data persistence using SQLite.

- **Server**: Express.js 4.18.2
- **Port**: http://localhost:5001
- **Database**: SQLite 3 (better-sqlite3)
- **Middleware**: CORS, body-parser, multer (file uploads)

---

## 🚀 Running the Backend

### Development Mode
```bash
npm run backend
```
Starts the server with automatic restart on file changes.

### With All Services
```bash
npm run dev
```
Starts backend + React frontend + Electron all together.

### Manual Start (if needed)
```bash
node backend/server.js
```

---

## 🔌 API Endpoints

### Authentication

#### `POST /api/auth/login`
User login endpoint for both admin and invigilators.

**Request**:
```json
{
  "username": "admin",
  "password": "admin123",
  "role": "admin"  // or "invigilator"
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "full_name": "Admin User"
  },
  "token": "jwt_token_here"
}
```

**Response (Failure - 401)**:
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

#### `POST /api/auth/logout`
Logout current user and invalidate session.

**Request**: No body
**Response (200)**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `POST /api/auth/register-invigilator`
Create a new invigilator account (admin only).

**Request** (admin auth required):
```json
{
  "username": "inv001",
  "password": "secure_password",
  "full_name": "John Invigilator",
  "email": "john@example.com"
}
```

**Response (201)**:
```json
{
  "success": true,
  "user": {
    "id": 5,
    "username": "inv001",
    "role": "invigilator",
    "full_name": "John Invigilator"
  }
}
```

---

### Exams

#### `GET /api/exams`
List all exams (admin: all exams, invigilator: assigned exams).

**Query Parameters**:
- `status`: Filter by status (pending|ongoing|completed)
- `date`: Filter by exam date (YYYY-MM-DD)
- `limit`: Number of results (default: 50)

**Response (200)**:
```json
{
  "success": true,
  "exams": [
    {
      "id": 1,
      "title": "CSC101 Midterm",
      "exam_date": "2024-12-10",
      "exam_time": "09:00",
      "end_time": "11:00",
      "venue": "Room 101",
      "section": "A",
      "invigilator_id": 2,
      "status": "pending",
      "total_students": 45,
      "created_at": "2024-12-06T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

#### `POST /api/exams`
Create a new exam (admin only).

**Request**:
```json
{
  "title": "CSC101 Final",
  "exam_date": "2024-12-20",
  "exam_time": "09:00",
  "end_time": "12:00",
  "venue": "Main Hall",
  "section": "A",
  "invigilator_id": 2
}
```

**Response (201)**:
```json
{
  "success": true,
  "exam": {
    "id": 2,
    "title": "CSC101 Final",
    "status": "pending",
    "created_at": "2024-12-06T15:20:00Z"
  }
}
```

---

#### `GET /api/exams/:id`
Get detailed information for a specific exam.

**Response (200)**:
```json
{
  "success": true,
  "exam": {
    "id": 1,
    "title": "CSC101 Midterm",
    "exam_date": "2024-12-10",
    "exam_time": "09:00",
    "end_time": "11:00",
    "venue": "Room 101",
    "section": "A",
    "invigilator_id": 2,
    "invigilator_name": "John Smith",
    "status": "pending",
    "students": [
      {
        "id": 1,
        "roll_number": "2021-001",
        "name": "Alice Johnson",
        "email": "alice@example.com"
      }
    ],
    "attendance_count": {
      "present": 42,
      "absent": 2,
      "marked": 44
    }
  }
}
```

---

#### `PUT /api/exams/:id`
Update exam details (admin only).

**Request** (partial update):
```json
{
  "title": "CSC101 Final (Updated)",
  "end_time": "12:30",
  "status": "ongoing"
}
```

**Response (200)**:
```json
{
  "success": true,
  "exam": { /* updated exam object */ }
}
```

---

#### `DELETE /api/exams/:id`
Delete an exam (admin only).

**Response (200)**:
```json
{
  "success": true,
  "message": "Exam deleted successfully"
}
```

---

### Attendance

#### `GET /api/attendance/:examId`
Get attendance records for an exam.

**Response (200)**:
```json
{
  "success": true,
  "attendance": [
    {
      "id": 1,
      "student_id": 1,
      "student_name": "Alice Johnson",
      "roll_number": "2021-001",
      "status": "present",
      "marked_at": "2024-12-10T09:02:00Z"
    },
    {
      "id": 2,
      "student_id": 2,
      "student_name": "Bob Smith",
      "roll_number": "2021-002",
      "status": "absent",
      "marked_at": null
    }
  ]
}
```

---

#### `POST /api/attendance/:examId/mark`
Mark attendance for a student.

**Request**:
```json
{
  "student_id": 1,
  "status": "present"  // or "absent", "late"
}
```

**Response (201)**:
```json
{
  "success": true,
  "attendance": {
    "id": 45,
    "student_id": 1,
    "status": "present",
    "marked_at": "2024-12-10T09:15:00Z"
  }
}
```

---

#### `PUT /api/attendance/:examId/:studentId`
Update attendance for a student.

**Request**:
```json
{
  "status": "late"
}
```

**Response (200)**:
```json
{
  "success": true,
  "attendance": { /* updated record */ }
}
```

---

#### `GET /api/attendance/:examId/report`
Export attendance report as CSV.

**Response (200)**: CSV file download

---

### Monitoring & Snapshots

#### `GET /api/monitoring/snapshots/:examId`
List all snapshots captured during an exam.

**Response (200)**:
```json
{
  "success": true,
  "snapshots": [
    {
      "filename": "Suspect_Student_0_20251206_095230.jpg",
      "url": "/api/monitoring/snapshot/2/Suspect_Student_0_20251206_095230.jpg",
      "captured_at": "2024-12-06T09:52:30Z",
      "student_id": 1,
      "suspect_degree": 0.85
    }
  ]
}
```

---

#### `GET /api/monitoring/snapshot/:examId/:filename`
Download a specific snapshot image.

**Response (200)**: Binary image data (JPEG)

**Response (404)**:
```json
{
  "success": false,
  "error": "Snapshot not found"
}
```

---

#### `DELETE /api/monitoring/snapshots/:examId`
Delete all snapshots for an exam.

**Response (200)**:
```json
{
  "success": true,
  "message": "Snapshots deleted",
  "deleted_count": 23
}
```

---

### Alerts (UMC Cases)

#### `POST /api/alerts/umccase`
Report an unfair means case (UMC).

**Request**:
```json
{
  "exam_id": 1,
  "student_id": 5,
  "description": "Student was looking at neighbor's paper",
  "snapshot_path": "/path/to/snapshot.jpg"
}
```

**Response (201)**:
```json
{
  "success": true,
  "umc_case": {
    "id": 1,
    "exam_id": 1,
    "student_id": 5,
    "student_name": "Alice Johnson",
    "invigilator_id": 2,
    "description": "Student was looking at neighbor's paper",
    "status": "reported",
    "created_at": "2024-12-10T10:30:00Z"
  }
}
```

---

#### `GET /api/alerts/umccases`
List all UMC cases.

**Query Parameters**:
- `status`: Filter by status (reported|reviewed|resolved)
- `exam_id`: Filter by exam
- `limit`: Number of results

**Response (200)**:
```json
{
  "success": true,
  "cases": [ /* array of UMC cases */ ],
  "total": 5
}
```

---

#### `PUT /api/alerts/umccases/:id`
Update UMC case status (admin only).

**Request**:
```json
{
  "status": "reviewed",
  "notes": "Verified - disciplinary action recommended"
}
```

**Response (200)**:
```json
{
  "success": true,
  "umc_case": { /* updated case */ }
}
```

---

### Material Requests

#### `POST /api/requests/material`
Submit a material request during exam.

**Request**:
```json
{
  "exam_id": 1,
  "description": "Need 10 extra answer sheets"
}
```

**Response (201)**:
```json
{
  "success": true,
  "request": {
    "id": 1,
    "exam_id": 1,
    "description": "Need 10 extra answer sheets",
    "status": "pending",
    "created_at": "2024-12-10T10:15:00Z"
  }
}
```

---

#### `GET /api/requests/material`
List material requests.

**Query Parameters**:
- `status`: Filter by status (pending|approved|fulfilled)
- `exam_id`: Filter by exam

**Response (200)**:
```json
{
  "success": true,
  "requests": [ /* array of requests */ ]
}
```

---

#### `PUT /api/requests/material/:id`
Update material request status (admin).

**Request**:
```json
{
  "status": "approved"
}
```

**Response (200)**:
```json
{
  "success": true,
  "request": { /* updated request */ }
}
```

---

### Reports

#### `GET /api/reports/attendance/:examId`
Generate attendance report for exam.

**Response (200)**:
```json
{
  "success": true,
  "report": {
    "exam_id": 1,
    "exam_title": "CSC101 Midterm",
    "total_students": 50,
    "present": 45,
    "absent": 3,
    "late": 2,
    "attendance_percentage": 90,
    "generated_at": "2024-12-10T14:30:00Z"
  }
}
```

---

#### `GET /api/reports/incidents/:examId`
Generate incident report for exam (UMC cases and requests).

**Response (200)**:
```json
{
  "success": true,
  "report": {
    "exam_id": 1,
    "umc_cases": 3,
    "material_requests": 5,
    "incidents": [ /* detailed incidents */ ]
  }
}
```

---

## 🗄 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'invigilator')),
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Exams Table
```sql
CREATE TABLE exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  exam_date DATE NOT NULL,
  exam_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT,
  section TEXT,
  invigilator_id INTEGER,
  status TEXT CHECK (status IN ('pending', 'ongoing', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invigilator_id) REFERENCES users(id)
);
```

### Students Table
```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_path TEXT,
  exam_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id)
);
```

### Attendance Table
```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late')),
  marked_at TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (student_id) REFERENCES students(id)
);
```

### UMC Cases Table
```sql
CREATE TABLE umc_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  student_id INTEGER,
  invigilator_id INTEGER,
  description TEXT,
  snapshot_path TEXT,
  status TEXT CHECK (status IN ('reported', 'reviewed', 'resolved')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (invigilator_id) REFERENCES users(id)
);
```

### Material Requests Table
```sql
CREATE TABLE material_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  invigilator_id INTEGER,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'fulfilled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id),
  FOREIGN KEY (invigilator_id) REFERENCES users(id)
);
```

---

## 📁 Project Structure

```
backend/
├── server.js                 # Express app initialization & middleware
├── routes/
│   ├── auth.js              # Authentication endpoints
│   ├── exams.js             # Exam CRUD operations
│   ├── attendance.js        # Attendance marking & reports
│   ├── monitoring.js        # Snapshot serving & listing
│   ├── alerts.js            # UMC case endpoints
│   ├── requests.js          # Material request endpoints
│   └── reports.js           # Report generation
├── database/
│   ├── db.js                # SQLite connection & initialization
│   ├── migrate.js           # Database migrations
│   └── seed.sql             # Sample data
├── uploads/                  # Directory for CSV uploads
│   └── README.md            # Upload documentation
└── utils/
    └── cleanup-uploads.js   # Clean up old uploads
```

---

## 🔐 Authentication

All endpoints (except login) require authentication via JWT token or session.

**Header**: `Authorization: Bearer <token>`

---

## ⚠️ Error Handling

Standard error responses:

```json
{
  "success": false,
  "error": "Description of error",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `500`: Server error

---

## 🚀 Starting Backend Development

1. Install dependencies: `npm install`
2. Start backend: `npm run backend`
3. Test with curl or Postman:
   ```bash
   curl -X GET http://localhost:5001/api/exams
   ```

---

**Last Updated**: December 2024  
**Version**: 1.0.0
