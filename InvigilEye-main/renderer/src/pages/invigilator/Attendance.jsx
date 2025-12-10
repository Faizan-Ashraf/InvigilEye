import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { examsApi, attendanceApi } from '../../lib/api';
import { PageHeader, PageContainer } from '../../components/common';

const Attendance = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadSelectedExam();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      loadAttendance();
    }
  }, [selectedExam]);

  const loadSelectedExam = () => {
    try {
      const examData = sessionStorage.getItem('selectedExam');
      if (examData) {
        setSelectedExam(JSON.parse(examData));
      } else {
        toast.error('No exam selected. Please select an exam first.');
        navigate('/invigilator/select-exam');
      }
    } catch (error) {
      console.error('Error loading selected exam:', error);
      toast.error('Failed to load exam');
      navigate('/invigilator/select-exam');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const data = await attendanceApi.getByExam(selectedExam.id);
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (rollNumber, status) => {
    try {
      await attendanceApi.mark({
        exam_id: selectedExam.id,
        roll_number: rollNumber,
        status: status,
      });
      
      // Update local state
      setAttendanceRecords(prev => 
        prev.map(record => 
          record.roll_number === rollNumber 
            ? { ...record, status, marked_at: new Date().toISOString() }
            : record
        )
      );
      
      toast.success('Attendance marked');
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance...</p>
        </div>
      </div>
    );
  }

  if (!selectedExam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">No exam selected</p>
          <button
            onClick={() => navigate('/invigilator/select-exam')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Select an Exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader 
        title="Attendance" 
        backRoute="/invigilator/dashboard"
      />

      <PageContainer>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-gray-900 font-semibold">Student Name</th>
                <th className="px-6 py-4 text-left text-gray-900 font-semibold">Roll Number</th>
                <th className="px-6 py-4 text-left text-gray-900 font-semibold">Attendance Status</th>
                <th className="px-6 py-4 text-center text-gray-900 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {attendanceRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                attendanceRecords.map((record) => (
                  <tr key={record.roll_number} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900">{record.name}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{record.roll_number}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        record.status === 'present' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleMarkAttendance(record.roll_number, 'present')}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            record.status === 'present'
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Present
                        </button>
                        <button
                          onClick={() => handleMarkAttendance(record.roll_number, 'absent')}
                          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                            record.status === 'absent'
                              ? 'bg-red-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          <XCircle className="w-4 h-4" />
                          Absent
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </div>
  );
};

export default Attendance;

