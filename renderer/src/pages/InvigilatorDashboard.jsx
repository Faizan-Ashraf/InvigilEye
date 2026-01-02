import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Topbar from '../components/layout/Topbar';
import Dashboard from './invigilator/Dashboard';

import Attendance from './invigilator/Attendance';
import Snapshots from './invigilator/Snapshots';
import Alerts from './invigilator/Alerts';
import MaterialRequest from './invigilator/MaterialRequest';

const InvigilatorDashboard = () => {
  const location = useLocation();
  
  // Hide topbar for request pages since they have their own headers
  const hideTopbar = [
    '/invigilator/alerts',
    '/invigilator/material-request',
    '/invigilator/attendance',
    '/invigilator/snapshots'
  ].includes(location.pathname);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {!hideTopbar && <Topbar title="Invigilator Dashboard" />}
      <main className={`flex-1 overflow-y-auto ${!hideTopbar ? 'p-6' : ''}`}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/snapshots" element={<Snapshots />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/material-request" element={<MaterialRequest />} />
          <Route path="/" element={<Navigate to="/invigilator/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default InvigilatorDashboard;

