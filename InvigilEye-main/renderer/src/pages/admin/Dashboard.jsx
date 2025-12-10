import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const dashboardCards = [
    {
      title: 'Create Exam',
      description: 'Setup new exam session with invigilator and student info.',
      bgColor: 'bg-blue-100',
      textColor: 'text-gray-800',
      path: '/admin/create-exam',
    },
    {
      title: 'View Exams',
      description: 'Check, edit or delete any previously created exam.',
      bgColor: 'bg-green-100',
      textColor: 'text-gray-800',
      path: '/admin/manage-exams',
    },
    {
      title: 'View UMC Request',
      description: 'Review unfair means case requests from invigilators.',
      bgColor: 'bg-yellow-100',
      textColor: 'text-gray-800',
      path: '/admin/reports',
    },
    {
      title: 'View Material Request',
      description: 'See material requests submitted by invigilators.',
      bgColor: 'bg-pink-100',
      textColor: 'text-gray-800',
      path: '/admin/view-requests',
    },
    {
      title: 'Download Reports',
      description: 'Download exam attendance and activity logs.',
      bgColor: 'bg-purple-100',
      textColor: 'text-gray-800',
      path: '/admin/download-reports',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Page Title */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-normal text-gray-700">
          Admin Dashboard - InvigilEye
        </h1>
      </div>

      {/* Action Cards */}
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Create Exam - Full Width at Top */}
        <button
          onClick={() => navigate(dashboardCards[0].path)}
          className={`${dashboardCards[0].bgColor} p-10 rounded-2xl text-left transition-all duration-200 
            hover:shadow-md cursor-pointer border-0 w-full`}
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {dashboardCards[0].title}
          </h2>
          <p className="text-gray-700 text-base leading-relaxed">
            {dashboardCards[0].description}
          </p>
        </button>

        {/* Remaining Cards - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {dashboardCards.slice(1).map((card, index) => (
            <button
              key={index}
              onClick={() => navigate(card.path)}
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

