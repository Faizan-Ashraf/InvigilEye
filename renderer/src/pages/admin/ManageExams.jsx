import React, { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import { useToast } from '../../contexts/ToastContext';
import { examsApi } from '../../lib/api';
import {
  PageHeader,
  PageContainer,
  ContentCard,
  LoadingSpinner,
  StandardTable,
  StandardButton,
  StandardInput
} from '../../components/common';

const ManageExams = () => {
  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editFormData, setEditFormData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  const toast = useToast();

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = exams.filter(
        (exam) =>
          exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exam.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (exam.department && exam.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (exam.section && exam.section.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (exam.invigilator_email && exam.invigilator_email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredExams(filtered);
    } else {
      setFilteredExams(exams);
    }
  }, [searchQuery, exams]);

  const loadExams = async () => {
    try {
      const data = await examsApi.getAll();
      setExams(data);
      setFilteredExams(data);
    } catch (error) {
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExam) return;

    try {
      await examsApi.delete(selectedExam.id);
      toast.success('Exam deleted successfully');
      loadExams();
      setShowDeleteModal(false);
      setSelectedExam(null);
    } catch (error) {
      toast.error('Failed to delete exam');
    }
  };

  const openDeleteModal = (exam) => {
    setSelectedExam(exam);
    setShowDeleteModal(true);
  };

  const openViewModal = async (exam) => {
    setSelectedExam(exam);
    setShowViewModal(true);
    setLoadingStudents(true);
    try {
      const studentsList = await examsApi.getStudents(exam.id);
      setStudents(studentsList);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const openEditModal = (exam) => {
    setSelectedExam(exam);
    setEditFormData({
      title: exam.title,
      department: exam.department || '',
      venue: exam.venue,
      exam_date: exam.exam_date,
      exam_time: exam.exam_time,
      end_time: exam.end_time || '',
      section: exam.section || '',
      invigilator_email: exam.invigilator_email || '',
      status: exam.status
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await examsApi.update(selectedExam.id, editFormData);
      toast.success('Exam updated successfully');
      loadExams();
      setShowEditModal(false);
      setSelectedExam(null);
    } catch (error) {
      toast.error('Failed to update exam');
    } finally {
      setEditLoading(false);
    }
  };

  const formatDateTime = (date, time) => {
    return `${date} | ${time}`;
  };

  if (loading) {
    return <LoadingSpinner message="Loading exams..." />;
  }

  const columns = [
    { key: 'title', label: 'Course Title' },
    { key: 'department', label: 'Department', render: (exam) => exam.department || '-' },
    { key: 'venue', label: 'Room' },
    { key: 'section', label: 'Section', render: (exam) => exam.section || '-' },
    { 
      key: 'exam_date', 
      label: 'Date',
      render: (exam) => exam.exam_date
    },
    { 
      key: 'time', 
      label: 'Time',
      render: (exam) => `${exam.exam_time}${exam.end_time ? ' - ' + exam.end_time : ''}`
    },
    { 
      key: 'invigilator', 
      label: 'Invigilator',
      render: (exam) => exam.invigilator_email || '-'
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (exam) => {
        const statusColors = {
          scheduled: 'bg-blue-100 text-blue-800',
          completed: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[exam.status] || 'bg-gray-100 text-gray-800'}`}>
            {exam.status}
          </span>
        );
      }
    },
    { 
      key: 'actions', 
      label: 'Actions',
      render: (exam) => (
        <div className="flex items-center gap-2">
          <StandardButton
            variant="primary"
            size="sm"
            onClick={() => openViewModal(exam)}
          >
            View
          </StandardButton>
          <StandardButton
            variant="warning"
            size="sm"
            onClick={() => openEditModal(exam)}
          >
            Edit
          </StandardButton>
          <StandardButton
            variant="danger"
            size="sm"
            onClick={() => openDeleteModal(exam)}
          >
            Delete
          </StandardButton>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader title="View & Manage Exams" backRoute="/admin/dashboard" />

      <PageContainer>
        <ContentCard>
          {/* Header with Stats */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-4">
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-600">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-600">{exams.length}</p>
                </div>
                <div className="bg-green-50 px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-green-600">
                    {exams.filter(e => e.status === 'scheduled').length}
                  </p>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-lg">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {exams.filter(e => e.status === 'completed').length}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Search Bar */}
            <StandardInput
              type="text"
              placeholder="Search by course, department, room, section, or invigilator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Table */}
          <StandardTable
            columns={columns}
            data={filteredExams}
            emptyMessage="No exams found"
          />
        </ContentCard>
      </PageContainer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirm Delete"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete "{selectedExam?.title}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <StandardButton
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </StandardButton>
            <StandardButton
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </StandardButton>
          </div>
        </div>
      </Modal>

      {/* View Students Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title={`Students - ${selectedExam?.title || ''}`}
      >
        <div className="space-y-4">
          {loadingStudents ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading students...</p>
            </div>
          ) : students.length > 0 ? (
            <div>
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Total Students:</span> {students.length}
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{student.roll_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                        <td className="px-4 py-3 text-sm">
                          {student.image_url ? (
                            <span className="text-green-600">✓ Available</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No students found for this exam.</p>
          )}
          <div className="flex justify-end mt-4">
            <StandardButton
              variant="secondary"
              onClick={() => setShowViewModal(false)}
            >
              Close
            </StandardButton>
          </div>
        </div>
      </Modal>

      {/* Edit Exam Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Exam"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <StandardInput
            label="Course Title:"
            name="title"
            type="text"
            value={editFormData.title || ''}
            onChange={handleEditChange}
            required
          />

          <div>
            <label className="block text-gray-900 font-semibold mb-2">Department:</label>
            <select
              name="department"
              value={editFormData.department || ''}
              onChange={handleEditChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Select department</option>
              <option value="IT">IT</option>
              <option value="Business">Business</option>
              <option value="Medical">Medical</option>
              <option value="Law">Law</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-900 font-semibold mb-2">Room No:</label>
            <select
              name="venue"
              value={editFormData.venue || ''}
              onChange={handleEditChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Select a room</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <option key={num} value={`Room ${num}`}>
                  Room {num}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-900 font-semibold mb-2">Section:</label>
            <select
              name="section"
              value={editFormData.section || ''}
              onChange={handleEditChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Select section</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </div>

          <StandardInput
            label="Exam Date:"
            name="exam_date"
            type="date"
            value={editFormData.exam_date || ''}
            onChange={handleEditChange}
            required
          />

          <StandardInput
            label="Start Time:"
            name="exam_time"
            type="time"
            value={editFormData.exam_time || ''}
            onChange={handleEditChange}
            required
          />

          <StandardInput
            label="End Time:"
            name="end_time"
            type="time"
            value={editFormData.end_time || ''}
            onChange={handleEditChange}
          />

          <StandardInput
            label="Invigilator Email:"
            name="invigilator_email"
            type="email"
            value={editFormData.invigilator_email || ''}
            onChange={handleEditChange}
          />

          <div>
            <label className="block text-gray-900 font-semibold mb-2">Status:</label>
            <select
              name="status"
              value={editFormData.status || 'scheduled'}
              onChange={handleEditChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <StandardButton
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={editLoading}
            >
              Cancel
            </StandardButton>
            <StandardButton
              type="submit"
              variant="primary"
              disabled={editLoading}
            >
              {editLoading ? 'Updating...' : 'Update Exam'}
            </StandardButton>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ManageExams;

