import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authApi } from '../lib/api';
import logger from '../lib/logger';

const INVIGILATOR_EMAILS = [
  'admin@ucp.edu.pk',
  'abidbashir@ucp.edu.pk',
  'ahsan.azhar@ucp.edu.pk',
  'zahid.hussain@ucp.edu.pk',
  'zain.asghar@ucp.edu.pk',
  'saad.ali@ucp.edu.pk'
];

const InvigilatorLoginPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // Filter emails based on input
  const suggestions = useMemo(() => {
    if (!email.trim()) return [];
    return INVIGILATOR_EMAILS.filter(e => 
      e.toLowerCase().includes(email.toLowerCase())
    );
  }, [email]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (selectedEmail) => {
    setEmail(selectedEmail);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email format
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.loginInvigilator(email);
      logger.debug('Invigilator login response:', response);
      login({
        ...response.user,
        email: email
      });
      toast.success(`Welcome, ${email}!`);
      // Auto-select ongoing exam (if any) and go to dashboard
      try {
        const allExams = await (await import('./invigilator/SelectExam')).then(m => m.default) || null;
      } catch (e) {
        // ignore module import failure; fallback to API fetch below
      }
      try {
        const { examsApi } = await import('../lib/api');
        const allExams = await examsApi.getAll();
        const now = new Date();
        const currentDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const ongoing = (allExams || []).filter(exam => {
          if (!exam.invigilator_email || exam.invigilator_email !== email) return false;
          if (exam.status !== 'scheduled' || exam.exam_date !== currentDate) return false;
          if (!exam.exam_time || !exam.end_time) return false;
          const toTime = (t) => {
            const [h,m] = t.split(':'); return `${String(h).padStart(2,'0')}:${String(m||'0').padStart(2,'0')}`;
          };
          return currentTime >= toTime(exam.exam_time) && currentTime <= toTime(exam.end_time);
        });

        if (ongoing.length > 0) {
          sessionStorage.setItem('selectedExam', JSON.stringify(ongoing[0]));
        } else {
          sessionStorage.removeItem('selectedExam');
        }
      } catch (err) {
        logger.warn('Unable to auto-select exam:', err);
      }
      navigate('/invigilator/dashboard');
    } catch (error) {
      logger.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-200 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Login Card */}
        <div className="bg-slate-500 rounded-3xl shadow-2xl p-12">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white hover:text-blue-200 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Home</span>
          </button>

          {/* Title */}
          <h1 className="text-4xl font-bold text-white text-center mb-3">
            Invigilator Login
          </h1>
          <p className="text-white/70 text-center mb-12">
            Enter your email to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input with Suggestions */}
            <div className="relative">
              <label className="block text-white font-semibold mb-2">
                Email Address:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={handleEmailChange}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Enter your email"
                  autoComplete="off"
                  required
                  className="w-full h-14 px-6 rounded-full bg-neutral-300 text-gray-700 text-lg placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg z-10 overflow-hidden">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectSuggestion(suggestion)}
                        className="w-full px-6 py-3 text-left text-gray-800 hover:bg-blue-100 transition-colors border-b border-gray-100 last:border-b-0 font-medium"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="flex items-center justify-between pt-4">
              {/* Info Text */}
              <p className="text-white text-sm">
                Enter your email to view your exams
              </p>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={loading || !email}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-medium rounded-full transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'LOADING...' : 'CONTINUE'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvigilatorLoginPage;
