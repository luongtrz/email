import apiClient from '../lib/axios';
import { API_ENDPOINTS } from '../config/constants';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/auth.types';

export const authApi = {
  login: async (credentials: LoginRequest): Promise<{ data: AuthResponse }> => {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return { data: response.data };
  },

  register: async (data: RegisterRequest): Promise<{ data: AuthResponse }> => {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return { data: response.data };
  },

  getProfile: async (): Promise<{ data: User }> => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return { data: response.data };
  },

  // PHRASE 2: Refresh token API
  refreshToken: async (refreshToken: string): Promise<{ data: AuthResponse }> => {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      { refreshToken }
    );
    return { data: response.data };
  },

  // PHRASE 2: Google OAuth login
  googleLogin: async (googleToken: string): Promise<{ data: AuthResponse }> => {
    const response = await apiClient.post<AuthResponse>(
      API_ENDPOINTS.AUTH.GOOGLE_LOGIN,
      { token: googleToken }
    );
    return { data: response.data };
  },
};
