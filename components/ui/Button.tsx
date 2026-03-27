// components/ui/Button.tsx
import React, { forwardRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  Text,
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
  gradient?: boolean;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      loading = false,
      disabled = false,
      children,
      icon,
      iconPosition = 'left',
      fullWidth = true,
      className,
      iconColor,
      gradient = variant === 'default',
      ...props
    },
    ref
  ) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Gradient colors matching your register page
    const gradientColors: [string, string] = isDark 
      ? ['#38bdf8', '#818cf8'] 
      : ['#0ea5e9', '#6366f1'];

    const destructiveGradientColors: [string, string] = ['#ef4444', '#dc2626'];
    const successGradientColors: [string, string] = ['#22c55e', '#16a34a'];
    const warningGradientColors: [string, string] = ['#f59e0b', '#d97706'];

    const getIconColor = () => {
      if (iconColor) return iconColor;
      
      if (variant === 'default' || variant === 'destructive' || variant === 'success' || variant === 'warning') {
        return '#ffffff';
      }
      return isDark ? '#f1f5f9' : '#0f172a';
    };

    // Size classes for padding
    const sizeConfigs: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; borderRadius: number }> = {
      sm: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
      default: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 },
      lg: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: 14 },
      xl: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: 16 },
    };

    // Icon size mapping
    const iconSizeMap: Record<ButtonSize, number> = {
      sm: 16,
      default: 18,
      lg: 20,
      xl: 22,
    };

    // Text size mapping
    const textSizeMap: Record<ButtonSize, ThemedTextProps['size']> = {
      sm: 'sm',
      default: 'base',
      lg: 'lg',
      xl: 'xl',
    };

    // Text color classes
    const textColorClasses: Record<ButtonVariant, string> = {
      default: 'text-white',
      secondary: 'text-text dark:text-dark-text',
      outline: 'text-text dark:text-dark-text',
      ghost: 'text-text dark:text-dark-text',
      destructive: 'text-white',
      success: 'text-white',
      warning: 'text-white',
    };

    // Text variant mapping
    const textVariantMap: Record<ButtonVariant, ThemedTextProps['variant']> = {
      default: 'default',
      secondary: 'default',
      outline: 'default',
      ghost: 'default',
      destructive: 'default',
      success: 'default',
      warning: 'default',
    };

    const isDisabled = disabled || loading;

    // Get gradient colors for current variant
    const getGradientColors = (): [string, string] | null => {
      if (!gradient) return null;
      
      switch (variant) {
        case 'default':
          return gradientColors;
        case 'destructive':
          return destructiveGradientColors;
        case 'success':
          return successGradientColors;
        case 'warning':
          return warningGradientColors;
        default:
          return null;
      }
    };

    const currentGradient = getGradientColors();
    const shouldUseGradient = gradient && currentGradient !== null;
    const sizeConfig = sizeConfigs[size];

    // Button content (icon + text)
    const renderContent = () => {
      if (loading) {
        return <ActivityIndicator size="small" color={getIconColor()} />;
      }

      return (
        <View className="flex-row items-center justify-center">
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSizeMap[size]}
              color={getIconColor()}
              style={{ marginRight: 8 }}
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
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      );
    };

    // Common styles
    const commonStyle: StyleProp<ViewStyle> = {
      width: fullWidth ? '100%' : undefined,
      opacity: isDisabled ? 0.6 : 1,
    };

    if (shouldUseGradient) {
      return (
        <TouchableOpacity
          ref={ref as any}
          disabled={isDisabled}
          activeOpacity={0.8}
          style={commonStyle}
          className={cn(className)}
          {...props}
        >
          <LinearGradient
            colors={currentGradient!}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: sizeConfig.paddingVertical,
              paddingHorizontal: sizeConfig.paddingHorizontal,
              borderRadius: sizeConfig.borderRadius,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {renderContent()}
          </LinearGradient>
        </TouchableOpacity>
      );
    }

    // Non-gradient button styles
    const getBackgroundColor = () => {
      switch (variant) {
        case 'secondary':
          return isDark ? '#1e293b' : '#f1f5f9';
        case 'outline':
          return 'transparent';
        case 'ghost':
          return 'transparent';
        case 'destructive':
          return '#ef4444';
        case 'success':
          return '#22c55e';
        case 'warning':
          return '#f59e0b';
        default:
          return isDark ? '#38bdf8' : '#0ea5e9';
      }
    };

    const getBorderStyle = () => {
      if (variant === 'outline') {
        return {
          borderWidth: 2,
          borderColor: isDark ? '#475569' : '#e2e8f0',
        };
      }
      return {};
    };

    return (
      <TouchableOpacity
        ref={ref as any}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[
          commonStyle,
          {
            backgroundColor: getBackgroundColor(),
            borderRadius: sizeConfig.borderRadius,
            ...getBorderStyle(),
          },
        ]}
        className={cn('items-center justify-center', className)}
        {...props}
      >
        <View
          style={{
            paddingVertical: sizeConfig.paddingVertical,
            paddingHorizontal: sizeConfig.paddingHorizontal,
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {renderContent()}
        </View>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

// Icon Button Variant - For icon-only buttons
interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'iconPosition' | 'fullWidth'> {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  iconColor?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export const IconButton = forwardRef<View, IconButtonProps>(
  (
    { 
      icon, 
      accessibilityLabel, 
      variant = 'ghost', 
      size = 'default', 
      iconColor, 
      className,
      onPress,
      disabled,
      ...props 
    },
    ref
  ) => {
    const sizeConfigs: Record<ButtonSize, { padding: number; borderRadius: number; iconSize: number }> = {
      sm: { padding: 8, borderRadius: 8, iconSize: 18 },
      default: { padding: 12, borderRadius: 12, iconSize: 20 },
      lg: { padding: 14, borderRadius: 14, iconSize: 24 },
      xl: { padding: 16, borderRadius: 16, iconSize: 26 },
    };

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const getIconColor = () => {
      if (iconColor) return iconColor;
      if (variant === 'default' || variant === 'destructive' || variant === 'success' || variant === 'warning') {
        return '#ffffff';
      }
      return isDark ? '#f1f5f9' : '#0f172a';
    };

    const getBackgroundColor = () => {
      switch (variant) {
        case 'default':
          return isDark ? '#38bdf8' : '#0ea5e9';
        case 'destructive':
          return '#ef4444';
        case 'success':
          return '#22c55e';
        case 'warning':
          return '#f59e0b';
        case 'secondary':
          return isDark ? '#1e293b' : '#f1f5f9';
        default:
          return 'transparent';
      }
    };

    const getBorderStyle = () => {
      if (variant === 'outline') {
        return {
          borderWidth: 2,
          borderColor: isDark ? '#475569' : '#e2e8f0',
        };
      }
      return {};
    };

    const sizeConfig = sizeConfigs[size];

    return (
      <TouchableOpacity
        ref={ref as any}
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        style={[
          {
            padding: sizeConfig.padding,
            borderRadius: sizeConfig.borderRadius,
            backgroundColor: getBackgroundColor(),
            ...getBorderStyle(),
          },
        ]}
        className={cn('items-center justify-center', className)}
        accessibilityLabel={accessibilityLabel}
        {...props}
      >
        <Ionicons name={icon} size={sizeConfig.iconSize} color={getIconColor()} />
      </TouchableOpacity>
    );
  }
);

IconButton.displayName = 'IconButton';

// Floating Action Button - With icon support
interface FABProps extends Omit<TouchableOpacityProps, 'children'> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  label?: string;
  onPress?: () => void;
  disabled?: boolean;
  className?: string;
}

export const FAB = forwardRef<View, FABProps>(
  ({ 
    icon, 
    label, 
    position = 'bottom-right', 
    className, 
    style, 
    iconColor,
    onPress,
    disabled,
    ...props 
  }, ref) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const gradientColors: [string, string] = isDark 
      ? ['#38bdf8', '#818cf8'] 
      : ['#0ea5e9', '#6366f1'];

    const iconSize = label ? 20 : 24;
    const iconColorValue = iconColor || '#ffffff';

    const positionStyles = {
      'bottom-right': { bottom: 24, right: 24 },
      'bottom-left': { bottom: 24, left: 24 },
      'top-right': { top: 24, right: 24 },
      'top-left': { top: 24, left: 24 },
    };

    return (
      <TouchableOpacity
        ref={ref as any}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        style={[
          {
            position: 'absolute',
            ...positionStyles[position],
          },
          style,
        ]}
        className={cn('shadow-elevated', className)}
        {...props}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: label ? 20 : 16,
            paddingVertical: label ? 12 : 16,
            borderRadius: label ? 40 : 32,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <Ionicons name={icon} size={iconSize} color={iconColorValue} />
          {label && (
            <Text className="text-white font-semibold text-base">
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
);

FAB.displayName = 'FAB';

// Secondary Button (for subtle actions)
export const SecondaryButton = forwardRef<View, ButtonProps>(
  (props, ref) => {
    return (
      <Button
        ref={ref}
        variant="secondary"
        gradient={false}
        {...props}
      />
    );
  }
);

SecondaryButton.displayName = 'SecondaryButton';

// Outline Button (for less prominent actions)
export const OutlineButton = forwardRef<View, ButtonProps>(
  (props, ref) => {
    return (
      <Button
        ref={ref}
        variant="outline"
        gradient={false}
        {...props}
      />
    );
  }
);

OutlineButton.displayName = 'OutlineButton';

// Ghost Button (for icon-only actions)
export const GhostButton = forwardRef<View, ButtonProps>(
  (props, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        gradient={false}
        {...props}
      />
    );
  }
);

GhostButton.displayName = 'GhostButton';