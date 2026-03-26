// components/NotificationCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NotificationVariant } from '@/types/notification';

export type { NotificationVariant };

export interface NotificationCardProps {
  variant?: NotificationVariant;
  title?: string;
  message: string;
  iconName?: keyof typeof Ionicons.glyphMap; // Allow custom icon override
  iconColor?: string; // Optional: override icon color
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  dismissible?: boolean;
  animated?: boolean;
  style?: string; // Additional NativeWind classes
}

const variantConfig: Record<NotificationVariant, { 
  bg: string; 
  border: string; 
  iconName: keyof typeof Ionicons.glyphMap;
  textColor: string;
  iconColor: string;
}> = {
  success: {
    bg: 'bg-success-soft dark:bg-dark/success-soft',
    border: 'border-success/30 dark:border-dark/success',
    textColor: 'text-success dark:text-dark/success',
    iconColor: 'text-success dark:text-dark/success',
    iconName: 'checkmark-circle-outline',
  },
  warning: {
    bg: 'bg-warning-soft dark:bg-dark/warning-soft',
    border: 'border-warning/30 dark:border-dark/warning',
    textColor: 'text-warning dark:text-dark/warning',
    iconColor: 'text-warning dark:text-dark/warning',
    iconName: 'warning-outline',
  },
  error: {
    bg: 'bg-error-soft dark:bg-dark/error-soft',
    border: 'border-error/30 dark:border-dark/error',
    textColor: 'text-error dark:text-dark/error',
    iconColor: 'text-error dark:text-dark/error',
    iconName: 'close-circle-outline',
  },
  info: {
    bg: 'bg-info-soft dark:bg-dark/info-soft',
    border: 'border-info/30 dark:border-dark/info',
    textColor: 'text-info dark:text-dark/info',
    iconColor: 'text-info dark:text-dark/info',
    iconName: 'information-circle-outline',
  },
  brand: {
    bg: 'bg-brand-soft dark:bg-dark/brand-soft',
    border: 'border-brand/30 dark:border-dark/brand',
    textColor: 'text-brand dark:text-dark/brand',
    iconColor: 'text-brand dark:text-dark/brand',
    iconName: 'sparkles-outline',
  },
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  variant = 'info',
  title,
  message,
  iconName,
  iconColor,
  actionLabel,
  onAction,
  onDismiss,
  dismissible = true,
  animated = true,
  style = '',
}) => {
  const config = variantConfig[variant];
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const finalIconName = iconName || config.iconName;
  const finalIconColor = iconColor || config.iconColor;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim, animated]);

  const cardClasses = `
    ${config.bg} ${config.border}
    border-l-4 rounded-r-base
    p-md shadow-soft
    flex-row items-start gap-md
    ${style}
  `;

  return (
    <Animated.View 
      style={{ opacity: animated ? fadeAnim : 1 }}
      className={cardClasses}
      role="alert"
      accessibilityLabel={title || message}
    >
      {/* Icon */}
      <View className="mt-xs shrink-0">
        <Ionicons 
          name={finalIconName} 
          size={20} 
          className={finalIconColor} 
          accessibilityLabel={variant}
        />
      </View>

      {/* Text Content */}
      <View className="flex-1 flex-row justify-between items-start gap-md">
        <View className="flex-1">
          {title && (
            <Text className={`font-inter-semibold text-sm ${config.textColor} mb-xs`}>
              {title}
            </Text>
          )}
          <Text className="font-inter-regular text-sm text-text-soft dark:text-dark/text-soft leading-5">
            {message}
          </Text>
        </View>

        {/* Action Button */}
        {actionLabel && onAction && (
          <TouchableOpacity 
            onPress={onAction}
            className="ml-sm self-center"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={actionLabel}
            activeOpacity={0.7}
          >
            <Text className={`font-inter-semibold text-sm ${config.textColor}`}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Dismiss Button */}
      {dismissible && onDismiss && (
        <TouchableOpacity 
          onPress={onDismiss}
          className="ml-sm -mr-xs mt-xs p-xs"
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          accessibilityLabel="Dismiss notification"
          activeOpacity={0.7}
        >
          <Ionicons 
            name="close" 
            size={18} 
            className="text-text-muted dark:text-dark/text-muted" 
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};