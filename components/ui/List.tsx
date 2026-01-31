// components/ui/List.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/utils';
import { StockStatusBadge } from './Badge';

interface ListItemProps {
  title: string;
  subtitle?: string;
  description?: string;
  accessory?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  className?: string;
}

export const ListItem = ({
  title,
  subtitle,
  description,
  accessory,
  onPress,
  showChevron = false,
  className = '',
}: ListItemProps) => {
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-between py-4 border-b border-border',
        onPress && 'active:opacity-60',
        className
      )}
    >
      <View className="flex-1 flex-row items-center">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-base font-medium text-text flex-1">
              {title}
            </Text>
            {accessory && <View className="ml-2">{accessory}</View>}
          </View>
          {subtitle && (
            <Text className="text-sm text-text-soft mb-1">{subtitle}</Text>
          )}
          {description && (
            <Text className="text-sm text-text-muted">{description}</Text>
          )}
        </View>
      </View>
      {showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
      )}
    </Component>
  );
};

// Product List Item
interface ProductListItemProps {
  name: string;
  sku?: string;
  price: number;
  stock: number;
  lowStockThreshold?: number;
  onPress?: () => void;
}

export const ProductListItem = ({
  name,
  sku,
  price,
  stock,
  lowStockThreshold = 10,
  onPress,
}: ProductListItemProps) => {
  const getStockStatus = () => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= lowStockThreshold) return 'low-stock';
    return 'in-stock';
  };

  const status = getStockStatus();

  return (
    <ListItem
      title={name}
      subtitle={sku}
      description={`₣${price.toLocaleString()} • ${stock} in stock`}
      accessory={<StockStatusBadge status={status} quantity={stock} />}
      onPress={onPress}
      showChevron={true}
    />
  );
};