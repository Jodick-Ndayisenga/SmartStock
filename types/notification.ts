// components/types.ts
export type NotificationVariant = 'success' | 'warning' | 'error' | 'info' | 'brand';

export interface Notification {
  id: string;
  variant?: NotificationVariant;
  title?: string;
  message: string;
  iconName?: string;
  iconColor?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  animated?: boolean;
  duration?: number;
  style?: string;
}