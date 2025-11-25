import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const InboxPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎉 Project Status</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.name || user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/inbox"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Go to Dashboard →
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
              <span className="text-4xl">🎨</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              All 3 Phrases Complete! 🚀
            </h2>
            <p className="text-gray-600 mb-6">
              Full-stack email dashboard with advanced auth & beautiful UI
            </p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 via-green-50 to-purple-50 border-2 border-gray-200 rounded-lg p-6 text-left max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Phrase 1 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  Phrase 1: Auth
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Login/Register</li>
                  <li>• Protected Routes</li>
                  <li>• Token in Memory</li>
                  <li>• Persistent Sessions</li>
                </ul>
              </div>

              {/* Phrase 2 */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  Phrase 2: Advanced
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Auto-Refresh Token</li>
                  <li>• Axios Interceptors</li>
                  <li>• Concurrency Control</li>
                  <li>• Google OAuth</li>
                </ul>
              </div>

              {/* Phrase 3 */}
              <div className="bg-white rounded-lg p-4 shadow-sm border-2 border-purple-300">
                <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">🎨</span>
                  Phrase 3: UI (NEW!)
                </h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• 3-Column Layout</li>
                  <li>• Email List & Detail</li>
                  <li>• Folder Navigation</li>
                  <li>• Responsive Design</li>
                  <li>• Search Function</li>
                  <li>• Mock Data Service</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <span>🚀</span>
                Tech Stack Complete
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-600">
                <div>✓ React 18 + TypeScript</div>
                <div>✓ Vite + TailwindCSS</div>
                <div>✓ Zustand + Axios</div>
                <div>✓ React Router v6</div>
                <div>✓ Google OAuth</div>
                <div>✓ JWT Tokens</div>
                <div>✓ Mock Services</div>
                <div>✓ Responsive UI</div>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Current User:</strong> {user?.email}<br />
              <strong>Auth Status:</strong> <span className="text-green-600 font-semibold">Authenticated ✓</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
