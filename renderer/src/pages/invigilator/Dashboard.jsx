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
  const [detectionActive, setDetectionActive] = useState(() => {
    // Load detection status from localStorage on mount
    return localStorage.getItem('detectionActive') === 'true';
  });

  // Snapshot preview info for dashboard card
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [latestSnapshot, setLatestSnapshot] = useState(null);

  // Load snapshot metadata (count + latest url)
  const loadSnapshotsInfo = async (examId) => {
    try {
      if (!examId) return;
      const data = await monitoringApi.getSnapshots(examId);
      const snaps = data.snapshots || [];
      setSnapshotCount(snaps.length);
      if (snaps.length > 0) {
        // Convert to full encoded URL
        const first = snaps[0];
        const url = first.url && first.url.startsWith('http')
          ? first.url
          : `http://localhost:5001${first.url.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
        setLatestSnapshot(url);
      } else {
        setLatestSnapshot(null);
      }
    } catch (e) {
      console.warn('Failed to load snapshot info:', e);
    }
  };

  // Refresh snapshot info periodically when exam selected (every 3s)
  useEffect(() => {
    if (!selectedExam) return;
    loadSnapshotsInfo(selectedExam.id);
    const t = setInterval(() => loadSnapshotsInfo(selectedExam.id), 3000);
    return () => clearInterval(t);
  }, [selectedExam]);

  // Persist detection status to localStorage
  useEffect(() => {
    localStorage.setItem('detectionActive', detectionActive);
  }, [detectionActive]);

  // Stop detection when user signs out or leaves
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (detectionActive) {
        await stopDetectionAsync();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [detectionActive]);

  // Listen for logout/signout
  useEffect(() => {
    const handleStorageChange = (e) => {
      // If user token is removed, stop detection
      if (e.key === 'authToken' && !e.newValue && detectionActive) {
        stopDetectionAsync();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [detectionActive]);

  const stopDetectionAsync = async () => {
    try {
      const ipc = getIpcRenderer();
      if (ipc) {
        await ipc.invoke('stop-detection');
      }
    } catch (err) {
      logger.error('Error stopping detection:', err);
    }
    setDetectionActive(false);
  };

  // Load selected exam from sessionStorage on mount
  useEffect(() => {
    const examData = sessionStorage.getItem('selectedExam');
    if (examData) {
      try {
        setSelectedExam(JSON.parse(examData));
      } catch (err) {
        console.error('Error parsing selectedExam from sessionStorage:', err);
        setSelectedExam(null);
      }
    }
  }, []);

  useEffect(() => {
    const ipc = getIpcRenderer();
    if (!ipc) return;

    const onStopped = (event, data) => {
      setDetectionActive(false);
      // If snapshots page/modal is open, ensure it's closed
      try {
        // If this file has state for preview modal (shared via context), clear it.
        // Here we clear local selected snapshot if present in this component.
        // If snapshot modal lives in another component, ensure that component also listens to these events.
        // We don't have direct access to that component here, but closing the detection should stop further snapshots.
      } catch (e) {
        logger.warn('Error during onStopped handler:', e);
      }
    };

    const onError = (event, data) => {
      setDetectionActive(false);
      const msg = data && (data.error || data.message) ? (data.error || data.message) : 'Detection error occurred';
      // Show error to user
      try {
        alert('Detection error: ' + msg);
      } catch (e) {
        console.error('Unable to show alert for detection error:', e);
      }
    };

    ipc.on('detection-stopped', onStopped);
    ipc.on('detection-error', onError);

    // Also listen to detection output logs if needed
    const onOutput = (event, payload) => {
      // Optionally handle or forward logs
      // logger.debug('Detection output:', payload);
    };
    ipc.on('detection-output', onOutput);

    return () => {
      try {
        ipc.removeListener('detection-stopped', onStopped);
        ipc.removeListener('detection-error', onError);
      } catch (e) {
        logger.warn('Error removing ipc listeners:', e);
      }
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
            const res = await ipc.invoke('stop-detection');
            logger.debug('Stop detection result:', res);
          }
          try { await monitoringApi.stopDetection(selectedExam.id); } catch (e) { logger.warn('Backend stop failed:', e); }
        } catch (err) {
          logger.error('Error stopping detection:', err);
        }
        setDetectionActive(false);

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

    // Check every 30 seconds
    const interval = setInterval(checkExamTime, 30000);
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
        {/* Start Invigilation - Card with Start Button on Right */}
        {dashboardCards
          .filter(card => card.id === 3)
          .map((card) => (
            <div
              key={card.id}
              className={`${card.bgColor} p-10 rounded-2xl transition-all duration-200 border-0 w-full flex items-center justify-between`}
            >
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  {card.title}
                </h2>
                <p className="text-gray-700 text-base leading-relaxed">
                  {card.description}
                </p>
              </div>
              {detectionActive ? (
                <button
                  onClick={async () => {
                    try {
                      const ipc = getIpcRenderer();
                      if (!ipc) {
                        alert('Not running in Electron environment');
                        return;
                      }
                      const result = await ipc.invoke('stop-detection');
                      // Also call backend stop as a safety net
                      try { await monitoringApi.stopDetection(selectedExam.id); } catch (e) { console.warn('Backend stop-detection failed:', e); }

                      if (result.success) {
                        setDetectionActive(false);
                        alert('Detection stopped');
                      } else {
                        alert('Failed to stop: ' + result.message);
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Error stopping detection: ' + (err.message || err));
                    }
                  }}
                  className={`ml-6 px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-lg bg-red-600 text-white hover:bg-red-700 hover:shadow-xl`}
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (!selectedExam) {
                      alert('Please select an exam first.');
                      return;
                    }
                    try {
                      const ipc = getIpcRenderer();
                      if (!ipc) {
                        alert('Not running in Electron environment');
                        return;
                      }
                      // Ask user for camera index if they want to override the default
                      let cameraIndex;
                      try {
                        const camStr = prompt('Enter camera index (leave blank for default 0):');
                        if (camStr !== null && camStr !== '') {
                          const parsed = Number(camStr);
                          if (!Number.isNaN(parsed)) cameraIndex = parsed;
                        }
                      } catch (e) { /* ignore prompt errors */ }

                      const result = await ipc.invoke('start-detection', selectedExam.id, cameraIndex);
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
                  disabled={!selectedExam}
                  className={`ml-6 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-lg ${
                    !selectedExam
                      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60 shadow-md'
                      : 'bg-gradient-to-br from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 hover:shadow-xl hover:scale-105 active:scale-100'
                  }`}
                >
                  Start
                </button>
              )}
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
                <div className="flex items-start">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                      {card.title}
                    </h2>
                    <p className="text-gray-700 text-base leading-relaxed">
                      {card.description}
                    </p>

                    {card.id === 2 && (
                      <p className="text-sm text-gray-600 mt-3">Snapshots: <span className="font-semibold">{snapshotCount}</span></p>
                    )}
                  </div>


                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

