import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monitoringApi } from '../../lib/api';
import logger from '../../lib/logger';
import { 
  ClipboardCheck, 
  Camera, 
  MonitorPlay, 
  AlertTriangle,
  FileText,
  MapPin,
  Users,
  Calendar,
  Clock,
  Shield
} from 'lucide-react';

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

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState(null);
  const [detectionActive, setDetectionActive] = useState(() => {
    return localStorage.getItem('detectionActive') === 'true';
  });
  const [snapshotCount, setSnapshotCount] = useState(0);

  const dashboardCards = [
    {
      title: 'Start Invigilation',
      description: 'Monitor live student feed with AI-powered detection.',
      icon: MonitorPlay,
      bgColor: 'bg-gradient-to-br from-amber-600 to-orange-500',
      borderColor: 'border-amber-500/30',
      glowColor: 'shadow-amber-500/20',
      action: 'startInvigilation'
    },
    {
      title: 'View Attendance',
      description: 'Mark or update attendance manually in real-time.',
      icon: ClipboardCheck,
      bgColor: 'bg-gradient-to-br from-blue-600 to-cyan-500',
      borderColor: 'border-blue-500/30',
      glowColor: 'shadow-blue-500/20',
      route: '/invigilator/attendance'
    },
    {
      title: 'View Snapshots',
      description: 'Browse captured evidence for suspicious behavior.',
      icon: Camera,
      bgColor: 'bg-gradient-to-br from-emerald-600 to-teal-500',
      borderColor: 'border-emerald-500/30',
      glowColor: 'shadow-emerald-500/20',
      route: '/invigilator/snapshots'
    },
    {
      title: 'UMC Request',
      description: 'Report unfair means case with snapshot and note.',
      icon: AlertTriangle,
      bgColor: 'bg-gradient-to-br from-rose-600 to-pink-500',
      borderColor: 'border-rose-500/30',
      glowColor: 'shadow-rose-500/20',
      route: '/invigilator/alerts'
    },
    {
      title: 'Material Request',
      description: 'Request extra sheets or question papers instantly.',
      icon: FileText,
      bgColor: 'bg-gradient-to-br from-purple-600 to-indigo-500',
      borderColor: 'border-purple-500/30',
      glowColor: 'shadow-purple-500/20',
      route: '/invigilator/material-request'
    }
  ];

  // Load snapshot metadata
  const loadSnapshotsInfo = async (examId) => {
    try {
      if (!examId) return;
      const data = await monitoringApi.getSnapshots(examId);
      const snaps = data.snapshots || [];
      setSnapshotCount(snaps.length);
    } catch (e) {
      console.warn('Failed to load snapshot info:', e);
    }
  };

  // Refresh snapshot info periodically
  useEffect(() => {
    if (!selectedExam) return;
    loadSnapshotsInfo(selectedExam.id);
    const t = setInterval(() => loadSnapshotsInfo(selectedExam.id), 3000);
    return () => clearInterval(t);
  }, [selectedExam]);

  // Persist detection status
  useEffect(() => {
    localStorage.setItem('detectionActive', detectionActive);
  }, [detectionActive]);

  // Stop detection on unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (detectionActive) {
        await stopDetectionAsync();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [detectionActive]);

  // Listen for logout
  useEffect(() => {
    const handleStorageChange = (e) => {
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

  // Load selected exam
  useEffect(() => {
    const examData = sessionStorage.getItem('selectedExam');
    if (examData) {
      try {
        setSelectedExam(JSON.parse(examData));
      } catch (err) {
        console.error('Error parsing selectedExam:', err);
        setSelectedExam(null);
      }
    }
  }, []);

  // IPC listeners
  useEffect(() => {
    const ipc = getIpcRenderer();
    if (!ipc) return;

    const onStopped = (event, data) => {
      setDetectionActive(false);
    };

    const onError = (event, data) => {
      setDetectionActive(false);
      const msg = data?.error || data?.message || 'Detection error occurred';
      alert('Detection error: ' + msg);
    };

    ipc.on('detection-stopped', onStopped);
    ipc.on('detection-error', onError);

    return () => {
      try {
        ipc.removeListener('detection-stopped', onStopped);
        ipc.removeListener('detection-error', onError);
      } catch (e) {
        logger.warn('Error removing ipc listeners:', e);
      }
    };
  }, []);

  // Check exam time
  useEffect(() => {
    if (!selectedExam) return;

    const checkExamTime = async () => {
      const endTime = new Date(`${selectedExam.exam_date} ${selectedExam.end_time}`);
      const now = new Date();

      if (now >= endTime) {
        logger.info('Exam time ended - stopping detection');

        try {
          const ipc = getIpcRenderer();
          if (ipc) {
            await ipc.invoke('stop-detection');
          }
          try { await monitoringApi.stopDetection(selectedExam.id); } catch (e) { logger.warn('Backend stop failed:', e); }
        } catch (err) {
          logger.error('Error stopping detection:', err);
        }
        setDetectionActive(false);

        try {
          await monitoringApi.deleteSnapshots(selectedExam.id);
        } catch (err) {
          logger.warn('Cleanup error:', err);
        }

        sessionStorage.removeItem('selectedExam');
        navigate('/invigilator/login');
      }
    };

    const interval = setInterval(checkExamTime, 30000);
    checkExamTime();

    return () => clearInterval(interval);
  }, [selectedExam, detectionActive, navigate]);

  const handleStartInvigilation = async () => {
    if (!selectedExam) {
      alert('Please select an exam first.');
      return;
    }

    if (detectionActive) {
      // Stop detection
      try {
        const ipc = getIpcRenderer();
        if (!ipc) {
          alert('Not running in Electron environment');
          return;
        }
        const result = await ipc.invoke('stop-detection');
        try { await monitoringApi.stopDetection(selectedExam.id); } catch (e) { console.warn('Backend stop failed:', e); }

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
    } else {
      // Start detection
      try {
        const ipc = getIpcRenderer();
        if (!ipc) {
          alert('Not running in Electron environment');
          return;
        }
        
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
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Header - Exactly like admin dashboard */}
      <div className="relative mb-12 text-center">
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <h1 className="relative text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Invigilator Dashboard
        </h1>
      </div>

      {/* Exam Info Card - Similar to admin's prominent card but different content */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="relative group w-full overflow-hidden rounded-3xl transition-all duration-500">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
          
          {/* Main Card */}
          <div className="relative z-10 p-8 md:p-10 rounded-3xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                 
                  <div>
                    {selectedExam ? (
                      <>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                          {selectedExam.title}
                        </h2>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                            detectionActive 
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {detectionActive ? 'Monitoring Active' : 'Session Ready'}
                          </span>
                          <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium border border-blue-500/30">
                            {selectedExam.section || 'All Sections'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                          No Exam Selected
                        </h2>
                        <p className="text-slate-300">Please login to access your assigned exams</p>
                      </>
                    )}
                  </div>
                </div>
                
                {selectedExam && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                      <MapPin className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-xs text-slate-400">Venue</p>
                        <p className="font-semibold text-slate-200">{selectedExam.venue}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                      <Calendar className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-xs text-slate-400">Date</p>
                        <p className="font-semibold text-slate-200">{selectedExam.exam_date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-xs text-slate-400">Start Time</p>
                        <p className="font-semibold text-slate-200">{selectedExam.exam_time}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
                      <Users className="w-5 h-5 text-purple-400" />
                      <div>
                        <p className="text-xs text-slate-400">End Time</p>
                        <p className="font-semibold text-slate-200">{selectedExam.end_time}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {!selectedExam && (
                <div className="flex-shrink-0">
                  <button
                    onClick={() => navigate('/invigilator/login')}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-medium hover:from-blue-700 hover:to-cyan-600 transition-all duration-300"
                  >
                    Go to Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Start Invigilation Card - Like admin's first card but with start/stop button */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="relative group w-full overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]">
          {/* Background with conditional gradient */}
          <div className={`${detectionActive ? 'bg-gradient-to-br from-red-600 to-rose-500' : 'bg-gradient-to-br from-amber-600 to-orange-500'} p-8 md:p-10 rounded-3xl relative z-10`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                    <MonitorPlay className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      {dashboardCards[0].title}
                    </h2>
                    <p className="text-white/90 text-lg leading-relaxed max-w-2xl">
                      {dashboardCards[0].description}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleStartInvigilation}
                  disabled={!selectedExam}
                  className={`px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 whitespace-nowrap flex-shrink-0 shadow-lg ${
                    !selectedExam
                      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60 shadow-md'
                      : detectionActive
                      ? 'bg-gradient-to-br from-red-700 to-red-800 text-white hover:from-red-800 hover:to-red-900 hover:shadow-xl hover:scale-105 active:scale-100'
                      : 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white hover:from-emerald-700 hover:to-emerald-900 hover:shadow-xl hover:scale-105 active:scale-100'
                  }`}
                >
                  {detectionActive ? 'Stop Detection' : 'Start Detection'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
        </div>
      </div>

      {/* Grid of Feature Cards - Exactly like admin's grid */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.slice(1).map((card, index) => (
            <button
              key={index}
              onClick={() => navigate(card.route)}
              disabled={!selectedExam}
              className="relative group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {/* Background Glow */}
              <div className={`absolute inset-0 ${card.bgColor} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>
              
              {/* Main Card */}
              <div className="relative z-10 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 h-full text-left">
                <div className="flex flex-col h-full">
                  {/* Icon and Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${card.bgColor} shadow-lg`}>
                      <card.icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                      <div className="w-12 h-1 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-50"></div>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-slate-300/80 text-base leading-relaxed flex-1 mb-6">
                    {card.description}
                  </p>
                  
                  {/* Extra info for snapshots */}
                  {card.title === 'View Snapshots' && (
                    <div className="mb-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Live Count</span>
                        <span className="text-lg font-bold text-emerald-400">{snapshotCount}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                      Click to access →
                    </div>
                    <div className="p-2 rounded-lg bg-slate-700/50 group-hover:bg-slate-700 transition-colors">
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;