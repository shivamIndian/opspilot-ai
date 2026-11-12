import type React from 'react';

export type ComponentSize = 'sm' | 'md' | 'lg';
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' | 'outline' | 'neutral' | 'danger';
export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ToastNotification {
  id: string;
  type: AlertVariant;
  title: string;
  message?: string;
  duration?: number;
}
