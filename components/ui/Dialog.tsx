import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

type DialogVariant = 'info' | 'success' | 'warning' | 'error';

interface DialogProps {
  visible: boolean;
  title: string;
  description?: string;
  variant?: DialogVariant;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  visible,
  title,
  description,
  variant = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}) => {
  const { isDark } = useTheme();

  const variantConfig = {
    info: {
      icon: 'information-circle-outline',
      color: isDark ? 'text-dark-brand' : 'text-brand',
      bg: isDark ? 'bg-dark-brand-soft' : 'bg-brand-soft',
    },
    success: {
      icon: 'checkmark-circle-outline',
      color: isDark ? 'text-dark-success' : 'text-success',
      bg: isDark ? 'bg-dark-success-soft' : 'bg-success-soft',
    },
    warning: {
      icon: 'warning-outline',
      color: isDark ? 'text-dark-warning' : 'text-warning',
      bg: isDark ? 'bg-dark-warning-soft' : 'bg-warning-soft',
    },
    error: {
      icon: 'close-circle-outline',
      color: isDark ? 'text-dark-error' : 'text-error',
      bg: isDark ? 'bg-dark-error-soft' : 'bg-error-soft',
    },
  }[variant];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-overlay items-center justify-center px-6">
        <View
          className={`
            w-full items-center max-w-md rounded-xl p-6 shadow-elevated
            ${isDark ? 'bg-dark-surface' : 'bg-surface'}
          `}
        >
          {/* Icon */}
          <View
            className={`
              w-14 h-14 rounded-full items-center justify-center mb-4
              ${variantConfig.bg}
            `}
          >
            <Ionicons
              name={variantConfig.icon as any}
              size={28}
              className={variantConfig.color}
            />
          </View>

          {/* Title */}
          <Text
            className={`
              text-xl font-semibold mb-2
              ${isDark ? 'text-dark-text' : 'text-text'}
            `}
          >
            {title}
          </Text>

          {/* Description */}
          {description && (
            <Text
              className={`
                text-base mb-6
                ${isDark ? 'text-dark-text-soft' : 'text-text-soft'}
              `}
            >
              {description}
            </Text>
          )}

          {/* Actions */}
          <View className="w-full flex-row justify-between mt-4">
            {onCancel && (
              <Pressable
                onPress={onCancel}
                className={`
                  px-6 py-2 rounded-lg
                  ${isDark ? 'bg-dark-surface-muted' : 'bg-surface-muted'}
                `}
              >
                <Text
                  className={`
                    font-medium
                    ${isDark ? 'text-dark-text' : 'text-text'}
                  `}
                >
                  {cancelText}
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={onConfirm}
              className={`
                px-6 py-2 rounded-lg
                ${destructive
                  ? 'bg-error'
                  : isDark
                  ? 'bg-dark-brand'
                  : 'bg-brand'}
              `}
            >
              <Text className="text-white font-medium">
                {confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};
