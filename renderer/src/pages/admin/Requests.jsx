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

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const toast = useToast();

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await requestsApi.getAll();
      // Filter only material requests
      const materialRequests = (data || []).filter(req => req.type === 'material');
      setRequests(materialRequests);
    } catch (error) {
      toast.error('Failed to load material requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await requestsApi.updateStatus(id, newStatus);
      toast.success(`Request ${newStatus}`);
      loadRequests();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const formatTime = (dateString) => {
    return dateString ? new Date(dateString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
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
    
    // For Material requests: "MaterialType (Qty: quantity) - Description"
    if (request.type === 'material') {
      const qtyMatch = description.match(/\(Qty: (.*?)\)/);
      const quantity = qtyMatch ? qtyMatch[1] : 'N/A';
      const parts = description.split(' - ');
      const materialType = parts[0]?.replace(/\(Qty:.*?\)/, '').trim() || 'N/A';
      const descriptionText = parts.slice(1).join(' - ') || description || 'N/A';
      
      return {
        materialType,
        quantity,
        description: descriptionText,
      };
    }
    
    return { description };
  };

  if (loading) {
    return <LoadingSpinner message="Loading requests..." />;
  }

  const parseMaterialType = (description) => {
    // Extract material type from description: "MaterialType (Qty: quantity) - Description"
    const parts = description?.split(' - ') || [];
    const materialPart = parts[0] || '';
    return materialPart.replace(/\(Qty:.*?\)/, '').trim() || 'N/A';
  };

  const columns = [
    { key: 'exam_title', label: 'Exam / Course', render: (request) => request.exam_title || 'N/A' },
    { key: 'invigilator_email', label: 'Invigilator Email', render: (request) => request.invigilator_email || 'N/A' },
    { key: 'material', label: 'Material', render: (request) => parseMaterialType(request.description) },
    { key: 'room', label: 'Room', render: (request) => request.exam_venue || request.room || 'N/A' },
    { 
      key: 'status', 
      label: 'Status',
      render: (request) => (
        <span className={`font-semibold ${
          request.status === 'resolved' ? 'text-green-600' : 'text-red-600'
        }`}>
          {request.status === 'resolved' ? 'Resolved' : 'Pending'}
        </span>
      )
    },
    { key: 'time', label: 'Time', render: (request) => formatTime(request.created_at) },
    { 
      key: 'actions', 
      label: 'Action',
      render: (request) => (
        <div className="flex items-center gap-2">
          <StandardButton
            variant="primary"
            size="sm"
            onClick={() => handleViewRequest(request)}
          >
            View
          </StandardButton>
          {request.status === 'pending' ? (
            <StandardButton
              variant="success"
              size="sm"
              onClick={() => handleStatusUpdate(request.id, 'resolved')}
            >
              Resolve
            </StandardButton>
          ) : (
            <StandardButton
              variant="secondary"
              size="sm"
              onClick={() => handleStatusUpdate(request.id, 'pending')}
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
      <PageHeader title="View Material Request" backRoute="/admin/dashboard" />

      <PageContainer>
        <ContentCard>
          <StandardTable
            columns={columns}
            data={requests}
            emptyMessage="No material requests found"
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
                  <td className="px-6 py-4 text-gray-900">
                    {selectedRequest.type === 'umc' ? 'UMC Request' : 
                     selectedRequest.type === 'it' ? 'IT Request' : 'Material Request'}
                  </td>
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
                {selectedRequest.type === 'umc' && (
                  <tr>
                    <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Student ID:</td>
                    <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest).studentId}</td>
                  </tr>
                )}
                
                {/* Material Request Fields */}
                {selectedRequest.type === 'material' && (
                  <>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Material Type:</td>
                      <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest).materialType}</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Quantity:</td>
                      <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest).quantity}</td>
                    </tr>
                  </>
                )}
                
                {/* Common Fields */}
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">
                    {selectedRequest.type === 'material' ? 'Reason:' : 'Description:'}
                  </td>
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

export default Requests;
