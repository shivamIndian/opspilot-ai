import { apiClient, API_BASE_URL, getClientCsrfToken } from './api';
import axios from 'axios';
import type { ApiResponse } from '@/types';
import type { SafeUser, AuthResponseData } from '@/types/auth';

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: SafeUser }> {
    const res = await apiClient.post<ApiResponse<{ user: SafeUser }>>('/auth/register', data);
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Registration failed');
    }
    return res.data.data;
  },

  async login(data: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<AuthResponseData> {
    const res = await apiClient.post<ApiResponse<AuthResponseData>>('/auth/login', data);
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Login failed');
    }
    return res.data.data;
  },

  async refresh(csrfToken?: string | null): Promise<AuthResponseData> {
    const token = csrfToken || getClientCsrfToken();
    const res = await axios.post<ApiResponse<AuthResponseData>>(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: token ? { 'X-CSRF-Token': token } : {},
      }
    );
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Session refresh failed');
    }
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async logoutAll(): Promise<void> {
    await apiClient.post('/auth/logout-all');
  },

  async getMe(): Promise<{ user: SafeUser }> {
    const res = await apiClient.get<ApiResponse<{ user: SafeUser }>>('/auth/me');
    if (!res.data.data) {
      throw new Error(res.data.error?.message || 'Failed to fetch user profile');
    }
    return res.data.data;
  },

  async forgotPassword(email: string): Promise<string> {
    const res = await apiClient.post<ApiResponse>('/auth/forgot-password', { email });
    return res.data.message || 'If an account exists, a reset link has been dispatched.';
  },

  async resetPassword(token: string, newPassword: string): Promise<string> {
    const res = await apiClient.post<ApiResponse>('/auth/reset-password', {
      token,
      newPassword,
    });
    return res.data.message || 'Password reset successfully.';
  },

  async verifyEmail(token: string): Promise<string> {
    const res = await apiClient.post<ApiResponse>('/auth/verify-email', { token });
    return res.data.message || 'Email verified successfully.';
  },

  async resendVerification(email: string): Promise<string> {
    const res = await apiClient.post<ApiResponse>('/auth/resend-verification', { email });
    return res.data.message || 'Verification link sent.';
  },
};
