import React, { useState, useEffect } from 'react';
import { Camera, Download, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader, PageContainer } from '../../components/common';
import { monitoringApi } from '../../lib/api';
import logger from '../../lib/logger';

// Check if running in Electron
const { ipcRenderer } = window.require?.('electron') || {};

const Snapshots = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [selectedExam, setSelectedExam] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  // Load selected exam and snapshots on mount
  useEffect(() => {
    const examData = sessionStorage.getItem('selectedExam');
    if (examData) {
      const exam = JSON.parse(examData);
      setSelectedExam(exam);
      loadSnapshots(exam.id);
    } else {
      toast.warning('No exam selected. Redirecting to login...');
      setTimeout(() => navigate('/invigilator/login'), 2000);
    }
  }, []);

  // Auto-refresh snapshots every 3 seconds
  useEffect(() => {
    if (!selectedExam) return;
    const interval = setInterval(() => {
      loadSnapshots(selectedExam.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedExam]);

  // Close preview modal when detection stops or errors out (from main process)
  useEffect(() => {
    if (!ipcRenderer) return;

    const handleStopped = () => {
      setSelectedSnapshot(null);
    };
    const handleError = () => {
      setSelectedSnapshot(null);
    };

    ipcRenderer.on('detection-stopped', handleStopped);
    ipcRenderer.on('detection-error', handleError);

    return () => {
      try {
        ipcRenderer.removeListener('detection-stopped', handleStopped);
        ipcRenderer.removeListener('detection-error', handleError);
      } catch (e) {
        // ignore if ipcRenderer already disposed
      }
    };
  }, []);

  const loadSnapshots = async (examId) => {
    try {
      setLoading(true);
      const data = await monitoringApi.getSnapshots(examId);
      logger.debug('Snapshots loaded:', data);
      
      // Convert relative URLs to full URLs and safely encode path segments
      const snapshotsWithFullURL = (data.snapshots || []).map(snap => {
        const url = snap.url && snap.url.startsWith('http')
          ? snap.url
          : `http://localhost:5001${snap.url.split('/').map(segment => encodeURIComponent(segment)).join('/')}`;
        return { ...snap, url };
      });

      if (snapshotsWithFullURL.length > 0) {
        logger.debug('First snapshot URL (encoded):', snapshotsWithFullURL[0].url);
      }
      setSnapshots(snapshotsWithFullURL);
    } catch (err) {
      logger.error('Error loading snapshots:', err);
      toast.error('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (snapshot) => {
    try {
      const response = await fetch(snapshot.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = snapshot.filename || 'snapshot.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Snapshot downloaded successfully');
    } catch (err) {
      logger.error('Download error:', err);
      toast.error('Failed to download snapshot');
    }
  };

  // Helper function to extract and format timestamp from filename
  const getFormattedDate = (filename) => {
    // Format: Suspect_Student 0_20251206_001228.jpg
    // Extract timestamp: 20251206_001228
    const match = filename.match(/(\d{8})_(\d{6})/);
    if (match) {
      const dateStr = match[1]; // 20251206
      const timeStr = match[2]; // 001228
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = timeStr.substring(0, 2);
      const minute = timeStr.substring(2, 4);
      const second = timeStr.substring(4, 6);
      
      return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
    }
    return 'Unknown date';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <PageHeader 
        title="Snapshot Gallery" 
        backRoute="/invigilator/dashboard"
      />

      <PageContainer>
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Snapshots for {selectedExam?.title || 'Exam'} ({snapshots.length})
            </h2>
            <div className="flex gap-3">
              <button
                onClick={() => selectedExam && loadSnapshots(selectedExam.id)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          {snapshots.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">{loading ? 'Loading snapshots...' : 'No snapshots captured yet'}</p>
              <p className="text-gray-400 text-sm mt-2">Snapshots will appear here when suspicious behavior is detected</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.filename}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white flex flex-col"
                >
                  {/* Image - Clickable for preview */}
                  <div 
                    className="aspect-video bg-gray-200 flex items-center justify-center relative overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <img
                      src={snapshot.url}
                      alt={snapshot.filename}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext x="200" y="150" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage Error%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="p-4 flex-grow">
                    <p className="text-sm font-medium text-gray-900 truncate">{snapshot.filename}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getFormattedDate(snapshot.filename)}
                    </p>
                  </div>
                  
                  {/* Download Button at Bottom */}
                  <div className="px-4 pb-4 border-t">
                    <button
                      onClick={() => handleDownload(snapshot)}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PageContainer>

      {/* Preview Modal - Full Screen */}
      {selectedSnapshot && (
        <div 
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={() => setSelectedSnapshot(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedSnapshot(null)}
            className="absolute top-4 right-4 p-2 bg-white hover:bg-gray-200 rounded-full transition-colors z-50"
            aria-label="Close"
          >
            <X className="w-8 h-8 text-black" />
          </button>
          
          {/* Full Screen Image */}
          <img
            src={selectedSnapshot.url}
            alt={selectedSnapshot.filename}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext x="200" y="150" font-size="16" text-anchor="middle" dominant-baseline="middle" fill="%23999"%3EImage Error%3C/text%3E%3C/svg%3E';
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Snapshots;

