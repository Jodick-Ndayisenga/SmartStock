// components/ui/Loading.tsx
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { cn } from '../../lib/utils';

interface LoadingProps {
  size?: 'small' | 'large';
  text?: string;
  className?: string;
}

export const Loading = ({ size = 'large', text, className = '' }: LoadingProps) => {
  return (
    <View className={cn('items-center justify-center py-8', className)}>
      <ActivityIndicator size={size} color="#0ea5e9" />
      {text && (
        <Text className="text-text-soft text-base mt-4">{text}</Text>
      )}
    </View>
  );
};

// Skeleton Loader
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const Skeleton = ({ width = '100%', height = 20, className = '' }: SkeletonProps) => {
  return (
    <View
      className={cn('bg-surface-muted rounded-base', className)}
    />
  );
};

export const ProductSkeleton = () => {
  return (
    <View className="p-4 border-b border-border">
      <View className="flex-row items-center justify-between mb-2">
        <Skeleton width={120} height={20} />
        <Skeleton width={60} height={24} />
      </View>
      <Skeleton width={80} height={16} className="mb-1" />
      <Skeleton width={100} height={16} />
    </View>
  );
};