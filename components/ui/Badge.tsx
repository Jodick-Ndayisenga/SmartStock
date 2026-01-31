// components/ui/Badge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'default';
  children: React.ReactNode;
  className?: string;
}

export const Badge = ({
  variant = 'default',
  size = 'default',
  children,
  className = '',
}: BadgeProps) => {
  const baseClasses = 'rounded-full px-3 py-1 items-center justify-center';
  
  const variantClasses = {
    default: 'bg-brand/10 border border-brand/20',
    success: 'bg-success/10 border border-success/20',
    warning: 'bg-warning/10 border border-warning/20',
    error: 'bg-error/10 border border-error/20',
    outline: 'bg-transparent border border-border',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    default: 'text-sm',
  };

  const textColorClasses = {
    default: 'text-brand',
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-error',
    outline: 'text-text',
  };

  return (
    <View className={cn(baseClasses, variantClasses[variant], className)}>
      <Text className={cn(
        'font-medium',
        textSizeClasses[size],
        textColorClasses[variant]
      )}>
        {children}
      </Text>
    </View>
  );
};

// Stock Status Badge
interface StockStatusBadgeProps {
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  quantity?: number;
}

export const StockStatusBadge = ({ status, quantity }: StockStatusBadgeProps) => {
  const statusConfig = {
    'in-stock': {
      label: 'In Stock',
      variant: 'success' as const,
    },
    'low-stock': {
      label: `Low Stock${quantity ? ` (${quantity})` : ''}`,
      variant: 'warning' as const,
    },
    'out-of-stock': {
      label: 'Out of Stock',
      variant: 'error' as const,
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
};