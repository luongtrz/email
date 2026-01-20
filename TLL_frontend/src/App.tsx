import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, lazy, Suspense } from 'react';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/auth.store';
import { ErrorBoundary, LoadingSpinner } from './components/common';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { GOOGLE_CLIENT_ID, ROUTES } from './config/constants';

// Lazy load pages for better performance
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const GoogleCallbackPage = lazy(() => import('./pages/GoogleCallbackPage').then(m => ({ default: m.GoogleCallbackPage })));

function App() {
  const initAuth = useAuthStore((state) => state.initAuth);

  // Initialize auth on app load
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <BrowserRouter>
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#fff',
                  color: '#363636',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  borderRadius: '12px',
                  padding: '16px',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <LoadingSpinner size="lg" text="Loading..." />
              </div>
            }>
              <Routes>
                {/* Public Routes */}
                <Route
                  path={ROUTES.LOGIN}
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path={ROUTES.REGISTER}
                  element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  }
                />

                {/* Google OAuth Callback */}
                <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path={ROUTES.INBOX} element={<DashboardPage />} />
                  <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                </Route>

                {/* Default Route */}
                <Route path="/" element={<Navigate to={ROUTES.INBOX} replace />} />
                <Route path="*" element={<Navigate to={ROUTES.INBOX} replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
