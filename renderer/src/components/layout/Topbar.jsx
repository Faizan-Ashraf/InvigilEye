import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

// Get ipcRenderer safely
const getIpcRenderer = () => {
  if (typeof window !== 'undefined' && window.require) {
    try {
      return window.require('electron').ipcRenderer;
    } catch (err) {
      return null;
    }
  }
  return null;
};

const Topbar = ({ title }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Stop detection before logout
    try {
      const ipc = getIpcRenderer();
      if (ipc) {
        await ipc.invoke('stop-detection');
      }
    } catch (err) {
      console.error('Error stopping detection on logout:', err);
    }
    
    // Clear detection state from localStorage
    localStorage.removeItem('detectionActive');
    
    logout();
    navigate('/');
  };

  const handleHome = async () => {
    // Stop detection before going home
    try {
      const ipc = getIpcRenderer();
      if (ipc) {
        await ipc.invoke('stop-detection');
      }
    } catch (err) {
      console.error('Error stopping detection on home:', err);
    }
    
    // Clear detection state
    localStorage.removeItem('detectionActive');
    
    navigate('/');
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between px-6 py-6 shadow-md">
      <div className="flex items-center gap-4">
        <h1 className="text-white text-2xl font-bold italic tracking-wide">
          INVIGILEYE
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleHome}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-white/30 flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        {user && (
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
};

export default Topbar;

