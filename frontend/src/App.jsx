// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import Home from './components/Home/Home';
import { TutorialMode } from './components/Home/Tutorials';
import { Statistics } from './components/Home/Stastics';
import LearningMode from './components/Home/Learn'; // ✅ Add this import
import { Layout } from './components/Home/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="animate-spin text-blue-600" size={48} />
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingSpinner />;

  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />

        {/* Protected Layout Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="tutorial" element={<TutorialMode />} />
          <Route path="learn" element={<LearningMode />} /> {/* ✅ Replaced placeholder */}
          <Route path="stats" element={<Statistics />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
