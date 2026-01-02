# Database Documentation

This document describes the InvigilEye SQLite database schema, initialization, and management.

---

##  Overview

InvigilEye uses SQLite as the primary database for storing all application data. SQLite was chosen for its:
- **Zero configuration** - No server setup required
- **Cross-platform compatibility** - Works on Windows, macOS, Linux
- **Portability** - Single file database (easy backup)
- **Offline capability** - Application works without network
- **Fast local access** - Suitable for exam invigilation scenarios

---

##  Database Files

### Location
- **Development**: `./db/invigleye.db`
- **Packaged App (Windows)**: `C:\Users\{Username}\AppData\Roaming\InvigilEye\invigleye.db`
- **Packaged App (macOS)**: `~/Library/Application Support/InvigilEye/invigleye.db`
- **Packaged App (Linux)**: `~/.config/InvigilEye/invigleye.db`

### File Size
- **Initial**: ~100 KB
- **Typical Usage**: 2-10 MB (grows with exam and student data)
- **With Snapshots**: Can grow larger (snapshots stored separately in `snapshots/` folder)

---

## Schema Overview

The database consists of 6 main tables:

1. **users** - User accounts (admin, invigilators)
2. **exams** - Exam sessions and schedules
3. **students** - Student information per exam
4. **attendance** - Attendance records
5. **umc_cases** - Unfair means case reports
6. **material_requests** - Material request during exams

---

##  Table Definitions

### 1. Users Table

Stores user accounts for both admin and invigilator roles.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'invigilator')),
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns**:
- `id`: Unique user identifier
- `username`: Login username (must be unique)
- `password`: Hashed password
- `role`: Either 'admin' or 'invigilator'
- `full_name`: User's full name
- `email`: User's email address
- `created_at`: Account creation timestamp
- `updated_at`: Last profile update timestamp

**Sample Data**:
```sql
INSERT INTO users (username, password, role, full_name, email)
VALUES ('admin', 'hashed_password', 'admin', 'Administrator', 'admin@invigleye.local');
```

---

### 2. Exams Table

Stores exam sessions and their details.

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
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invigilator_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

**Columns**:
- `id`: Unique exam identifier
- `title`: Exam name/course code (e.g., "CSC101 Midterm")
- `exam_date`: Date of exam (YYYY-MM-DD)
- `exam_time`: Start time (HH:MM format)
- `end_time`: End time (HH:MM format)
- `venue`: Physical location/room number
- `section`: Class section (e.g., "A", "B")
- `invigilator_id`: Assigned invigilator user ID
- `status`: Current exam status (pending/ongoing/completed)
- `created_by`: Admin user who created the exam
- `created_at`: Creation timestamp
- `updated_at`: Last modification timestamp

**Sample Data**:
```sql
INSERT INTO exams (title, exam_date, exam_time, end_time, venue, section, invigilator_id, status, created_by)
VALUES ('CSC101 Midterm', '2024-12-10', '09:00', '11:00', 'Room 101', 'A', 2, 'pending', 1);
```

---

### 3. Students Table

Stores student information for each exam.

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  roll_number TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_students_exam_id ON students(exam_id);
CREATE INDEX idx_students_roll_number ON students(roll_number);
```

**Columns**:
- `id`: Unique student record identifier
- `exam_id`: Reference to the exam
- `roll_number`: Student's roll/ID number
- `name`: Full name
- `email`: Email address
- `phone`: Contact phone number
- `photo_path`: Path to student photo file
- `created_at`: Import/creation timestamp

**Sample Data**:
```sql
INSERT INTO students (exam_id, roll_number, name, email, phone)
VALUES (1, '2021-001', 'Alice Johnson', 'alice@example.com', '555-0001');
```

---

### 4. Attendance Table

Records attendance marks for each student in each exam.

```sql
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  student_id INTEGER NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent', 'late')),
  marked_by INTEGER,
  marked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id),
  UNIQUE(exam_id, student_id)  -- One attendance record per student per exam
);

-- Index for faster queries
CREATE INDEX idx_attendance_exam_id ON attendance(exam_id);
CREATE INDEX idx_attendance_student_id ON attendance(student_id);
```

**Columns**:
- `id`: Unique attendance record identifier
- `exam_id`: Reference to the exam
- `student_id`: Reference to the student
- `status`: Attendance status (present/absent/late)
- `marked_by`: Invigilator user ID who marked attendance
- `marked_at`: When attendance was marked
- `created_at`: Record creation timestamp
- `updated_at`: Last modification timestamp

**Sample Data**:
```sql
INSERT INTO attendance (exam_id, student_id, status, marked_by, marked_at)
VALUES (1, 1, 'present', 2, datetime('now'));
```

---

### 5. UMC Cases Table

Records unfair means cases reported during exams.

```sql
CREATE TABLE umc_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  student_id INTEGER,
  invigilator_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  snapshot_path TEXT,
  status TEXT CHECK (status IN ('reported', 'reviewed', 'resolved')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (invigilator_id) REFERENCES users(id)
);

-- Index for faster queries
CREATE INDEX idx_umc_cases_exam_id ON umc_cases(exam_id);
CREATE INDEX idx_umc_cases_status ON umc_cases(status);
```

**Columns**:
- `id`: Unique case identifier
- `exam_id`: Reference to the exam
- `student_id`: Reference to the student (if identified)
- `invigilator_id`: Invigilator who reported the case
- `description`: Detailed description of the incident
- `snapshot_path`: Path to evidence snapshot
- `status`: Current case status (reported/reviewed/resolved)
- `notes`: Admin notes (when reviewed)
- `created_at`: Report timestamp
- `updated_at`: Last update timestamp

**Sample Data**:
```sql
INSERT INTO umc_cases (exam_id, student_id, invigilator_id, description, status)
VALUES (1, 5, 2, 'Student looking at neighbor''s paper', 'reported');
```

---

### 6. Material Requests Table

Records material requests submitted during exams.

```sql
CREATE TABLE material_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL,
  invigilator_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'fulfilled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  FOREIGN KEY (invigilator_id) REFERENCES users(id)
);

-- Index for faster queries
CREATE INDEX idx_material_requests_exam_id ON material_requests(exam_id);
CREATE INDEX idx_material_requests_status ON material_requests(status);
```

**Columns**:
- `id`: Unique request identifier
- `exam_id`: Reference to the exam
- `invigilator_id`: Requesting invigilator
- `description`: What is requested (e.g., "10 extra answer sheets")
- `status`: Current status (pending/approved/fulfilled)
- `created_at`: Request timestamp
- `updated_at`: Last update timestamp

**Sample Data**:
```sql
INSERT INTO material_requests (exam_id, invigilator_id, description, status)
VALUES (1, 2, 'Need 10 extra answer sheets', 'pending');
```

---

## Database Initialization

### First-Time Setup

The database is automatically initialized on first application launch:

1. **Check if database exists**: `./db/invigleye.db`
2. **If not exists**: Create new SQLite database file
3. **Create all tables**: Using schema definitions above
4. **Create default indices**: For faster lookups
5. **Seed initial data**: Create default admin account

### Default Admin Account

After initialization, the following admin account is created:

```
Username: admin
Password: admin123
Role: admin
```

** Important**: Change this password immediately after first login!

### Manual Initialization

If you need to reinitialize the database:

```bash
# Development mode
rm db/invigleye.db
npm run dev

# Or run migration script
npm run migrate:db
```

---

##  Database Relationships

```
users (1) -------- (M) exams
           ├─ id ----------- invigilator_id
           └─ id ----------- created_by

exams (1) --------- (M) students
       ├─ id ------------- exam_id
       └─ id ------------- exam_id (in attendance)

students (1) ------ (M) attendance
          └─ id --------- student_id

exams (1) --------- (M) umc_cases
       ├─ id --------- exam_id
       └─ id --------- exam_id (in material_requests)

users (1) --------- (M) umc_cases
       └─ id ----------- invigilator_id
```

---

##  Data Integrity

### Constraints
- **Primary Keys**: Ensure uniqueness
- **Foreign Keys**: Maintain referential integrity
- **Unique Constraints**: Prevent duplicate attendance records
- **Check Constraints**: Validate status values
- **Cascading Deletes**: Delete related records when exam is deleted

### Example
```sql
-- Deleting an exam automatically deletes:
-- - All students for that exam
-- - All attendance records
-- - All UMC cases
-- - All material requests
DELETE FROM exams WHERE id = 1;
```

---

##  Query Examples

### Get exam with all students

```sql
SELECT e.*, COUNT(s.id) as student_count
FROM exams e
LEFT JOIN students s ON e.id = s.exam_id
WHERE e.id = 1
GROUP BY e.id;
```

### Get attendance report for exam

```sql
SELECT 
  e.title,
  COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present,
  COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent,
  COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late,
  COUNT(a.id) as total_marked,
  COUNT(s.id) as total_students
FROM exams e
LEFT JOIN students s ON e.id = s.exam_id
LEFT JOIN attendance a ON s.id = a.student_id AND e.id = a.exam_id
WHERE e.id = 1
GROUP BY e.id;
```

### Get UMC cases with student details

```sql
SELECT 
  uc.id,
  uc.description,
  st.name as student_name,
  u.full_name as invigilator_name,
  uc.status,
  uc.created_at
FROM umc_cases uc
LEFT JOIN students st ON uc.student_id = st.id
LEFT JOIN users u ON uc.invigilator_id = u.id
WHERE uc.exam_id = 1
ORDER BY uc.created_at DESC;
```

### Get pending material requests

```sql
SELECT 
  mr.id,
  mr.description,
  u.full_name as requested_by,
  e.title as exam_title,
  mr.created_at
FROM material_requests mr
JOIN users u ON mr.invigilator_id = u.id
JOIN exams e ON mr.exam_id = e.id
WHERE mr.status = 'pending'
ORDER BY mr.created_at ASC;
```

---

##  Maintenance

### Backup Database

```bash
# Windows
copy db\invigleye.db db\invigleye.db.backup

# Linux/macOS
cp db/invigleye.db db/invigleye.db.backup
```

### Export Data to CSV

```bash
# Using SQLite CLI
sqlite3 db/invigleye.db ".headers on" ".mode csv" "SELECT * FROM attendance;" > attendance_export.csv
```

### Clean Old Data

```bash
# Delete exams older than 6 months
DELETE FROM exams 
WHERE exam_date < date('now', '-6 months') 
AND status = 'completed';
```

### Database Integrity Check

```bash
# Run integrity check
sqlite3 db/invigleye.db "PRAGMA integrity_check;"

# Optimize database
sqlite3 db/invigleye.db "VACUUM;"
```

---

##  Database Statistics

### Typical Size Estimates
| Scenario | Data | DB Size |
|----------|------|---------|
| Empty DB | - | 100 KB |
| 10 exams × 50 students | 500 records | 500 KB |
| 100 exams × 100 students + attendance | 10K records | 3 MB |
| 1 year of exams + all data | ~100K records | 15-20 MB |

### Growth Factors
- Each exam record: ~500 bytes
- Each student record: ~300 bytes
- Each attendance record: ~150 bytes
- Each UMC case: ~800 bytes
- Each material request: ~600 bytes

---

##  Security Notes

1. **Database Files**: Keep `invigleye.db` secure (readable by app user only)
2. **Backups**: Store backups in secure location
3. **Password Hashing**: Passwords should be hashed using bcrypt or similar
4. **SQL Injection**: All queries use parameterized statements (no string concatenation)

---

##  Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial schema |

---

**Last Updated**: December 2025
**Version**: 1.0.0
