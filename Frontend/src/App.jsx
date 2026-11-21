import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { isAuthenticated } from './services/api';
import AppShell from './components/AppShell';
import WakeBanner from './components/WakeBanner';

// Each page is its own chunk, so the landing page doesn't download the dashboard.
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to="/dashboard" replace /> : children;
}

function PageFallback() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', color: 'var(--text-3)' }} role="status">
      Loading…
    </div>
  );
}

function App() {
  return (
    <Router>
      <WakeBanner />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<PrivateRoute><AppShell /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
