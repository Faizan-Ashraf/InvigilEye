import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monitoringApi } from '../../lib/api';
import logger from '../../lib/logger';

// Safely get ipcRenderer from window (Electron IPC)
const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && window.require) {
    try {
      return window.require('electron').ipcRenderer;
    } catch (err) {
      logger.warn('ipcRenderer not available:', err);
      return null;
    }
  }
  return null;
};
import { 
  ClipboardCheck, 
  Camera, 
  MonitorPlay, 
  AlertTriangle,
  FileText,
  RefreshCw,
  Calendar,
  Clock,
  MapPin,
  Users
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState(null);
  const [detectionActive, setDetectionActive] = useState(false);

  useEffect(() => {
    // Load selected exam from sessionStorage
    const examData = sessionStorage.getItem('selectedExam');
    if (examData) {
      setSelectedExam(JSON.parse(examData));
    }
  }, []);

  // Listen for detection stopped events from Electron
  useEffect(() => {
    const ipc = getIpcRenderer();
    if (!ipc) return;

    const handleDetectionStopped = (event, data) => {
      logger.info('Detection process stopped (event):', data);
      setDetectionActive(false);
    };

    const handleDetectionError = (event, data) => {
      logger.error('Detection error (event):', data);
      setDetectionActive(false);
    };

    ipc.on('detection-stopped', handleDetectionStopped);
    ipc.on('detection-error', handleDetectionError);

    return () => {
      ipc.removeAllListeners('detection-stopped');
      ipc.removeAllListeners('detection-error');
    };
  }, []);

  // Check if exam time has ended and stop detection + auto-redirect
  useEffect(() => {
    if (!selectedExam) return;

    const checkExamTime = async () => {
      const endTime = new Date(`${selectedExam.exam_date} ${selectedExam.end_time}`);
      const now = new Date();

      if (now >= endTime) {
        logger.info('Exam time ended - stopping detection and redirecting');

        // Attempt to stop detection regardless of local state
        try {
          const ipc = getIpcRenderer();
          if (ipc) {
            const result = await ipc.invoke('stop-detection');
            logger.debug('Stop detection result:', result);
          }
        } catch (err) {
          logger.error('Error stopping detection:', err);
        }
        // Ensure UI reflects stopped state
        setDetectionActive(false);

        // Wait a bit for windows to close
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Clean up snapshots
        try {
          await monitoringApi.deleteSnapshots(selectedExam.id);
        } catch (err) {
          logger.warn('Cleanup error:', err);
        }

        // Auto-redirect to login
        sessionStorage.removeItem('selectedExam');
        navigate('/invigilator/login');
      }
    };

    // Check every 15 seconds (more frequent)
    const interval = setInterval(checkExamTime, 15000);
    // Also check immediately
    checkExamTime();

    return () => clearInterval(interval);
  }, [selectedExam, detectionActive, navigate]);

  const dashboardCards = [
    {
      id: 1,
      title: 'View Attendance',
      description: 'Mark or update attendance manually in real-time.',
      icon: ClipboardCheck,
      bgColor: 'bg-blue-100',
      textColor: 'text-gray-800',
      route: '/invigilator/attendance'
    },
    {
      id: 2,
      title: 'View Snapshots',
      description: 'Browse captured evidence for suspicious behavior.',
      icon: Camera,
      bgColor: 'bg-green-100',
      textColor: 'text-gray-800',
      route: '/invigilator/snapshots'
    },
    {
      id: 3,
      title: 'Start Invigilation',
      description: 'Monitor live student feed with red alert highlights.',
      icon: MonitorPlay,
      bgColor: 'bg-yellow-100',
      textColor: 'text-gray-800',
      route: '/invigilator/monitoring'
    },
    {
      id: 4,
      title: 'UMC Request',
      description: 'Report unfair means case with snapshot and note.',
      icon: AlertTriangle,
      bgColor: 'bg-pink-100',
      textColor: 'text-gray-800',
      route: '/invigilator/alerts'
    },
    {
      id: 5,
      title: 'Material Request',
      description: 'Request extra sheets or question papers instantly.',
      icon: FileText,
      bgColor: 'bg-purple-100',
      textColor: 'text-gray-800',
      route: '/invigilator/material-request'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-normal text-gray-700">
          Invigilator Dashboard - InvigilEye
        </h1>
      </div>

      {/* Selected Exam Info */}
      {selectedExam ? (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-2xl font-bold">{selectedExam.title}</h2>
                  <span className="px-3 py-1 bg-green-500 rounded-full text-sm font-medium">
                    Active Exam
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-blue-100">Room</p>
                      <p className="font-semibold">{selectedExam.venue}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-blue-100">Section</p>
                      <p className="font-semibold">{selectedExam.section || 'All'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-blue-100">Date</p>
                      <p className="font-semibold">{selectedExam.exam_date}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <div>
                      <p className="text-xs text-blue-100">Time</p>
                      <p className="font-semibold">{selectedExam.exam_time} - {selectedExam.end_time}</p>
                    </div>
                  </div>
                </div>
              </div>
              

            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-yellow-800">
              No exam selected. Please login to access your assigned exams.
            </p>
            <button
              onClick={() => navigate('/invigilator/login')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

      {/* Action Cards */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Start Invigilation - Full Width at Top with Buttons */}
        {dashboardCards
          .filter(card => card.id === 3)
          .map((card) => (
            <div
              key={card.id}
              className={`${card.bgColor} p-10 rounded-2xl transition-all duration-200 border-0 w-full`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {card.title}
                  </h2>
                  <p className="text-gray-700 text-base leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <div className="flex gap-2 ml-6">
                  <button
                    onClick={async () => {
                      if (!selectedExam) return alert('Please select an exam first.');
                      try {
                        const ipc = getIpcRenderer();
                        if (!ipc) {
                          alert('Not running in Electron environment');
                          return;
                        }
                        const result = await ipc.invoke('start-detection', selectedExam.id);
                        if (result.success) {
                          setDetectionActive(true);
                          alert('Detection started - camera window opening');
                        } else {
                          alert('Failed to start: ' + result.message);
                        }
                      } catch (err) {
                        console.error(err);
                        alert('Error: ' + (err.message || err));
                      }
                    }}
                    disabled={detectionActive}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${detectionActive ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                  >
                    Start
                  </button>
                  <button
                    onClick={async () => {
                      if (!selectedExam) return alert('Please select an exam first.');
                      try {
                        const ipc = getIpcRenderer();
                        if (!ipc) {
                          alert('Not running in Electron environment');
                          return;
                        }
                        const result = await ipc.invoke('stop-detection');
                        // Also ask backend to stop any detection process associated with this exam
                        try {
                          await monitoringApi.stopDetection(selectedExam.id);
                        } catch (e) {
                          console.warn('Backend stop-detection failed:', e);
                        }

                        if (result.success) {
                          setDetectionActive(false);
                          alert('Detection stopped');
                        } else {
                          alert('Failed to stop: ' + result.message);
                        }
                      } catch (err) {
                        console.error(err);
                        alert('Error: ' + (err.message || err));
                      }
                    }}
                    disabled={!detectionActive}
                    className={`px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap ${!detectionActive ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
                  >
                    Stop
                  </button>
                </div>
              </div>
            </div>
          ))}

        {/* Remaining Cards - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {dashboardCards
            .filter(card => card.id !== 3)
            .map((card) => (
              <button
                key={card.id}
                onClick={() => navigate(card.route)}
                className={`${card.bgColor} p-10 rounded-2xl text-left transition-all duration-200 
                  hover:shadow-md cursor-pointer border-0`}
              >
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {card.title}
                </h2>
                <p className="text-gray-700 text-base leading-relaxed">
                  {card.description}
                </p>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
