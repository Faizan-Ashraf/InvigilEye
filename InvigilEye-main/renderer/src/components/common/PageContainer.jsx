import React from 'react';

/**
 * Standardized page container for content sections
 * Used across both admin and invigilator dashboards
 */
export const PageContainer = ({ children, className = '' }) => {
  return (
    <div className={`max-w-7xl mx-auto p-8 ${className}`}>
      {children}
    </div>
  );
};

/**
 * Standardized content card wrapper
 */
export const ContentCard = ({ children, className = '', title = null }) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {title && (
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
      )}
      <div className={title ? 'p-6' : 'p-8'}>
        {children}
      </div>
    </div>
  );
};

/**
 * Loading spinner component
 */
export const LoadingSpinner = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{message}</p>
      </div>
    </div>
  );
};

export default PageContainer;

