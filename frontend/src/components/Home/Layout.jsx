// src/components/Home/Layout.jsx
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Home, BookOpen, Brain, BarChart3 } from 'lucide-react';

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', path: '/', icon: Home, label: 'Home' },
    { id: 'tutorial', path: '/tutorial', icon: BookOpen, label: 'Tutorial' },
    { id: 'learn', path: '/learn', icon: Brain, label: 'Learn' },
    { id: 'stats', path: '/stats', icon: BarChart3, label: 'Stats' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Braille Master</h1>
              <p className="text-xs text-gray-600">Learn Braille with AI</p>
            </div>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.username}</p>
                <p className="text-xs text-gray-600">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8">
            {navItems.map(({ path, icon: Icon, label }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 font-medium transition-all ${
                  location.pathname === path
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon size={20} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Nested route content will render here */}
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">About</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Braille Master is an AI-powered learning platform designed to help you master Braille alphabet
                with interactive lessons and adaptive practice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Interactive Tutorial Mode</li>
                <li>• Adaptive Learning Path</li>
                <li>• Voice Recognition</li>
                <li>• Progress Tracking</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Documentation</li>
                <li>• FAQs</li>
                <li>• Contact Support</li>
                <li>• Privacy Policy</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8 flex items-center justify-between">
            <p className="text-sm text-gray-600">© 2025 Braille Master. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-600 hover:text-gray-900">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
