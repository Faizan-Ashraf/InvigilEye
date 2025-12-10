import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Standardized page header with blue gradient background
 * Used across both admin and invigilator dashboards
 */
const PageHeader = ({ title, backRoute, backText = 'Dashboard', badge = null }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
      <div className="max-w-7xl mx-auto flex items-center">
        {backRoute && (
          <button
            onClick={() => navigate(backRoute)}
            className="flex items-center gap-2 text-white hover:text-blue-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{backText}</span>
          </button>
        )}
        <div className="flex-1 text-center">
          <h1 className="text-3xl font-semibold">{title}</h1>
          {badge && <div className="mt-1">{badge}</div>}
        </div>
        <div className="w-32"></div> {/* Spacer for centering */}
      </div>
    </div>
  );
};

export default PageHeader;

