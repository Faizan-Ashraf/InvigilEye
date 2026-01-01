import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authApi } from '../lib/api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authApi.login(username, password, 'admin');
      console.log('Login response:', response);
      login(response.user);
      toast.success(`Welcome back, ${response.user.full_name}!`);
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please check your credentials.');
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
            Admin Login
          </h1>
          <p className="text-white/70 text-center mb-12">
            Sign in to access the admin dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email/Username Input */}
            <input
              type="text"
              placeholder="Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-14 px-6 rounded-full bg-neutral-300 text-gray-700 text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              required
            />

            {/* Password Input */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-14 px-6 rounded-full bg-neutral-300 text-gray-700 text-lg placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-neutral-400"
              required
            />

            {/* Bottom Section */}
            <div className="flex items-center justify-between pt-4">
              {/* Forget Password Link */}
              <button
                type="button"
                onClick={() => toast.info('Please contact your administrator')}
                className="text-white text-base hover:underline focus:outline-none"
              >
                Forget Password?
              </button>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-lg font-medium rounded-full transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? 'LOADING...' : 'LOGIN'}
              </button>
            </div>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-xs text-white/70 text-center mb-2">Demo Credentials:</p>
            <div className="text-center">
              <span className="text-sm text-white/90 font-mono">admin / admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

