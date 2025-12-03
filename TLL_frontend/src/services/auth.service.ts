import axios from "axios";
import apiClient from "../lib/axios";
import { API_ENDPOINTS, API_BASE_URL } from "../config/constants";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from "../types/auth.types";

// Separate axios instance for auth operations (no interceptors to avoid loops)
const authAxios = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true, // Send cookies
});

export const authApi = {
  login: async (credentials: LoginRequest): Promise<{ data: AuthResponse }> => {
    const response = await authAxios.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return { data: response.data };
  },

  register: async (data: RegisterRequest): Promise<{ data: AuthResponse }> => {
    const response = await authAxios.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return { data: response.data };
  },

  getProfile: async (): Promise<{ data: User }> => {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.PROFILE);
    return { data: response.data };
  },

  // PHRASE 2: Refresh token API - uses cookie, no body needed
  refreshToken: async (): Promise<{ data: AuthResponse }> => {
    const response = await authAxios.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH,
      {} // Empty body, refresh token is in HTTP-only cookie
    );
    return { data: response.data };
  },

  // PHRASE 2: Google OAuth login
  googleLogin: async (googleToken: string): Promise<{ data: AuthResponse }> => {
    const response = await authAxios.post<AuthResponse>(
      API_ENDPOINTS.AUTH.GOOGLE_LOGIN,
      { token: googleToken }
    );
    return { data: response.data };
  },

  // G04: Get Google OAuth authorization URL
  getGoogleAuthUrl: async (): Promise<{ url: string }> => {
    const response = await authAxios.get(API_ENDPOINTS.AUTH.GOOGLE_AUTH_URL);
    return response.data;
  },

  // G04: Handle Google OAuth callback
  handleGoogleCallback: async (
    code: string
  ): Promise<{ data: AuthResponse }> => {
    const response = await authAxios.get(
      `${API_ENDPOINTS.AUTH.GOOGLE_CALLBACK}?code=${code}`
    );
    return { data: response.data };
  },

  // Logout
  logout: async (): Promise<void> => {
    await authAxios.post(API_ENDPOINTS.AUTH.LOGOUT);
  },
};
