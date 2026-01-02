import { API_URL } from './utils';

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    // Use message field if available (for detailed errors), otherwise use error field
    const errorMessage = data.message || data.error || 'An error occurred';
    // Attach additional details to the Error object when available so caller can inspect
    const err = new Error(errorMessage);
    err.details = data.details || null;
    err.data = data || null;
    throw err;
  }
  return data;
};

// Auth API
export const authApi = {
  login: async (username, password, role) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role }),
    });
    return handleResponse(response);
  },
  loginInvigilator: async (email) => {
    const response = await fetch(`${API_URL}/auth/login-invigilator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },
  getInvigilators: async () => {
    const response = await fetch(`${API_URL}/auth/invigilators`);
    return handleResponse(response);
  },
};

// Exams API
export const examsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/exams`);
    return handleResponse(response);
  },
  getById: async (id) => {
    const response = await fetch(`${API_URL}/exams/${id}`);
    return handleResponse(response);
  },
  getByInvigilator: async (invigilatorId) => {
    const response = await fetch(`${API_URL}/exams/invigilator/${invigilatorId}`);
    return handleResponse(response);
  },
  create: async (formData) => {
    const response = await fetch(`${API_URL}/exams`, {
      method: 'POST',
      body: formData, // FormData for file upload
    });
    return handleResponse(response);
  },
  update: async (id, data) => {
    const response = await fetch(`${API_URL}/exams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  delete: async (id) => {
    const response = await fetch(`${API_URL}/exams/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
  start: async (id) => {
    const response = await fetch(`${API_URL}/exams/${id}/start`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
  end: async (id) => {
    const response = await fetch(`${API_URL}/exams/${id}/end`, {
      method: 'POST',
    });
    return handleResponse(response);
  },
  getStudents: async (id) => {
    const response = await fetch(`${API_URL}/exams/${id}/students`);
    return handleResponse(response);
  },
};

// Requests API
export const requestsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/requests`);
    return handleResponse(response);
  },
  getByExam: async (examId) => {
    const response = await fetch(`${API_URL}/requests/exam/${examId}`);
    return handleResponse(response);
  },
  create: async (data) => {
    const response = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  updateStatus: async (id, status) => {
    const response = await fetch(`${API_URL}/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },
  delete: async (id) => {
    const response = await fetch(`${API_URL}/requests/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// Alerts API
export const alertsApi = {
  getAll: async () => {
    const response = await fetch(`${API_URL}/alerts`);
    return handleResponse(response);
  },
  getByExam: async (examId) => {
    const response = await fetch(`${API_URL}/alerts/exam/${examId}`);
    return handleResponse(response);
  },
  create: async (data) => {
    const response = await fetch(`${API_URL}/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  acknowledge: async (id) => {
    const response = await fetch(`${API_URL}/alerts/${id}/acknowledge`, {
      method: 'PUT',
    });
    return handleResponse(response);
  },
  delete: async (id) => {
    const response = await fetch(`${API_URL}/alerts/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
};

// Attendance API
export const attendanceApi = {
  getByExam: async (examId) => {
    const response = await fetch(`${API_URL}/attendance/exam/${examId}`);
    return handleResponse(response);
  },
  mark: async (data) => {
    const response = await fetch(`${API_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
  bulkMark: async (records) => {
    const response = await fetch(`${API_URL}/attendance/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ records }),
    });
    return handleResponse(response);
  },
};

// Reports API
export const reportsApi = {
  getExamReport: async (examId) => {
    const response = await fetch(`${API_URL}/reports/exam/${examId}`);
    return handleResponse(response);
  },
  getSummary: async () => {
    const response = await fetch(`${API_URL}/reports/summary`);
    return handleResponse(response);
  },
};

// Monitoring API
export const monitoringApi = {
  startDetection: async (examId, studentId) => {
    const response = await fetch(`${API_URL}/monitoring/start-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId, studentId }),
    });
    return handleResponse(response);
  },
  stopDetection: async (examId) => {
    const response = await fetch(`${API_URL}/monitoring/stop-detection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examId }),
    });
    return handleResponse(response);
  },
  getSnapshots: async (examId) => {
    const response = await fetch(`${API_URL}/monitoring/snapshots/${examId}`);
    return handleResponse(response);
  },
  deleteSnapshots: async (examId) => {
    const response = await fetch(`${API_URL}/monitoring/snapshots/${examId}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },
  openSnapshots: async (examId) => {
    const response = await fetch(`${API_URL}/monitoring/open-snapshots/${examId}`);
    return handleResponse(response);
  },
};
