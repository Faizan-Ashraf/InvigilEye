import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { examsApi, attendanceApi } from '../../lib/api';
import { 
  PageHeader, 
  PageContainer, 
  ContentCard, 
  LoadingSpinner,
  StandardTable,
  StandardButton 
} from '../../components/common';

const DownloadReports = () => {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  const toast = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const data = await examsApi.getAll();
      // Filter to show only completed exams
      const completedExams = (data || []).filter(exam => exam.status === 'completed');
      setExams(completedExams);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async (exam) => {
    setDownloadingId(exam.id);
    try {
      // Fetch attendance data for the exam
      const attendanceData = await attendanceApi.getByExam(exam.id);
      
      // Generate CSV content (include invigilator email)
      const headers = 'Student Name,Roll Number,Attendance Status,Invigilator Email\n';
      const rows = attendanceData.map(record => 
        `${record.name},${record.roll_number},${record.status},${exam.invigilator_email || ''}`
      ).join('\n');
      
      // Also include exam summary as top lines
      const examMeta = `Exam Title:,${exam.title}\nDate:,${exam.exam_date} ${exam.exam_time}${exam.end_time ? ` - ${exam.end_time}` : ''}\nInvigilator:,${exam.invigilator_email || ''}\n\n`;
      const csvContent = examMeta + headers + rows;
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exam.title.replace(/\s+/g, '_')}_attendance_report.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded ${exam.title} attendance report`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading reports..." />;
  }

  const columns = [
     { key: 'invigilator_email', label: 'Invigilator Email', render: (exam) => exam.invigilator_email || '-' },
    { key: 'title', label: 'Course Title' },
    { 
      key: 'department', 
      label: 'Department',
      render: (exam) => exam.department || '-'
    },
    { 
      key: 'venue', 
      label: 'Room',
      render: (exam) => exam.venue || '-'
    },
    { 
      key: 'section', 
      label: 'Section',
      render: (exam) => exam.section || '-'
    },
    { key: 'exam_date', label: 'Date' },
    { 
      key: 'exam_time', 
      label: 'Time',
      render: (exam) => exam.exam_time + (exam.end_time ? ` - ${exam.end_time}` : '')
    },
    { 
      key: 'actions', 
      label: 'Download',
      render: (exam) => (
        <StandardButton
          variant="success"
          size="sm"
          onClick={() => handleDownloadCSV(exam)}
          disabled={downloadingId === exam.id}
        >
          {downloadingId === exam.id ? 'Downloading...' : 'CSV'}
        </StandardButton>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader title="Download Reports" backRoute="/admin/dashboard" />
      
      <PageContainer>
        <ContentCard>
          <StandardTable 
            columns={columns}
            data={exams}
            emptyMessage="No reports available"
          />
        </ContentCard>
      </PageContainer>
    </div>
  );
};

export default DownloadReports;

