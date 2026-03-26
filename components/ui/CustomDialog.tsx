// components/ui/CustomDialog.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  Keyboard,
  ScrollView,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Types
export type DialogVariant = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export type DialogAction = {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'success' | 'warning';
  disabled?: boolean;
};

export interface CustomDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  variant?: DialogVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  children?: React.ReactNode;
  actions?: DialogAction[];
  showCancel?: boolean;
  cancelLabel?: string;
  onCancel?: () => void;
  onClose?: () => void;
  disableBackdropClose?: boolean;
  inputProps?: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
  };
  loading?: boolean;
  maxHeight?: number;
  width?: number | string;
  buttonColumn?: boolean;
}

// Variant config
const VARIANT_CONFIG: Record<
  DialogVariant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconColorClass: string;
    iconBgClass: string;
  }
> = {
  info: {
    icon: 'information-circle',
    iconColorClass: 'text-brand',
    iconBgClass: 'bg-brand-soft dark:bg-dark-brand-soft',
  },
  success: {
    icon: 'checkmark-circle',
    iconColorClass: 'text-success',
    iconBgClass: 'bg-success-soft dark:bg-dark-success-soft',
  },
  warning: {
    icon: 'alert-circle',
    iconColorClass: 'text-warning',
    iconBgClass: 'bg-warning-soft dark:bg-dark-warning-soft',
  },
  error: {
    icon: 'close-circle',
    iconColorClass: 'text-error',
    iconBgClass: 'bg-error-soft dark:bg-dark-error-soft',
  },
  neutral: {
    icon: 'information-circle',
    iconColorClass: 'text-text-muted dark:text-dark-text-muted',
    iconBgClass: 'bg-surface-muted dark:bg-dark-surface-muted',
  },
};

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_MAX_HEIGHT = SCREEN_HEIGHT * 0.7;
const DEFAULT_WIDTH = Math.min(370, SCREEN_WIDTH * 0.95);

const CustomDialog: React.FC<CustomDialogProps> = ({
  visible,
  title,
  description,
  variant = 'neutral',
  icon,
  children,
  actions = [],
  showCancel = true,
  cancelLabel = 'Cancel',
  onCancel,
  onClose,
  disableBackdropClose = false,
  inputProps,
  loading = false,
  maxHeight = DEFAULT_MAX_HEIGHT,
  width = DEFAULT_WIDTH,
  buttonColumn = false,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.92));
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      }, 100);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose?.();
    onCancel?.();
  }, [onClose, onCancel]);

  const handleBackdropPress = () => {
    if (!disableBackdropClose) {
      handleClose();
    }
  };

  if (!visible) return null;

  const config = VARIANT_CONFIG[variant];
  const iconName = icon || config.icon;

  const dialogWidth =
    typeof width === 'number' ? width : parseInt(width) || DEFAULT_WIDTH;

  const translateX = -dialogWidth / 2;
  const translateY = -120;

  // auto column if many actions
  const isColumn = buttonColumn || actions.length > 2;

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeAnim,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 999,
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleBackdropPress}
        />
      </Animated.View>

      {/* Dialog */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: '30%',
            left: '50%',
            width: dialogWidth,
            zIndex: 1000,
          },
          {
            transform: [{ scale: scaleAnim }, { translateX }, { translateY }],
          },
        ]}
      >
        <View
          className="rounded-xl bg-surface dark:bg-dark-surface shadow-elevated overflow-hidden"
          style={{ maxHeight }}
        >
          {/* Content */}
          <View style={{ flexShrink: 1 }}>
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator
              bounces={false}
              contentContainerStyle={{ padding: 16 }}
            >
              {/* Icon */}
              <View
                className={`w-14 h-14 rounded-full items-center justify-center self-center ${config.iconBgClass}`}
              >
                <Ionicons
                  name={iconName}
                  size={24}
                  color={
                    variant === 'info'
                      ? '#0ea5e9'
                      : variant === 'success'
                      ? '#22c55e'
                      : variant === 'warning'
                      ? '#f59e0b'
                      : variant === 'error'
                      ? '#ef4444'
                      : '#64748b'
                  }
                />
              </View>

              {/* Title */}
              <ThemedText
                variant="subheading"
                size="lg"
                className="font-bold text-center mt-3"
              >
                {title}
              </ThemedText>

              {/* Description */}
              {description && (
                <ThemedText
                  variant="muted"
                  size="sm"
                  className="text-center mt-2"
                >
                  {description}
                </ThemedText>
              )}

              {/* Custom content */}
              {children && <View className="mt-4">{children}</View>}

              {/* Input */}
              {inputProps && (
                <View className="mt-4">
                  <Input {...inputProps} />
                </View>
              )}
            </ScrollView>
          </View>

          {/* Actions */}
          <View className="px-6 pb-6 pt-3 border-t border-border dark:border-dark-border">
            <View
              className={`flex ${
                isColumn ? 'flex-col' : 'flex-row'
              } gap-2`}
            >
              {showCancel && (
                <Button
                  variant="outline"
                  onPress={handleClose}
                  disabled={loading}
                  className={isColumn ? 'w-full' : 'flex-1'}
                >
                  {cancelLabel}
                </Button>
              )}

              {actions.length > 0 ? (
                actions.map((action, idx) => (
                  <Button
                    key={idx}
                    variant={action.variant || 'default'}
                    onPress={action.onPress}
                    disabled={action.disabled || loading}
                    className={isColumn ? 'w-full' : 'flex-1'}
                    loading={
                      loading &&
                      action.label.toLowerCase().includes('save')
                    }
                  >
                    {action.label}
                  </Button>
                ))
              ) : !showCancel ? (
                <Button
                  variant="default"
                  onPress={handleClose}
                  className={isColumn ? 'w-full' : 'flex-1'}
                >
                  OK
                </Button>
              ) : null}
            </View>
          </View>
        </View>
      </Animated.View>
    </>
  );
};

export default CustomDialog;