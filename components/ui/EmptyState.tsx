// components/ui/EmptyState.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  className?: string;
}

export const EmptyState = ({
  icon = 'cube-outline',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => {
  return (
    <View className={cn('items-center justify-center py-12 px-6 flex-1 ', className)}>
      <Ionicons name={icon as any} size={64} color="#94a3b8" />
      <Text className="text-xl font-semibold text-text-soft text-center mt-4 mb-2">
        {title}
      </Text>
      <Text className="text-base text-text-muted text-center mb-6">
        {description}
      </Text>
      {action && (
        <Button onPress={action.onPress}>
          {action.label}
        </Button>
      )}
    </View>
  );
};