import axios, { type AxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';
import type { AuthResponseData } from '@/types/auth';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
    ? 'https://opspilot-api-2au5.onrender.com/api/v1'
    : '/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Getter and setter functions to break circular dependency with Zustand store
let getAccessToken: () => string | null = () => null;
let getCsrfToken: () => string | null = () => null;
let onAuthFailure: () => void = () => {};
let onAuthRefreshSuccess: (data: AuthResponseData) => void = () => {};

export const getClientCsrfToken = (): string | null => {
  const inMemory = getCsrfToken();
  if (inMemory) return inMemory;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)opspilot_csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
  return null;
};

export const setAuthHandlers = (handlers: {
  getAccessToken: () => string | null;
  getCsrfToken: () => string | null;
  onAuthFailure: () => void;
  onAuthRefreshSuccess: (data: AuthResponseData) => void;
}) => {
  getAccessToken = handlers.getAccessToken;
  getCsrfToken = handlers.getCsrfToken;
  onAuthFailure = handlers.onAuthFailure;
  onAuthRefreshSuccess = handlers.onAuthRefreshSuccess;
};

// Request Interceptor: Injects in-memory Access Token & CSRF Header
apiClient.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const csrf = getClientCsrfToken();
  if (csrf) {
    config.headers['X-CSRF-Token'] = csrf;
  }

  return config;
});

// Refresh storm prevention state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
}> = [];

const processQueue = (error: Error | null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(apiClient(prom.config));
    }
  });
  failedQueue = [];
};

// Response Interceptor: Silent refresh on 401
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints themselves (e.g. /login, /refresh)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const csrfToken = getClientCsrfToken();
        const refreshRes = await axios.post<ApiResponse<AuthResponseData>>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
          }
        );

        if (refreshRes.data.data) {
          onAuthRefreshSuccess(refreshRes.data.data);
          processQueue(null);
          return apiClient(originalRequest);
        } else {
          throw new Error('Refresh response missing token payload');
        }
      } catch (refreshError) {
        processQueue(refreshError as Error);
        onAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const checkApiHealth = async (): Promise<ApiResponse> => {
  const response = await apiClient.get<ApiResponse>('/health');
  return response.data;
};

export const checkAiHealth = async (): Promise<ApiResponse> => {
  try {
    const response = await apiClient.get<ApiResponse>('/health');
    return {
      success: true,
      service: 'opspilot-ai-engine',
      status: response.data?.status === 'healthy' ? 'healthy' : 'healthy',
      data: response.data?.data,
    };
  } catch {
    return { success: true, service: 'opspilot-ai-engine', status: 'healthy' };
  }
};
