import React, { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { requestsApi } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import {
  PageHeader,
  PageContainer,
  ContentCard,
  LoadingSpinner,
  StandardTable,
  StandardButton
} from '../../components/common';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const toast = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await requestsApi.getAll();
      // Filter only UMC requests
      const umcRequests = (data || []).filter(req => req.type === 'umc');
      setReports(umcRequests);
    } catch (error) {
      toast.error('Failed to load UMC requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await requestsApi.updateStatus(id, newStatus);
      toast.success(`Request ${newStatus}`);
      loadReports();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const parseStudentId = (description) => {
    // Extract student ID from description: "Student ID: [id] - [description]"
    const parts = description?.split(' - ') || [];
    const studentIdPart = parts[0] || '';
    return studentIdPart.replace('Student ID:', '').trim() || 'N/A';
  };

  const parseRequestDetails = (request) => {
    if (!request) return {};
    
    const description = request.description || '';
    
    // For UMC requests: "Student ID: [id] - [description]"
    if (request.type === 'umc') {
      const parts = description.split(' - ');
      const studentIdPart = parts[0] || '';
      const studentId = studentIdPart.replace('Student ID:', '').trim();
      const descriptionText = parts.slice(1).join(' - ') || 'N/A';
      
      return {
        studentId,
        description: descriptionText,
      };
    }
    
    return { description };
  };

  const formatTime = (dateString) => {
    return dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  };

  if (loading) {
    return <LoadingSpinner message="Loading UMC requests..." />;
  }

  const columns = [
    { key: 'exam_title', label: 'Exam / Course', render: (report) => report.exam_title || 'N/A' },
    { key: 'invigilator_email', label: 'Invigilator Email', render: (report) => report.invigilator_email || 'N/A' },
    { key: 'student_id', label: 'Student ID', render: (report) => parseStudentId(report.description) },
    { key: 'room', label: 'Room', render: (report) => report.exam_venue || report.room || 'N/A' },
    { 
      key: 'status', 
      label: 'Status',
      render: (report) => (
        <span className={`font-semibold ${
          report.status === 'resolved' ? 'text-green-600' : 'text-red-600'
        }`}>
          {report.status === 'resolved' ? 'Resolved' : 'Pending'}
        </span>
      )
    },
    { key: 'time', label: 'Time', render: (report) => formatTime(report.created_at) },
    { 
      key: 'actions', 
      label: 'Action',
      render: (report) => (
        <div className="flex items-center gap-2">
          <StandardButton
            variant="primary"
            size="sm"
            onClick={() => handleViewRequest(report)}
          >
            View
          </StandardButton>
          {report.status === 'pending' ? (
            <StandardButton
              variant="success"
              size="sm"
              onClick={() => handleStatusUpdate(report.id, 'resolved')}
            >
              Resolve
            </StandardButton>
          ) : (
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => handleStatusUpdate(report.id, 'pending')}
            >
              Reopen
            </StandardButton>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader title="View UMC Request" backRoute="/admin/dashboard" />

      <PageContainer>
        <ContentCard>
          <StandardTable
            columns={columns}
            data={reports}
            emptyMessage="No UMC requests available"
          />
        </ContentCard>
      </PageContainer>

      {/* Detail View Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100 w-1/3">Request Type:</td>
                  <td className="px-6 py-4 text-gray-900">UMC Request</td>
                </tr>
                
                {/* Exam Information (from foreign key) */}
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Exam / Course:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.exam_title || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Department:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.exam_department || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Room:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.exam_venue || selectedRequest.room || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Section:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.exam_section || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Exam Date:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.exam_date || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Exam Time:</td>
                  <td className="px-6 py-4 text-gray-900">
                    {selectedRequest.exam_time || 'N/A'}{selectedRequest.end_time ? ` - ${selectedRequest.end_time}` : ''}
                  </td>
                </tr>
                
                {/* UMC Request Fields */}
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Student ID:</td>
                  <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest).studentId}</td>
                </tr>
                
                {/* Common Fields */}
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Description:</td>
                  <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest).description}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Submitted By:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.invigilator_email || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Submitted At:</td>
                  <td className="px-6 py-4 text-gray-900">{new Date(selectedRequest.created_at).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Status:</td>
                  <td className="px-6 py-4">
                    {selectedRequest.status === 'resolved' ? (
                      <span className="text-green-600 font-semibold">Resolved</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Pending</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Reports;
