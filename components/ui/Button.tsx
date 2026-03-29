// components/ui/Button.tsx
import React, { useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  View,
} from 'react-native';
import { cn } from '../../lib/utils';
import { ThemedText, ThemedTextProps } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

// Button Variants
type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success'
  | 'warning';

// Button Sizes
type ButtonSize = 'sm' | 'default' | 'lg' | 'xl';

// Button Props
export interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
  iconColor?: string;
}

export const Button = React.forwardRef<typeof TouchableOpacity, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      loading = false,
      disabled = false,
      children,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      className,
      iconColor,
      ...props
    },
    ref
  ) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const getIconColor = () => {
      if (iconColor) return iconColor;
      if (variant === 'default' || variant === 'destructive' || variant === 'success' || variant === 'warning') {
        return '#ffffff';
      }
      return isDark ? '#f1f5f9' : '#0f172a';
    };

    // Size classes for padding (keeping exact same as original)
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-2',
      default: 'px-4 py-3',
      lg: 'px-6 py-4',
      xl: 'px-8 py-5',
    };

    const textSizeMap: Record<ButtonSize, ThemedTextProps['size']> = {
      sm: 'sm',
      default: 'base',
      lg: 'lg',
      xl: 'xl',
    };

    const iconSizeMap: Record<ButtonSize, number> = {
      sm: 16,
      default: 18,
      lg: 20,
      xl: 22,
    };

    const textVariantMap: Record<ButtonVariant, ThemedTextProps['variant']> = {
      default: 'default',
      secondary: 'default',
      outline: 'default',
      ghost: 'default',
      destructive: 'default',
      success: 'default',
      warning: 'default',
    };

    const textColorClasses: Record<ButtonVariant, string> = {
      default: 'text-white',
      secondary: 'text-text dark:text-dark-text',
      outline: 'text-text dark:text-dark-text',
      ghost: 'text-text dark:text-dark-text',
      destructive: 'text-white',
      success: 'text-white',
      warning: 'text-white',
    };

    const isDisabled = disabled || loading;
    const buttonRef = useRef<View>(null);

    const renderContent = () => {
      if (loading) {
        return <ActivityIndicator size="small" color={getIconColor()} />;
      }

      return (
        <View className="flex-row items-center">
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSizeMap[size]}
              color={getIconColor()}
              className="mr-2"
            />
          )}
          <ThemedText
            variant={textVariantMap[variant]}
            size={textSizeMap[size]}
            className={cn(
              'font-semibold text-center',
              textColorClasses[variant]
            )}
          >
            {children}
          </ThemedText>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={iconSizeMap[size]}
              color={getIconColor()}
              className="ml-2"
            />
          )}
        </View>
      );
    };

    // For outline and ghost variants - use original styling
    if (variant === 'outline' || variant === 'ghost' || variant === 'secondary') {
      const variantClasses: Record<ButtonVariant, string> = {
        default: '',
        secondary: 'border-[2px] bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border active:bg-surface-soft dark:active:bg-dark-surface-soft',
        outline: 'border-[2px] border-border dark:border-dark-border bg-transparent active:bg-surface-soft dark:active:bg-dark-surface-soft',
        ghost: 'border-[2px] bg-transparent border-transparent active:bg-surface-soft dark:active:bg-dark-surface-soft',
        destructive: '',
        success: '',
        warning: '',
      };

      return (
        <TouchableOpacity
          ref={buttonRef}
          disabled={isDisabled}
          className={cn(
            'flex-row items-center justify-center rounded-base border border-transparent',
            variantClasses[variant],
            sizeClasses[size],
            fullWidth && 'w-full',
            isDisabled && 'opacity-50',
            className
          )}
          {...props}
        >
          {renderContent()}
        </TouchableOpacity>
      );
    }

    // For destructive, success, warning - use solid colors
    if (variant === 'destructive' || variant === 'success' || variant === 'warning') {
      const solidColors: Record<ButtonVariant, string> = {
        default: '',
        secondary: '',
        outline: '',
        ghost: '',
        destructive: 'bg-error border-error active:bg-error/90',
        success: 'bg-success border-success active:bg-success/90',
        warning: 'bg-warning border-warning active:bg-warning/90',
      };

      return (
        <TouchableOpacity
          ref={buttonRef}
          disabled={isDisabled}
          className={cn(
            'flex-row items-center justify-center rounded-base border border-transparent',
            solidColors[variant],
            sizeClasses[size],
            fullWidth && 'w-full',
            isDisabled && 'opacity-50',
            className
          )}
          {...props}
        >
          {renderContent()}
        </TouchableOpacity>
      );
    }

    // For default variant - use LinearGradient
    const gradientColors: [string, string] = isDark 
      ? ['#38bdf8', '#818cf8'] 
      : ['#0ea5e9', '#6366f1'];

    return (
      <TouchableOpacity
        ref={buttonRef}
        disabled={isDisabled}
        style={{
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.5 : 1,
          borderRadius: 8,
          overflow: 'hidden',
        }}
        className={cn(className)}
        {...props}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingVertical: size === 'sm' ? 8 : size === 'default' ? 12 : size === 'lg' ? 16 : 20,
            paddingHorizontal: size === 'sm' ? 12 : size === 'default' ? 16 : size === 'lg' ? 24 : 32,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderContent()}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

// Icon Button Variant
interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition'> {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  iconColor?: string;
}

export const IconButton = React.forwardRef<typeof TouchableOpacity, IconButtonProps>(
  ({ icon, accessibilityLabel, variant = 'ghost', size = 'default', iconColor, className, ...props }, ref) => {
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'p-2',
      default: 'p-3',
      lg: 'p-4',
      xl: 'p-5',
    };

    const iconSizeMap: Record<ButtonSize, number> = {
      sm: 18,
      default: 20,
      lg: 24,
      xl: 26,
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        icon={icon}
        iconColor={iconColor}
        className={cn('px-0', sizeClasses[size], className)}
        accessibilityLabel={accessibilityLabel}
        {...props}
      >
        {''}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// Floating Action Button
interface FABProps extends Omit<ButtonProps, 'variant' | 'size'> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const FAB = React.forwardRef<typeof TouchableOpacity, FABProps>(
  ({ children, icon, position = 'bottom-right', className, ...props }, ref) => {
    const positionClasses = {
      'bottom-right': 'bottom-6 right-6',
      'bottom-left': 'bottom-6 left-6',
      'top-right': 'top-6 right-6',
      'top-left': 'top-6 left-6',
    };

    return (
      <Button
        ref={ref}
        variant="default"
        size="default"
        icon={icon}
        className={cn(
          'absolute shadow-elevated rounded-full py-1',
          positionClasses[position],
          className
        )}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

FAB.displayName = 'FAB';