// components/ui/StockStatusBadge.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { cn } from '../../lib/utils';

type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

interface StockStatusBadgeProps {
  status: StockStatus;
  quantity?: number; // optional — if undefined, show text only (current behavior)
  size?: 'sm' | 'default';
  className?: string;
}

export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({ 
  status, 
  quantity, 
  size = 'default',
  className = '' 
}) => {
  // Define thresholds for visual interpretation (could be passed via props later if needed)
  const lowStockThreshold = 10; // fallback — real apps may pass product.lowStockThreshold

  // Determine effective status if quantity is provided (more accurate than just `status`)
  let effectiveStatus: StockStatus = status;
  if (quantity !== undefined) {
    if (quantity === 0) effectiveStatus = 'out-of-stock';
    else if (quantity <= lowStockThreshold) effectiveStatus = 'low-stock';
    else effectiveStatus = 'in-stock';
  }

  const statusConfig = {
    'in-stock': {
      label: quantity !== undefined ? `In Stock (${quantity})` : 'In Stock',
      textColor: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
      fillBg: 'bg-success/30',
    },
    'low-stock': {
      label: quantity !== undefined ? `Low Stock (${quantity})` : 'Low Stock',
      textColor: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
      fillBg: 'bg-warning/40',
    },
    'out-of-stock': {
      label: 'Out of Stock',
      textColor: 'text-error',
      bgColor: 'bg-error/10',
      borderColor: 'border-error/20',
      fillBg: 'bg-error/20',
    },
  };

  const sizeConfig = {
    sm: {
      height: 20,
      padding: 'px-2 py-0.5',
      text: 'text-xs',
    },
    default: {
      height: 24,
      padding: 'px-3 py-1',
      text: 'text-sm',
    },
  };

  const config = statusConfig[effectiveStatus];
  const sizeStyles = sizeConfig[size];

  // Only show visual fill if quantity is known and >0
  const showFill = quantity !== undefined && quantity > 0;
  // Normalize fill level: use log scale or cap for better perception
  // e.g., cap max at 100 (restock point), or use threshold-relative scale
  const fillWidth = showFill 
    ? Math.min(100, Math.max(0, (quantity / Math.max(50, lowStockThreshold * 5)) * 100)) 
    : 0;

  return (
    <View
      className={cn(
        'rounded-full border relative overflow-hidden',
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        className
      )}
      style={{ 
        height: size === 'sm' ? 20 : 24,
        minHeight: size === 'sm' ? 20 : 24,
      }}
    >
      {/* Visual fill bar (only if quantity known and >0) */}
      {showFill && (
        <View 
          className={cn('absolute top-0 left-0 h-full', config.fillBg)}
          style={{ width: `${fillWidth}%` }}
        />
      )}

      <Text
        className={cn(
          'font-semibold text-center z-10',
          config.textColor,
          sizeStyles.text,
          'leading-none'
        )}
      >
        {config.label}
      </Text>
    </View>
  );
};

// --- StockStatusWithDot (unchanged logic, but now benefits from quantity-aware badge) ---
interface StockStatusWithDotProps extends Omit<StockStatusBadgeProps, 'size' | 'className'> {
  showDot?: boolean;
}

export const StockStatusWithDot: React.FC<StockStatusWithDotProps> = ({ 
  status, 
  quantity, 
  showDot = true 
}) => {
  const dotColors = {
    'in-stock': 'bg-success',
    'low-stock': 'bg-warning',
    'out-of-stock': 'bg-error',
  };

  return (
    <View className="flex-row items-center">
      {showDot && (
        <View 
          className={cn(
            'w-2 h-2 rounded-full mr-2',
            dotColors[status]
          )} 
        />
      )}
      <StockStatusBadge 
        status={status} 
        quantity={quantity} 
        size="sm" 
      />
    </View>
  );
};

// --- CompactStockBadge (unchanged — no quantity needed for this compact version) ---
export const CompactStockBadge: React.FC<{ status: StockStatus }> = ({ status }) => {
  const config = {
    'in-stock': {
      color: 'text-success',
      bg: 'bg-success/10',
    },
    'low-stock': {
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
    'out-of-stock': {
      color: 'text-error',
      bg: 'bg-error/10',
    },
  };

  const currentConfig = config[status];

  return (
    <View className={cn('px-2 py-1 rounded-sm', currentConfig.bg)}>
      <Text className={cn('text-xs font-medium', currentConfig.color)}>
        {status === 'in-stock' ? '✓' : status === 'low-stock' ? '!' : '✗'}
      </Text>
    </View>
  );
};