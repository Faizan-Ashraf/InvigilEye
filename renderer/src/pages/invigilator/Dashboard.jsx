import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monitoringApi } from '../../lib/api';

// Safely get ipcRenderer from window (Electron IPC)
const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && window.require) {
    try {
      return window.require('electron').ipcRenderer;
    } catch (err) {
      console.warn('ipcRenderer not available:', err);
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
      console.error('Error stopping detection:', err);
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
        // no-op
      }
    };

    const onError = (event, data) => {
      setDetectionActive(false);
    };

    ipc.on('detection-stopped', onStopped);
    ipc.on('detection-error', onError);

    return () => {
      try {
        ipc.removeListener('detection-stopped', onStopped);
        ipc.removeListener('detection-error', onError);
      } catch (e) {
        // ignore
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
        // Exam time has ended
        console.log('Exam time ended - stopping detection and redirecting');
        
        // Stop detection if running
        if (detectionActive) {
          try {
            const ipc = getIpcRenderer();
            if (ipc) {
              await ipc.invoke('stop-detection');
            }
          } catch (err) {
            console.error('Error stopping detection:', err);
          }
          setDetectionActive(false);
        }

        // Clean up snapshots
        try {
          await monitoringApi.deleteSnapshots(selectedExam.id);
        } catch (err) {
          console.warn('Cleanup error:', err);
        }

        // Auto-redirect to exam selection
        sessionStorage.removeItem('selectedExam');
        navigate('/invigilator/select-exam');
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
              
              <button
                className="ml-4 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
                onClick={async () => {
                  // Stop detection if running
                  if (detectionActive) {
                    try {
                      const ipc = getIpcRenderer();
                      if (ipc) {
                        await ipc.invoke('stop-detection');
                      }
                    } catch (err) {
                      console.error('Error stopping detection:', err);
                    }
                    setDetectionActive(false);
                  }
                  
                  // Do NOT delete snapshots when changing exam.
                  // Snapshots should be retained until the exam actually ends.
                  // Previous behavior deleted them on exam change; keep them now.
                  
                  sessionStorage.removeItem('selectedExam');
                  navigate('/invigilator/select-exam');
                }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Change Exam
                </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto mb-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <p className="text-yellow-800">
              No exam selected. Please select an ongoing exam to monitor.
            </p>
            <button
              onClick={() => navigate('/invigilator/select-exam')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Select Exam
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
                disabled={detectionActive || !selectedExam}
                className={`ml-6 px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-lg ${
                  detectionActive || !selectedExam
                    ? 'bg-gray-400 text-white cursor-not-allowed opacity-60 shadow-md'
                    : 'bg-gradient-to-br from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 hover:shadow-xl hover:scale-105 active:scale-100'
                }`}
              >
                {detectionActive ? 'Detecting...' : 'Start'}
              </button>
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

