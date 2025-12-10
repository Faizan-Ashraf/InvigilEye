# File Uploads Documentation

This document explains how InvigilEye handles file uploads including student CSV imports and snapshot storage.

---

## 📁 Overview

The upload system handles two main types of files:

1. **CSV Files** - Student lists imported by admins
2. **Snapshots** - Suspicious behavior images captured by AI detection

---

## 📋 CSV Student Import

### File Format

CSV files must follow this format:

```csv
roll_number,name,email,phone
2021-001,Alice Johnson,alice@example.com,555-0001
2021-002,Bob Smith,bob@example.com,555-0002
2021-003,Charlie Brown,charlie@example.com,555-0003
```

### Required Columns
- **roll_number**: Student ID/Roll number (required, must be unique per exam)
- **name**: Full name (required)
- **email**: Email address (optional)
- **phone**: Contact number (optional)

### Optional Columns
- **photo**: Path to student photo (optional)
- Any additional columns are ignored

### Constraints
- **File size**: Maximum 10 MB
- **Character encoding**: UTF-8 (Windows: ANSI with UTF-8 BOM)
- **Line endings**: LF or CRLF
- **Delimiter**: Comma (,)
- **Max rows**: 10,000 students per import

### Upload via Admin Dashboard

1. Navigate to **Admin Dashboard** → **Manage Exams**
2. Select an exam
3. Click **"Import Students"** button
4. Choose CSV file
5. Click **"Upload"**
6. System validates and imports students
7. Success/error message shown

### Import API

**Endpoint**: `POST /api/exams/:examId/import-students`

**Request**:
```
Content-Type: multipart/form-data

File: students.csv
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Students imported successfully",
  "imported": 50,
  "skipped": 2,
  "errors": [
    "Row 3: Roll number must be unique",
    "Row 5: Email format invalid"
  ]
}
```

---

## 📷 Snapshots

### Storage Location

Snapshots are stored in organized folder structure:

```
snapshots/
├── 1/                              # Exam ID 1
│   ├── Suspect_Student_0_20251206_095230.jpg
│   ├── Suspect_Student_1_20251206_095245.jpg
│   └── Suspect_Student_0_20251206_100130.jpg
├── 2/
│   ├── Suspect_Student_5_20251206_101500.jpg
│   └── ...
└── 3/
    └── ...
```

### Filename Format

```
Suspect_Student_{student_id}_{YYYYMMDD}_{HHMMSS}.jpg
```

Example: `Suspect_Student_0_20251206_095230.jpg`
- Date: 2025-12-06
- Time: 09:52:30

### Image Specifications
- **Format**: JPEG (.jpg)
- **Resolution**: 1920×1080 (1080p recommended)
- **Quality**: 85-90% compression
- **File size**: 200-500 KB per image
- **Color space**: RGB

---

## 🔍 Snapshot API

### List Snapshots

**Endpoint**: `GET /api/monitoring/snapshots/:examId`

**Response (200)**:
```json
{
  "success": true,
  "snapshots": [
    {
      "filename": "Suspect_Student_0_20251206_095230.jpg",
      "url": "/api/monitoring/snapshot/2/Suspect_Student_0_20251206_095230.jpg",
      "captured_at": "2024-12-06T09:52:30Z",
      "student_id": 0,
      "size": 324000
    }
  ],
  "total": 23
}
```

---

### Download Snapshot

**Endpoint**: `GET /api/monitoring/snapshot/:examId/:filename`

**Response (200)**: Binary JPEG image data

**Headers**:
```
Content-Type: image/jpeg
Content-Disposition: attachment; filename="Suspect_Student_0_20251206_095230.jpg"
```

---

### Delete Exam Snapshots

**Endpoint**: `DELETE /api/monitoring/snapshots/:examId`

**Response (200)**:
```json
{
  "success": true,
  "message": "Snapshots deleted",
  "deleted_count": 23,
  "freed_space_mb": 7.5
}
```

Automatically triggered when:
- Exam ends
- Admin deletes exam
- Invigilator clicks "Change Exam"

---

## 💾 Storage Management

### Disk Space Monitoring

```bash
# Check snapshots folder size
du -sh snapshots/         # Linux/macOS
dir snapshots /s          # Windows
```

### Cleanup Utility

**Command**: `npm run cleanup:uploads`

This script:
1. Finds snapshots older than 30 days
2. Deletes them
3. Reports freed space

### Manual Cleanup

```bash
# Delete specific exam snapshots
rm -rf snapshots/1/*

# Delete all old snapshots (older than 7 days)
# Linux/macOS
find snapshots -type f -mtime +7 -delete

# Windows PowerShell
Get-ChildItem snapshots -Recurse -File | Where {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item
```

### Storage Estimates

| Scenario | Daily Snapshots | Monthly Size |
|----------|-----------------|--------------|
| Small exam (30 students) | 50-100 | 20-50 MB |
| Medium exam (100 students) | 200-300 | 80-150 MB |
| Large exam (500 students) | 1000+ | 400-800 MB |

**Recommendation**: Keep at least 5 GB free disk space

---

## 🔐 Security & Privacy

### File Access Control

- CSV uploads: Admin only
- Snapshots: Admin + assigned invigilator
- Student photos: Not currently used (reserved for future)

### Data Privacy

1. **CSV Files**: Deleted after import
2. **Snapshots**: Associated with exam ID (no student identification in storage)
3. **Backups**: Should be encrypted and stored securely
4. **GDPR**: Implement data retention policies and deletion schedules

### File Validation

All uploads are validated:
- **Type**: CSV for imports, JPEG for snapshots
- **Size**: Within configured limits
- **Integrity**: No corrupted files
- **Malware**: (Optional) Scanned before storage

---

## 🔧 Troubleshooting

### CSV Import Errors

**Issue**: "Invalid file format"
- **Solution**: Ensure file is plain text CSV, not Excel (.xlsx)
- Use "Save As" → CSV format in Excel

**Issue**: "Duplicate roll numbers"
- **Solution**: Check for duplicate entries in CSV
- Each student must have unique roll number per exam

**Issue**: "Character encoding error"
- **Solution**: Save CSV as UTF-8 (not ANSI or UTF-16)
- In Excel: Save As → CSV (Comma delimited) → Tools → Web Options → Encoding: UTF-8

**Issue**: "File too large"
- **Solution**: Split large files (max 10,000 rows per file)
- Import multiple times

### Snapshot Issues

**Issue**: "Snapshots not saving"
- **Solution**:
  1. Check folder permissions: `snapshots/` must be writable
  2. Verify disk space: `df -h` (Linux/macOS)
  3. Check Python error logs
  4. Ensure correct exam ID in environment

**Issue**: "Snapshots not displaying"
- **Solution**:
  1. Verify backend is running: `http://localhost:5001`
  2. Check network requests in DevTools
  3. Ensure correct exam ID selected
  4. Try refreshing the page

**Issue**: "Cannot delete snapshots"
- **Solution**:
  1. Ensure files are not locked by another process
  2. Check folder permissions
  3. Manually delete: `rm -rf snapshots/examId/*`
  4. Restart backend

---

## 📤 Upload Configuration

### Express/Multer Settings (backend/server.js)

```javascript
// CSV upload size limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Multer configuration for CSV files
const upload = multer({
  dest: 'backend/uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files allowed'));
    }
  }
});
```

### Configuration Options

```javascript
{
  "maxFileSize": "50mb",          // Maximum upload size
  "maxFileCount": 1,              // One file at a time
  "allowedMimes": ["text/csv"],   // Allowed MIME types
  "allowedExtensions": [".csv"],  // Allowed file extensions
  "autoDeleteAfter": 3600000      // Auto-delete temp files after 1 hour
}
```

---

## 📊 Upload Statistics

### Monitoring

Check upload/snapshot statistics:

```bash
# Count CSV imports
ls -la backend/uploads/

# Count snapshots
find snapshots -type f | wc -l

# Total size
du -sh snapshots/
```

---

## 🔄 Backup & Recovery

### Backup Snapshots

```bash
# Linux/macOS
tar -czf snapshots_backup_$(date +%Y%m%d).tar.gz snapshots/

# Windows PowerShell
Compress-Archive -Path snapshots -DestinationPath "snapshots_backup_$(Get-Date -Format yyyyMMdd).zip"
```

### Restore Snapshots

```bash
# Linux/macOS
tar -xzf snapshots_backup_20241206.tar.gz

# Windows PowerShell
Expand-Archive -Path snapshots_backup_20241206.zip -DestinationPath .
```

---

## 📝 Best Practices

1. **Regular Backups**: Weekly backup of snapshots for important exams
2. **Cleanup Schedule**: Automated cleanup every 30 days
3. **Monitor Disk Space**: Alert if free space < 1 GB
4. **Archive Old Data**: After 6 months, move to external storage
5. **Encryption**: Use encrypted storage for sensitive exams
6. **Access Logs**: Log all file accesses for audit trail

---

**Last Updated**: December 2024  
**Version**: 1.0.0
