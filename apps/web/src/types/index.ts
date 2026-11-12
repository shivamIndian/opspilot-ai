export interface ApiResponse<T = unknown> {
  success: boolean;
  service?: string;
  message?: string;
  status?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ServiceHealth {
  name: string;
  endpoint: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'pending';
  lastChecked?: string;
}

export * from './document';
