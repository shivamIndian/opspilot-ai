export interface HealthResponse {
  success: boolean;
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

export type DependencyState = 'up' | 'down';

export interface ReadinessResponse {
  success: boolean;
  service: string;
  status: 'ready' | 'unhealthy';
  dependencies: {
    database: DependencyState;
    redis: DependencyState;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RootResponse {
  success: boolean;
  service: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
