import React, { useState, useEffect } from 'react';
import { AlertTriangle, Play, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, PageContainer } from '../../components/common';
import { monitoringApi } from '../../lib/api';
import logger from '../../lib/logger';

const Monitoring = () => {
  const [selectedExam, setSelectedExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    loadSelectedExam();
  }, []);

  // Auto-close detection when exam changes
  useEffect(() => {
    if (isDetecting) {
      stopDetectionAuto();
      toast.info('Exam changed - Detection stopped');
    }
  }, [selectedExam?.id]); // Trigger when exam ID changes

  // Auto-close detection if exam changes or is deselected
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isDetecting) {
        stopDetectionOnUnload();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDetecting, selectedExam]);

  // Check exam time and auto-close detection when time ends
  useEffect(() => {
    if (!selectedExam || !isDetecting) return;

    const checkExamTime = async () => {
      const now = new Date();

      // Use exam_date + end_time to determine precise end timestamp
      try {
        const endTime = new Date(`${selectedExam.exam_date} ${selectedExam.end_time}`);
        if (now >= endTime) {
          await stopDetectionAuto();
          try { await monitoringApi.deleteSnapshots(selectedExam.id); } catch (e) { logger.warn('Failed to delete snapshots after exam end:', e); }
          toast.info('Exam time ended - Detection stopped and snapshots cleaned');
          // Optionally navigate back to dashboard
          // navigate('/invigilator/dashboard');
        }
      } catch (e) {
        logger.warn('Error checking exam end time:', e);
      }
    };

    const interval = setInterval(checkExamTime, 60000); // Check every minute
    // Also check immediately
    checkExamTime();

    return () => clearInterval(interval);
  }, [selectedExam, isDetecting]);

  useEffect(() => {
    if (isDetecting) {
      // Poll for snapshots every 2 seconds when detecting
      const interval = setInterval(() => {
        fetchSnapshots();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isDetecting]);

  const loadSelectedExam = () => {
    try {
      const examData = sessionStorage.getItem('selectedExam');
      if (examData) {
        setSelectedExam(JSON.parse(examData));
      } else {
        toast.error('No exam selected. Please select an exam first.');
      navigate('/invigilator/login');
      }
    } catch (error) {
      logger.error('Error loading selected exam:', error);
      toast.error('Failed to load exam');
      navigate('/invigilator/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchSnapshots = async () => {
    if (!selectedExam) return;
    try {
      const data = await monitoringApi.getSnapshots(selectedExam.id);
      // Convert relative URLs to full URLs and safely encode path segments
      const snapshotsWithFullURL = (data.snapshots || []).map(snap => {
        const url = snap.url && snap.url.startsWith('http')
          ? snap.url
          : `http://localhost:5001${snap.url.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
        return { ...snap, url };
      });
      // Debug: show first encoded URL
      if (snapshotsWithFullURL.length > 0) logger.debug('Monitoring: first snapshot URL (encoded):', snapshotsWithFullURL[0].url);
      setSnapshots(snapshotsWithFullURL);
    } catch (error) {
      logger.error('Error fetching snapshots:', error);
    }
  };

  const startDetection = async () => {
    try {
      setSnapshotsLoading(true);
      
      await monitoringApi.startDetection(selectedExam.id, selectedExam.id);
      
      setIsDetecting(true);
      toast.success('Live Detection Started - Camera opened');
    } catch (error) {
      logger.error('Error starting detection:', error);
      toast.error(error.message || 'Failed to start detection');
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const stopDetectionAuto = async () => {
    try {
      await monitoringApi.stopDetection(selectedExam.id);
    } catch (error) {
      logger.error('Error stopping detection:', error);
    } finally {
      // Ensure UI shows any snapshots that were saved right before stop
      await fetchSnapshots();
      setIsDetecting(false);
    }
  };

  const stopDetectionOnUnload = async () => {
    try {
      if (selectedExam) {
        await monitoringApi.stopDetection(selectedExam.id);
      }
    } catch (error) {
      logger.error('Error stopping detection:', error);
    } finally {
      await fetchSnapshots();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading monitoring...</p>
        </div>
      </div>
    );
  }

  if (!selectedExam) {
    return (
      <div className="min-h-screen bg-gray-100">
        <PageHeader title="Live Invigilation" backRoute="/invigilator/dashboard" />
        <div className="flex items-center justify-center p-16">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Exam Selected</h2>
            <p className="text-gray-600 mb-6">Please select an exam to begin invigilation</p>
            <button
              onClick={() => navigate('/invigilator/login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader title="Live Invigilation" backRoute="/invigilator/dashboard" />

      <PageContainer>
        {/* Exam Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Course</p>
              <p className="font-semibold text-gray-900">{selectedExam.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Date</p>
              <p className="font-semibold text-gray-900">{selectedExam.exam_date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Time</p>
              <p className="font-semibold text-gray-900">{selectedExam.exam_time}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Room</p>
              <p className="font-semibold text-gray-900">{selectedExam.venue}</p>
            </div>
          </div>
        </div>

        {/* Control Section */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Start Invigilation</h2>
          
          <button
            onClick={startDetection}
            disabled={isDetecting || snapshotsLoading || !selectedExam}
            className={`w-full flex items-center justify-center gap-3 px-8 py-5 rounded-lg font-bold text-xl transition-all duration-200 mb-6 ${
              isDetecting || snapshotsLoading || !selectedExam
                ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
            }`}
          >
            <Play className="w-7 h-7" />
            {isDetecting ? 'Detection Running - Exam in Progress' : 'Start Invigilation'}
          </button>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className={`w-3 h-3 rounded-full ${isDetecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              Status: <span className={isDetecting ? 'text-green-600 font-bold' : 'text-gray-600'}>
                {isDetecting ? 'LIVE - Camera is Active' : 'Idle - Ready to start'}
              </span>
            </span>
          </div>
        </div>

        {/* Snapshots Section */}
        {isDetecting && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Captured Snapshots</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSnapshots}
                  disabled={snapshotsLoading}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  <RefreshCw className={`w-4 h-4 ${snapshotsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={async () => {
                    try {
                      await monitoringApi.openSnapshots(selectedExam.id);
                      toast.info('Opened snapshots folder');
                    } catch (err) {
                      console.error('Failed to open snapshots folder:', err);
                      toast.error('Failed to open folder');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Open Folder
                </button>
              </div>
            </div>
            
            {snapshots.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No snapshots captured yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {snapshots.map((snapshot, idx) => (
                  <div key={idx} className="relative bg-gray-100 rounded-lg overflow-hidden aspect-square hover:shadow-lg transition-shadow">
                    <img
                      src={snapshot.url || `http://localhost:5001/api/monitoring/snapshot/${encodeURIComponent(String(snapshot.filename))}`}
                      alt={snapshot.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Ccircle cx="12" cy="12" r="10" fill="%23ddd"/%3E%3C/svg%3E';
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 truncate">
                      {snapshot.filename}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PageContainer>
    </div>
  );
};

export default Monitoring;

