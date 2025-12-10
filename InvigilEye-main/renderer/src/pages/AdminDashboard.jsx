import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import Dashboard from './admin/Dashboard';
import CreateExam from './admin/CreateExam';
import ManageExams from './admin/ManageExams';
import Requests from './admin/Requests';
import Reports from './admin/Reports';
import DownloadReports from './admin/DownloadReports';

const AdminDashboard = () => {
  const location = useLocation();
  const hideTopbar = [
    '/admin/create-exam',
    '/admin/manage-exams',
    '/admin/reports',
    '/admin/download-reports',
    '/admin/view-requests'
  ].includes(location.pathname);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {!hideTopbar && <Topbar title="Admin Dashboard" />}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-exam" element={<CreateExam />} />
          <Route path="/manage-exams" element={<ManageExams />} />
          <Route path="/view-requests" element={<Requests />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/download-reports" element={<DownloadReports />} />
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;

