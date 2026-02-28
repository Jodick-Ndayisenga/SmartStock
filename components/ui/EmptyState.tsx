// components/ui/EmptyState.tsx
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ButtonProps } from './Button';
import { ThemedText } from './ThemedText';
import { cn } from '../../lib/utils';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  icon?: keyof typeof Ionicons.glyphMap;
}

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  /**
   * Single action (backward compatible) OR array of actions
   */
  action?: EmptyStateAction | EmptyStateAction[];
  className?: string;
}

export const EmptyState = ({
  icon = 'cube-outline',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) => {
  // Normalize action into an array
  const actions = Array.isArray(action) ? action : action ? [action] : [];

  return (
    <View className={cn('items-center justify-center py-12 px-6 flex-1', className)}>
      <Ionicons name={icon} size={64} color="#94a3b8" />

      <ThemedText variant="subheading" size="xl" className="text-center mt-4 mb-2 font-semibold">
        {title}
      </ThemedText>

      <ThemedText variant="muted" size="base" className="text-center mb-6">
        {description}
      </ThemedText>

      {actions.length > 0 && (
        <View className="w-full max-w-xs gap-3">
          {actions.map((act, index) => (
            <Button
              key={index}
              variant={act.variant || 'default'}
              size={act.size || 'lg'}
              onPress={act.onPress}
              icon={act.icon}
              className="w-full"
            >
              {act.label}
            </Button>
          ))}
        </View>
      )}
    </View>
  );
};