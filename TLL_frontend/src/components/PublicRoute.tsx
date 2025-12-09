import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Nếu đã login, redirect về dashboard
  return isAuthenticated ? <Navigate to="/inbox" replace /> : <>{children}</>;
};
