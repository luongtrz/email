import React, { createContext, useContext, useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../services/auth.service';
import { TOKEN_KEY } from '../config/constants';
import type { LoginRequest, RegisterRequest } from '../types/auth.types';

interface AuthContextType {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any;
  setUser: (user: any) => void;
  setAccessToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setAccessToken, setUser, setLoading, logout: clearAuth, isAuthenticated, isLoading, user } = useAuthStore();

  // Initialize auth state khi app load
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      
      // PHRASE 2: Kiểm tra refresh token và auto-refresh để lấy access token
      const refreshToken = localStorage.getItem(TOKEN_KEY.REFRESH);
      
      if (refreshToken) {
        try {
          // Gọi API refresh để lấy access token mới
          const refreshResponse = await authApi.refreshToken(refreshToken);
          
          // Lưu access token vào memory
          setAccessToken(refreshResponse.data.accessToken);
          
          // Update refresh token nếu server trả về mới (token rotation)
          if (refreshResponse.data.refreshToken) {
            localStorage.setItem(TOKEN_KEY.REFRESH, refreshResponse.data.refreshToken);
          }
          
          // Lấy thông tin user
          const profile = await authApi.getProfile();
          setUser(profile.data);
        } catch (error) {
          // Token invalid hoặc expired, clear all
          console.error('Auth initialization failed:', error);
          localStorage.removeItem(TOKEN_KEY.REFRESH);
          clearAuth();
        }
      }
      
      setLoading(false);
    };

    initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      
      // Lưu Access Token vào MEMORY (Zustand store)
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
      
      // Lưu Refresh Token vào LocalStorage (Persistent)
      if (response.data.refreshToken) {
        localStorage.setItem(TOKEN_KEY.REFRESH, response.data.refreshToken);
      }
      console.log('🔵 Login success!');
    } catch (error) {
      console.error('🔴 Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    
    // Auto login sau khi register
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    
    if (response.data.refreshToken) {
      localStorage.setItem(TOKEN_KEY.REFRESH, response.data.refreshToken);
    }
  };

  const googleLogin = async (googleToken: string) => {
    const response = await authApi.googleLogin(googleToken);
    
    // Lưu tokens giống như login thường
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    
    if (response.data.refreshToken) {
      localStorage.setItem(TOKEN_KEY.REFRESH, response.data.refreshToken);
    }
  };

  const logout = () => {
    // Clear memory
    clearAuth();
    
    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY.REFRESH);
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        register,
        googleLogin,
        logout,
        isAuthenticated,
        isLoading,
        user,
        setUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
