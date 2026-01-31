// components/ui/Card.tsx
import React from 'react';
import { View, ViewProps, Pressable, PressableProps, Text as RNText } from 'react-native';
import { cn } from '@/lib/utils';
import { ThemedText } from './ThemedText';

// Card Container
interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'filled' | 'elevated';
  status?: 'default' | 'success' | 'warning' | 'error' | 'brand';
  className?: string;
}

export const Card = React.forwardRef<View, CardProps>(
  ({ variant = 'default', status = 'default', className, ...props }, ref) => {
    const baseClasses = 'rounded-base overflow-hidden';
    
    const variantClasses = {
      default: 'bg-surface dark:bg-dark-surface',
      outlined: 'border border-border dark:border-dark-border bg-surface dark:bg-dark-surface',
      filled: 'bg-surface-muted dark:bg-dark-surface-muted',
      elevated: 'bg-surface dark:bg-dark-surface shadow-card dark:shadow-none',
    };

    const statusClasses = {
      default: '',
      success: 'border-l-4 border-l-success dark:border-l-dark-success',
      warning: 'border-l-4 border-l-warning dark:border-l-dark-warning',
      error: 'border-l-4 border-l-error dark:border-l-dark-error',
      brand: 'border-l-4 border-l-brand dark:border-l-dark-brand',
    };

    return (
      <View
        ref={ref}
        className={cn(
          'shadow-card dark:shadow-none',
          baseClasses,
          variantClasses[variant],
          statusClasses[status],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends ViewProps {
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}


// Card Header
export const CardHeader = React.forwardRef<View, CardHeaderProps>(
  ({ className, title, subtitle,action, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('p-md pb-2', className)}
        {...props}
      >
        {title && (
          <ThemedText size='lg' className="text-lg font-semibold text-foreground">
            {title}
          </ThemedText>
        )}
        {subtitle && (
          <ThemedText size='sm' className="text-sm text-muted-foreground mt-1">
            {subtitle}
          </ThemedText>
        )}
        {action && <View className="mt-2">{action}</View>}
      </View>
    );
  }
);

CardHeader.displayName = 'CardHeader';

CardHeader.displayName = 'CardHeader';

// Card Footer
interface CardFooterProps extends ViewProps {
  className?: string;
}

export const CardFooter = React.forwardRef<View, CardFooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('p-md pt-2', className)}
        {...props}
      />
    );
  }
);

CardFooter.displayName = 'CardFooter';

// Card Content
interface CardContentProps extends ViewProps {
  className?: string;
}

export const CardContent = React.forwardRef<View, CardContentProps>(
  ({ className, ...props }, ref) => {
    return (
      <View
        ref={ref}
        className={cn('p-md py-2', className)}
        {...props}
      />
    );
  }
);

CardContent.displayName = 'CardContent';

// Card Title
interface CardTitleProps extends Omit<React.ComponentProps<typeof ThemedText>, 'ref'> {
  className?: string;
}

export const CardTitle = React.forwardRef<RNText, CardTitleProps>(
  ({ className, size = 'lg', variant = 'heading', ...props }, ref) => {
    return (
      <ThemedText
        ref={ref}
        variant={variant}
        size={size}
        className={cn('mb-1', className)}
        {...props}
      />
    );
  }
);

CardTitle.displayName = 'CardTitle';

// Card Description
interface CardDescriptionProps extends Omit<React.ComponentProps<typeof ThemedText>, 'ref'> {
  className?: string;
}

export const CardDescription = React.forwardRef<RNText, CardDescriptionProps>(
  ({ className, variant = 'muted', size = 'sm', ...props }, ref) => {
    return (
      <ThemedText
        ref={ref}
        variant={variant}
        size={size}
        className={className}
        {...props}
      />
    );
  }
);

CardDescription.displayName = 'CardDescription';

// Pressable Card (for interactive cards)
interface PressableCardProps extends PressableProps {
  variant?: 'default' | 'outlined' | 'filled' | 'elevated';
  status?: 'default' | 'success' | 'warning' | 'error' | 'brand';
  className?: string;
}

export const PressableCard = React.forwardRef<View, PressableCardProps>(
  ({ variant = 'default', status = 'default', className, ...props }, ref) => {
    const baseClasses = 'rounded-base overflow-hidden active:opacity-80';
    
    const variantClasses = {
      default: 'bg-surface dark:bg-dark-surface',
      outlined: 'border border-border dark:border-dark-border bg-surface dark:bg-dark-surface',
      filled: 'bg-surface-muted dark:bg-dark-surface-muted',
      elevated: 'bg-surface dark:bg-dark-surface shadow-card dark:shadow-none active:shadow-soft',
    };

    const statusClasses = {
      default: '',
      success: 'border-l-4 border-l-success dark:border-l-dark-success',
      warning: 'border-l-4 border-l-warning dark:border-l-dark-warning',
      error: 'border-l-4 border-l-error dark:border-l-dark-error',
      brand: 'border-l-4 border-l-brand dark:border-l-dark-brand',
    };

    return (
      <Pressable
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          statusClasses[status],
          className
        )}
        {...props}
      />
    );
  }
);

PressableCard.displayName = 'PressableCard';

// Stock Item Card (Specialized card for stock items)
interface StockItemCardProps extends PressableProps {
  name: string;
  sku?: string;
  currentStock: number;
  lowStockThreshold?: number;
  price?: number;
  priceChange?: number;
  className?: string;
}

export const StockItemCard = React.forwardRef<View, StockItemCardProps>(
  ({ 
    name, 
    sku, 
    currentStock, 
    lowStockThreshold = 10, 
    price, 
    priceChange, 
    className, 
    ...props 
  }, ref) => {
    
    const getStockStatus = () => {
      if (currentStock === 0) return 'error';
      if (currentStock <= lowStockThreshold) return 'warning';
      return 'success';
    };

    const getStockStatusText = () => {
      if (currentStock === 0) return 'Out of Stock';
      if (currentStock <= lowStockThreshold) return 'Low Stock';
      return 'In Stock';
    };

    const formatPrice = (value: number) => {
      return `$${value.toFixed(2)}`;
    };

    const status = getStockStatus();

    const getStatusDotClass = () => {
      switch (status) {
        case 'success':
          return 'bg-success dark:bg-dark-success';
        case 'warning':
          return 'bg-warning dark:bg-dark-warning';
        case 'error':
          return 'bg-error dark:bg-dark-error';
        default:
          return 'bg-success dark:bg-dark-success';
      }
    };

    return (
      <PressableCard
        ref={ref}
        status={status}
        variant="elevated"
        className={cn('my-1', className)}
        {...props}
      >
        <CardContent className="p-md">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-1">
              <CardTitle size="base" className="mb-1">
                {name}
              </CardTitle>
              {sku && (
                <CardDescription>
                  SKU: {sku}
                </CardDescription>
              )}
            </View>
            {price && (
              <View className="items-end">
                <CardTitle size="base">
                  {formatPrice(price)}
                </CardTitle>
                {priceChange !== undefined && (
                  <ThemedText 
                    variant={priceChange >= 0 ? 'success' : 'error'} 
                    size="xs"
                  >
                    {priceChange >= 0 ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
                  </ThemedText>
                )}
              </View>
            )}
          </View>

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <View 
                className={cn(
                  'w-2 h-2 rounded-full mr-2',
                  getStatusDotClass()
                )}
              />
              <ThemedText 
                variant={status} 
                size="sm"
                className="font-inter-medium"
              >
                {getStockStatusText()}
              </ThemedText>
            </View>
            <ThemedText variant="muted" size="sm">
              Qty: {currentStock}
            </ThemedText>
          </View>
        </CardContent>
      </PressableCard>
    );
  }
);

StockItemCard.displayName = 'StockItemCard';