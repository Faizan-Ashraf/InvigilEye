import React from 'react';

/**
 * Standardized input component with consistent styling
 * Used across both admin and invigilator dashboards
 */
export const StandardInput = ({ label, error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-gray-900 font-semibold mb-2">
          {label}
        </label>
      )}
      <input
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Standardized textarea component
 */
export const StandardTextarea = ({ label, error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-gray-900 font-semibold mb-2">
          {label}
        </label>
      )}
      <textarea
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-gray-900"
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

/**
 * Standardized select component
 */
export const StandardSelect = ({ label, error, children, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-gray-900 font-semibold mb-2">
          {label}
        </label>
      )}
      <select
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 appearance-none"
        {...props}
      >
        {children}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default StandardInput;

