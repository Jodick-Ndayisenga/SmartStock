// components/ui/FilterChip.tsx (Enhanced version with more features)
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from 'nativewind';

export type ChipColor = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type ChipSize = 'sm' | 'md' | 'lg';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: ChipColor;
  size?: ChipSize;
  disabled?: boolean;
  count?: number;
  showClose?: boolean;
  onClose?: () => void;
  variant?: 'filled' | 'outlined';
}

const colorStyles = {
  default: {
    selected: {
      bg: 'bg-surface-soft dark:bg-dark-surface-soft',
      border: 'border-border dark:border-dark-border',
      text: 'text-text dark:text-dark-text',
    },
    filled: {
      bg: 'bg-surface dark:bg-dark-surface',
      border: 'border-border dark:border-dark-border',
      text: 'text-text dark:text-dark-text',
    },
    outlined: {
      bg: 'bg-transparent',
      border: 'border-border dark:border-dark-border',
      text: 'text-text dark:text-dark-text',
    },
  },
  primary: {
    selected: {
      bg: 'bg-brand dark:bg-dark-brand',
      border: 'border-brand dark:border-dark-brand',
      text: 'text-white',
    },
    filled: {
      bg: 'bg-brand/10 dark:bg-dark-brand/20',
      border: 'border-brand/20 dark:border-dark-brand/30',
      text: 'text-brand dark:text-dark-brand',
    },
    outlined: {
      bg: 'bg-transparent',
      border: 'border-brand dark:border-dark-brand',
      text: 'text-brand dark:text-dark-brand',
    },
  },
  success: {
    selected: {
      bg: 'bg-success dark:bg-dark-success',
      border: 'border-success dark:border-dark-success',
      text: 'text-white',
    },
    filled: {
      bg: 'bg-success/10 dark:bg-dark-success/20',
      border: 'border-success/20 dark:border-dark-success/30',
      text: 'text-success dark:text-dark-success',
    },
    outlined: {
      bg: 'bg-transparent',
      border: 'border-success dark:border-dark-success',
      text: 'text-success dark:text-dark-success',
    },
  },
  warning: {
    selected: {
      bg: 'bg-warning dark:bg-dark-warning',
      border: 'border-warning dark:border-dark-warning',
      text: 'text-white',
    },
    filled: {
      bg: 'bg-warning/10 dark:bg-dark-warning/20',
      border: 'border-warning/20 dark:border-dark-warning/30',
      text: 'text-warning dark:text-dark-warning',
    },
    outlined: {
      bg: 'bg-transparent',
      border: 'border-warning dark:border-dark-warning',
      text: 'text-warning dark:text-dark-warning',
    },
  },
  error: {
    selected: {
      bg: 'bg-error dark:bg-dark-error',
      border: 'border-error dark:border-dark-error',
      text: 'text-white',
    },
    filled: {
      bg: 'bg-error/10 dark:bg-dark-error/20',
      border: 'border-error/20 dark:border-dark-error/30',
      text: 'text-error dark:text-dark-error',
    },
    outlined: {
      bg: 'bg-transparent',
      border: 'border-error dark:border-dark-error',
      text: 'text-error dark:text-dark-error',
    },
  },
  info: {
    selected: {
      bg: 'bg-info dark:bg-dark-info',
      border: 'border-info dark:border-dark-info',
      text: 'text-white',
    },
    filled: {
      bg: 'bg-info/10 dark:bg-dark-info/20',
      border: 'border-info/20 dark:border-dark-info/30',
      text: 'text-info dark:text-dark-info',
    },
    outlined: {
      bg: 'bg-transparent',
      border: 'border-info dark:border-dark-info',
      text: 'text-info dark:text-dark-info',
    },
  },
};

const sizeStyles = {
  sm: {
    container: 'px-3 py-1.5',
    text: 'text-xs',
    icon: 14,
    spacing: 'mr-1',
  },
  md: {
    container: 'px-4 py-2',
    text: 'text-sm',
    icon: 16,
    spacing: 'mr-1.5',
  },
  lg: {
    container: 'px-5 py-2.5',
    text: 'text-base',
    icon: 18,
    spacing: 'mr-2',
  },
};

export default function FilterChip({
  label,
  selected = false,
  onPress,
  icon,
  color = 'default',
  size = 'md',
  disabled = false,
  count,
  showClose = false,
  onClose,
  variant = 'filled',
}: FilterChipProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getStyles = () => {
    const colorSet = colorStyles[color];
    
    if (selected) {
      return colorSet.selected;
    }
    
    if (variant === 'outlined') {
      return colorSet.outlined;
    }
    
    return colorSet.filled;
  };

  const styles = getStyles();
  const sizeSet = sizeStyles[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      className={`
        flex-row items-center rounded-full border
        ${styles.bg}
        ${styles.border}
        ${sizeSet.container}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sizeSet.icon}
          color={selected ? '#fff' : undefined}
          className={selected ? 'text-white' : styles.text}
          style={{ marginRight: 4 }}
        />
      )}
      
      <ThemedText
        size={size}
        className={`${styles.text} ${selected ? 'font-medium' : ''} ${sizeSet.text}`}
      >
        {label}
      </ThemedText>
      
      {count !== undefined && (
        <View className={`ml-1 px-1.5 py-0.5 rounded-full ${
          selected ? 'bg-white/20' : 'bg-surface-soft dark:bg-dark-surface-soft'
        }`}>
          <ThemedText
            size="xs"
            className={selected ? 'text-white' : styles.text}
          >
            {count}
          </ThemedText>
        </View>
      )}
      
      {showClose && onClose && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={`ml-1.5 ${selected ? 'opacity-90' : ''}`}
        >
          <Ionicons
            name="close"
            size={sizeSet.icon - 2}
            color={selected ? '#fff' : isDark ? '#94a3b8' : '#64748b'}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}