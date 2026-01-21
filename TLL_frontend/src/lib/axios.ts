import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  AxiosError,
} from "axios";
import { API_BASE_URL, API_ENDPOINTS } from "../config/constants";
import { useAuthStore } from "../store/auth.store";

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
  withCredentials: true, // Important: Send cookies with requests
});

// ============================================
// PHRASE 2: ADVANCED TOKEN MANAGEMENT
// ============================================

// Concurrency control - Tránh gọi refresh token nhiều lần
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (
  error: AxiosError | null,
) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });

  failedQueue = [];
};

// Logout helper
const logout = (): void => {
  useAuthStore.getState().logout();

  // Redirect to login (cookies will be cleared by server on logout API call)
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

// REQUEST INTERCEPTOR - No need to manually set token, cookies are sent automatically
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Cookies are sent automatically with withCredentials: true
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// RESPONSE INTERCEPTOR - Handle 401 & auto-refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Nếu không phải lỗi 401 hoặc không có config, reject ngay
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Check if error message contains Gmail-specific errors
    const errorMessage =
      String((error.response?.data as Record<string, unknown>)?.message) || "";
    if (
      errorMessage.includes("Gmail account not connected") ||
      errorMessage.includes("Please connect your Gmail account")
    ) {
      // Don't retry, let component show connection banner
      return Promise.reject(error);
    }

    // Nếu request đã retry rồi, logout
    if (originalRequest._retry) {
      logout();
      return Promise.reject(error);
    }

    // Nếu đang refresh token, đưa request vào queue
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    // Bắt đầu refresh token
    originalRequest._retry = true;
    isRefreshing = true;

    // Refresh token is stored in HTTP-only cookie, sent automatically with withCredentials

    try {
      // Call refresh token API - cookie will be sent automatically
      // Backend will set new cookies in the response
      await axios.post(
        `${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
          },
          withCredentials: true, // Send and receive cookies
        }
      );

      // Process queue - new cookies are already set by backend
      processQueue(null);

      // Retry original request - cookies will be sent automatically
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError as AxiosError);
      logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
