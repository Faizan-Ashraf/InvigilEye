import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  const dashboardCards = [
    {
      title: 'Create Exam',
      description: 'Setup new exam session with invigilator and student info.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14z" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-blue-600 to-cyan-500',
      borderColor: 'border-blue-500/30',
      glowColor: 'shadow-blue-500/20',
      path: '/admin/create-exam',
    },
    {
      title: 'View Exams',
      description: 'Check, edit or delete any previously created exam.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-emerald-600 to-teal-500',
      borderColor: 'border-emerald-500/30',
      glowColor: 'shadow-emerald-500/20',
      path: '/admin/manage-exams',
    },
    {
      title: 'View UMC Request',
      description: 'Review unfair means case requests from invigilators.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-amber-600 to-orange-500',
      borderColor: 'border-amber-500/30',
      glowColor: 'shadow-amber-500/20',
      path: '/admin/reports',
    },
    {
      title: 'View Material Request',
      description: 'See material requests submitted by invigilators.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-purple-600 to-pink-500',
      borderColor: 'border-purple-500/30',
      glowColor: 'shadow-purple-500/20',
      path: '/admin/view-requests',
    },
    {
      title: 'Download Reports',
      description: 'Download exam attendance and activity logs.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgColor: 'bg-gradient-to-br from-indigo-600 to-blue-500',
      borderColor: 'border-indigo-500/30',
      glowColor: 'shadow-indigo-500/20',
      path: '/admin/download-reports',
    },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Animated Header */}
      <div className="relative mb-12 text-center">
        {/* Background Glow Effect */}
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <h1 className="relative text-4xl lg:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
          Admin Dashboard
        </h1>
    
      </div>

      {/* Main Action Card - Enhanced */}
      <div className="max-w-6xl mx-auto mb-8">
        <button
          onClick={() => navigate(dashboardCards[0].path)}
          className="relative group w-full overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Card Background with Gradient */}
          <div className={`${dashboardCards[0].bgColor} p-8 md:p-10 rounded-3xl relative z-10`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm">
                    {dashboardCards[0].icon}
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white">
                    {dashboardCards[0].title}
                  </h2>
                </div>
                <p className="text-white/90 text-lg md:text-xl max-w-2xl leading-relaxed">
                  {dashboardCards[0].description}
                </p>
              </div>
              <div className="flex-shrink-0">
                <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm transform transition-transform duration-300 group-hover:translate-x-2">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          {/* Animated Border */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-3xl"></div>
        </button>
      </div>

      {/* Grid Cards - Enhanced */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dashboardCards.slice(1).map((card, index) => (
            <button
              key={index}
              onClick={() => navigate(card.path)}
              className="relative group overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.03] active:scale-[0.97]"
            >
              {/* Background Glow */}
              <div className={`absolute inset-0 ${card.bgColor} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`}></div>
              
              {/* Main Card */}
              <div className="relative z-10 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300 h-full text-left">
                <div className="flex flex-col h-full">
                  {/* Icon and Title */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`p-3 rounded-xl ${card.bgColor} shadow-lg`}>
                      <div className="text-white">{card.icon}</div>
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