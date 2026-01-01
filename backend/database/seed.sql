-- Sample data for InvigilEye PostgreSQL Database
-- Run this file after the database has been initialized

-- Sample exams
INSERT INTO exams (title, venue, exam_date, exam_time, section, invigilator_id, status) VALUES
('Database Systems - Midterm', 'Room 101', '2025-11-01', '09:00:00', 'CS-A', 2, 'scheduled'),
('Data Structures - Final', 'Room 202', '2025-11-05', '14:00:00', 'CS-B', 3, 'scheduled'),
('Operating Systems - Quiz', 'Lab 301', '2025-10-28', '10:30:00', 'CS-A', 2, 'completed');

-- Sample students for first exam
INSERT INTO students (exam_id, roll_number, name, email) VALUES
(1, 'CS-2021-001', 'Ahmed Ali', 'ahmed.ali@example.com'),
(1, 'CS-2021-002', 'Fatima Khan', 'fatima.khan@example.com'),
(1, 'CS-2021-003', 'Hassan Raza', 'hassan.raza@example.com'),
(1, 'CS-2021-004', 'Sana Malik', 'sana.malik@example.com'),
(1, 'CS-2021-005', 'Bilal Ahmed', 'bilal.ahmed@example.com');

-- Sample students for second exam
INSERT INTO students (exam_id, roll_number, name, email) VALUES
(2, 'CS-2021-006', 'Ayesha Tariq', 'ayesha.tariq@example.com'),
(2, 'CS-2021-007', 'Usman Farooq', 'usman.farooq@example.com'),
(2, 'CS-2021-008', 'Zainab Hussain', 'zainab.hussain@example.com');

-- Sample attendance records
INSERT INTO attendance (exam_id, student_id, status, marked_at) VALUES
(3, 1, 'present', '2025-10-28 10:25:00'),
(3, 2, 'present', '2025-10-28 10:27:00'),
(3, 3, 'absent', '2025-10-28 10:30:00');

-- Sample alerts (UMC Reports)
INSERT INTO alerts (exam_id, student_id, exam_title, type, description, severity, snapshot_url, created_at) VALUES
(3, 'CS-2021-001', 'Operating Systems - Quiz', 'cheating', 'Student was found with unauthorized material', 'high', '/snapshots/alert_001.jpg', '2025-10-28 10:45:00'),
(3, 'CS-2021-002', 'Operating Systems - Quiz', 'suspicious_behavior', 'Student was looking at another students paper', 'medium', '/snapshots/alert_002.jpg', '2025-10-28 11:00:00');

-- Sample requests
INSERT INTO requests (exam_id, type, description, invigilator_email, room, status, created_at) VALUES
(1, 'extra_time', 'Student needs extra time due to medical condition', 'admin@ucp.edu.pk', 'Room 101', 'pending', NOW()),
(2, 'restroom', 'Student requesting restroom break', 'abidbashir@ucp.edu.pk', 'Room 202', 'approved', NOW()),
(3, 'technical', 'Projector not working in exam hall', 'admin@ucp.edu.pk', 'Lab 301', 'resolved', '2025-10-28 10:35:00');

