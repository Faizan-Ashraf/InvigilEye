import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, ChevronDown, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { requestsApi } from '../../lib/api';
import Modal from '../../components/ui/Modal';

const MaterialRequest = () => {
  const [view, setView] = useState('form'); // 'form' or 'list'
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    materialType: '',
    quantity: '',
    description: ''
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    loadSelectedExam();
    if (view === 'list') {
      loadRequests();
    }
  }, [view]);

  const loadSelectedExam = () => {
    try {
      const examData = sessionStorage.getItem('selectedExam');
      if (examData) {
        setSelectedExam(JSON.parse(examData));
      } else {
        toast.error('No exam selected. Please login again.');
        navigate('/invigilator/login');
      }
    } catch (error) {
      console.error('Error loading selected exam:', error);
    }
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await requestsApi.getAll();
      // Filter for material requests only
      const materialRequests = data.filter(req => req.type === 'material');
      setRequests(materialRequests);
    } catch (error) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.materialType || !formData.description) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!selectedExam) {
      toast.error('No exam selected');
      return;
    }

    setLoading(true);
    try {
      // Simple description with material details
      const description = `${formData.materialType}${formData.quantity ? ` (Qty: ${formData.quantity})` : ''} - ${formData.description}`;
      
      await requestsApi.create({
        exam_id: selectedExam.id,
        type: 'material',
        description: description
      });
      
      toast.success('Material Request submitted successfully');
      setFormData({
        materialType: '',
        quantity: '',
        description: ''
      });
    } catch (error) {
      console.error('Material Request submission error:', error);
      toast.error(error.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (requestId) => {
    try {
      await requestsApi.create({
        exam_id: selectedExam?.id,
        type: 'material',
        description: 'Re-sent request'
      });
      toast.success('Request re-sent successfully');
      loadRequests();
    } catch (error) {
      toast.error('Failed to re-send request');
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const parseRequestDetails = (description) => {
    // Parse the description to extract form fields
    // Format: "MaterialType (Qty: quantity) - Description"
    const qtyMatch = description?.match(/\(Qty: (.*?)\)/);
    const quantity = qtyMatch ? qtyMatch[1] : 'N/A';
    
    const parts = description?.split(' - ') || [];
    const materialType = parts[0]?.replace(/\(Qty:.*?\)/, '').trim() || 'N/A';
    const descriptionText = parts.slice(1).join(' - ') || description || 'N/A';
    
    return {
      materialType,
      quantity,
      description: descriptionText,
    };
  };

  // FORM VIEW
  if (view === 'form') {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="max-w-7xl mx-auto flex items-center">
            <button
              onClick={() => navigate('/invigilator/dashboard')}
              className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </button>
            <h1 className="text-3xl font-semibold flex-1 text-center">Material Request</h1>
            <div className="w-32"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Form Container */}
        <div className="max-w-3xl mx-auto p-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Material Type */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Material Type:
                </label>
                <div className="relative">
                  <select
                    name="materialType"
                    value={formData.materialType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                  >
                    <option value="">Select Material</option>
                    <option value="Answer Sheets">Answer Sheets</option>
                    <option value="Extra Question Papers">Extra Question Papers</option>
                    <option value="Pens">Pens</option>
                    <option value="Pencils">Pencils</option>
                    <option value="Erasers">Erasers</option>
                    <option value="Rulers">Rulers</option>
                    <option value="Graph Paper">Graph Paper</option>
                    <option value="Other">Other</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Quantity (optional):
                </label>
                <input
                  type="text"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="e.g. 10"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description / Reason */}
              <div>
                <label className="block text-gray-900 font-semibold mb-2">
                  Description / Reason:
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Why is the material needed?"
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/invigilator/dashboard')}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Material Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-7xl mx-auto flex items-center">
          <button
            onClick={() => setView('form')}
            className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Material Request</span>
          </button>
          <h1 className="text-3xl font-semibold flex-1 text-center">View Previous Requests</h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Table Container */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-900 font-semibold">Request Type</th>
                  <th className="px-6 py-4 text-left text-gray-900 font-semibold">Time</th>
                  <th className="px-6 py-4 text-left text-gray-900 font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-gray-900 font-semibold">Details</th>
                  <th className="px-6 py-4 text-left text-gray-900 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">Material Request</td>
                      <td className="px-6 py-4 text-gray-900">
                        {formatTime(request.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        {request.status === 'resolved' ? (
                          <span className="text-green-600 font-semibold">Resolved</span>
                        ) : (
                          <span className="text-red-600 font-semibold">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        {request.status === 'resolved' ? (
                          <button className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg flex items-center gap-2">
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleResend(request.id)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            Re-send
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail View Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Material Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100 w-1/3">Request Type:</td>
                  <td className="px-6 py-4 text-gray-900">Material Request</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Material Type:</td>
                  <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest.description).materialType}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Quantity:</td>
                  <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest.description).quantity}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Description / Reason:</td>
                  <td className="px-6 py-4 text-gray-900">{parseRequestDetails(selectedRequest.description).description}</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-semibold text-gray-900 bg-gray-100">Submitted By:</td>
                  <td className="px-6 py-4 text-gray-900">{selectedRequest.invigilator_email || user.email}</td>
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

export default MaterialRequest;

