// components/ui/Select.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { cn } from '@/lib/utils';

// Types
export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

interface SelectProps {
  // Core props
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  
  // Display props
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  
  // Styling
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'filled';
  
  // Features
  searchable?: boolean;
  multiSelect?: boolean;
  required?: boolean;
  showChevron?: boolean;
  
  // Icons
  leftIcon?: string;
  rightIcon?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  value,
  onValueChange,
  label,
  placeholder = 'Select an option...',
  disabled = false,
  error,
  className = '',
  size = 'default',
  variant = 'default',
  searchable = false,
  multiSelect = false,
  required = false,
  showChevron = true,
  leftIcon,
  rightIcon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>(value ? [value] : []);
  const searchInputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();

  // Color configurations based on theme
  const colors = {
    light: {
      text: '#0f172a',
      textSoft: '#475569',
      textMuted: '#64748b',
      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      brand: '#0ea5e9',
      success: '#22c55e',
      error: '#ef4444',
      surface: '#ffffff',
      surfaceSoft: '#f8fafc',
      surfaceMuted: '#f1f5f9',
    },
    dark: {
      text: '#f1f5f9',
      textSoft: '#cbd5e1',
      textMuted: '#94a3b8',
      border: '#475569',
      borderStrong: '#64748b',
      brand: '#38bdf8',
      success: '#4ade80',
      error: '#f87171',
      surface: '#0f172a',
      surfaceSoft: '#1e293b',
      surfaceMuted: '#334155',
    },
  };

  const currentColors = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: 'py-2 px-3',
      text: 'text-sm',
      icon: 16,
    },
    default: {
      padding: 'py-3 px-4',
      text: 'text-base',
      icon: 18,
    },
    lg: {
      padding: 'py-4 px-4',
      text: 'text-lg',
      icon: 20,
    },
  };

  // Variant configurations with dark mode support
  const variantConfig = {
    default: {
      base: 'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border',
      focused: 'border-brand dark:border-dark-brand bg-surface dark:bg-dark-surface',
      disabled: 'bg-surface-muted dark:bg-dark-surface-muted border-border/50 dark:border-dark-border/50',
    },
    outline: {
      base: 'bg-transparent border-2 border-border dark:border-dark-border',
      focused: 'border-brand dark:border-dark-brand bg-transparent',
      disabled: 'bg-surface-muted/50 dark:bg-dark-surface-muted/50 border-border/30 dark:border-dark-border/30',
    },
    filled: {
      base: 'bg-surface-soft dark:bg-dark-surface-soft border-0',
      focused: 'bg-surface dark:bg-dark-surface border border-brand dark:border-dark-brand',
      disabled: 'bg-surface-muted/80 dark:bg-dark-surface-muted/80',
    },
  };

  const currentSize = sizeConfig[size];
  const currentVariant = variantConfig[variant];

  // Filter options based on search query
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get selected option(s)
  const getSelectedOptions = () => {
    if (multiSelect) {
      return options.filter(option => selectedValues.includes(option.value));
    }
    return options.filter(option => option.value === value);
  };

  const selectedOptions = getSelectedOptions();

  // Handle option selection
  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;

    if (multiSelect) {
      const newSelectedValues = selectedValues.includes(option.value)
        ? selectedValues.filter(v => v !== option.value)
        : [...selectedValues, option.value];
      
      setSelectedValues(newSelectedValues);
      onValueChange?.(newSelectedValues.join(','));
    } else {
      onValueChange?.(option.value);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle clear selection
  const handleClear = () => {
    if (multiSelect) {
      setSelectedValues([]);
      onValueChange?.('');
    } else {
      onValueChange?.('');
    }
  };

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Focus search input when modal opens and searchable is enabled
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchable]);

  // Get icon color based on state and theme
  const getIconColor = (isDisabled?: boolean) => {
    if (isDisabled) {
      return currentColors.textMuted;
    }
    return currentColors.textSoft;
  };

  // Render selected value display
  const renderSelectedDisplay = () => {
    if (multiSelect) {
      if (selectedOptions.length === 0) {
        return (
          <ThemedText variant="muted" size="sm" className={currentSize.text}>
            {placeholder}
          </ThemedText>
        );
      }

      if (selectedOptions.length === 1) {
        return (
          <ThemedText variant="default" size="sm" className={currentSize.text}>
            {selectedOptions[0].label}
          </ThemedText>
        );
      }

      return (
        <ThemedText variant="default" size="sm" className={currentSize.text}>
          {selectedOptions.length} selected
        </ThemedText>
      );
    }

    const selectedOption = options.find(opt => opt.value === value);
    
    if (selectedOption) {
      return (
        <View className="flex-row items-center">
          {selectedOption.icon && (
            <Ionicons 
              name={selectedOption.icon as any} 
              size={currentSize.icon} 
              color={getIconColor(disabled)}
              className="mr-2"
            />
          )}
          <ThemedText variant="default" size="sm" className={currentSize.text}>
            {selectedOption.label}
          </ThemedText>
        </View>
      );
    }

    return (
      <ThemedText variant="muted" size="sm" className={currentSize.text}>
        {placeholder}
      </ThemedText>
    );
  };

  // Render option item
  const renderOption = ({ item }: { item: SelectOption }) => {
    const isSelected = multiSelect 
      ? selectedValues.includes(item.value)
      : item.value === value;

    return (
      <TouchableOpacity
        onPress={() => handleSelect(item)}
        disabled={item.disabled}
        className={cn(
          'flex-row items-center py-3 px-4 border-b border-border dark:border-dark-border',
          isSelected && 'bg-brand/5 dark:bg-dark-brand/10',
          item.disabled && 'opacity-50',
          !item.disabled && 'active:bg-surface-muted dark:active:bg-dark-surface-muted'
        )}
      >
        {/* Selection indicator */}
        {multiSelect ? (
          <View className={cn(
            'w-5 h-5 rounded-base border-2 mr-3 items-center justify-center',
            isSelected 
              ? 'bg-brand dark:bg-dark-brand border-brand dark:border-dark-brand' 
              : 'border-border dark:border-dark-border bg-surface dark:bg-dark-surface'
          )}>
            {isSelected && (
              <Ionicons name="checkmark" size={14} color="#ffffff" />
            )}
          </View>
        ) : (
          <View className={cn(
            'w-5 h-5 rounded-full border-2 mr-3 items-center justify-center',
            isSelected 
              ? 'bg-brand dark:bg-dark-brand border-brand dark:border-dark-brand' 
              : 'border-border dark:border-dark-border bg-surface dark:bg-dark-surface'
          )}>
            {isSelected && (
              <View className="w-2 h-2 rounded-full bg-white" />
            )}
          </View>
        )}

        {/* Option icon */}
        {item.icon && (
          <Ionicons 
            name={item.icon as any} 
            size={currentSize.icon} 
            color={getIconColor(item.disabled)}
            className="mr-3"
          />
        )}

        {/* Option label */}
        <ThemedText 
          variant={item.disabled ? "muted" : "default"}
          size="sm"
          className={cn('flex-1', item.disabled && 'opacity-60')}
        >
          {item.label}
        </ThemedText>

        {/* Selected checkmark for single select */}
        {!multiSelect && isSelected && (
          <Ionicons 
            name="checkmark" 
            size={18} 
            color={currentColors.brand}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className={cn('mb-4', className)}>
      {/* Label */}
      {label && (
        <ThemedText variant="label" size="sm" className="mb-2">
          {label}
          {required && <ThemedText variant="error"> *</ThemedText>}
        </ThemedText>
      )}

      {/* Select Trigger */}
      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className={cn(
          'flex-row items-center justify-between rounded-base border',
          currentSize.padding,
          currentVariant.base,
          isOpen && currentVariant.focused,
          disabled && currentVariant.disabled,
          error && 'border-error dark:border-dark-error',
          disabled && 'opacity-50'
        )}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          {/* Left Icon */}
          {leftIcon && (
            <Ionicons 
              name={leftIcon as any} 
              size={currentSize.icon} 
              color={getIconColor(disabled)}
              className="mr-3"
            />
          )}

          {/* Selected Value Display */}
          <View className="flex-1">
            {renderSelectedDisplay()}
          </View>

          {/* Right Icon / Clear Button */}
          <View className="flex-row items-center">
            {(value || (multiSelect && selectedValues.length > 0)) && !disabled && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="p-1 mr-1"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons 
                  name="close-circle" 
                  size={16} 
                  color={currentColors.textMuted}
                />
              </TouchableOpacity>
            )}

            {rightIcon && !showChevron ? (
              <Ionicons 
                name={rightIcon as any} 
                size={currentSize.icon} 
                color={getIconColor(disabled)}
              />
            ) : showChevron ? (
              <Ionicons 
                name={isOpen ? "chevron-up" : "chevron-down"} 
                size={currentSize.icon} 
                color={getIconColor(disabled)}
              />
            ) : null}
          </View>
        </View>
      </TouchableOpacity>

      {/* Error Message */}
      {error && (
        <ThemedText variant="error" size="sm" className="mt-1">
          {error}
        </ThemedText>
      )}

      {/* Options Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View className="flex-1 bg-overlay dark:bg-dark-overlay justify-end">
            <TouchableWithoutFeedback>
              <View 
                className="bg-surface dark:bg-dark-surface rounded-t-3xl max-h-3/4"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 8,
                  elevation: 8,
                }}
              >
                {/* Header */}
                <View className="p-4 border-b border-border dark:border-dark-border">
                  <View className="flex-row justify-between items-center mb-3">
                    <ThemedText variant="subheading" size="lg">
                      {label || 'Select an option'}
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => setIsOpen(false)}
                      className="p-2"
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons 
                        name="close" 
                        size={24} 
                        color={currentColors.textSoft}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Search Input */}
                  {searchable && (
                    <View className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft rounded-base px-3 py-2">
                      <Ionicons 
                        name="search" 
                        size={18} 
                        color={currentColors.textSoft}
                      />
                      <TextInput
                        ref={searchInputRef}
                        placeholder="Search options..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        className="flex-1 ml-2 text-text dark:text-dark-text text-base"
                        placeholderTextColor={currentColors.textMuted}
                        style={{ color: currentColors.text }}
                      />
                      {searchQuery && (
                        <TouchableOpacity
                          onPress={() => setSearchQuery('')}
                          className="p-1"
                        >
                          <Ionicons 
                            name="close-circle" 
                            size={16} 
                            color={currentColors.textMuted}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Options List */}
                <FlatList
                  data={filteredOptions}
                  renderItem={renderOption}
                  keyExtractor={(item) => item.value}
                  showsVerticalScrollIndicator={false}
                  className="max-h-96"
                  ListEmptyComponent={
                    <View className="py-8 items-center">
                      <Ionicons 
                        name="search-outline" 
                        size={48} 
                        color={currentColors.borderStrong}
                      />
                      <ThemedText variant="muted" size="base" className="mt-2">
                        No options found
                      </ThemedText>
                    </View>
                  }
                />

                {/* Multi-select actions */}
                {multiSelect && (
                  <View className="p-4 border-t border-border dark:border-dark-border">
                    <Button
                      variant="default"
                      size="lg"
                      onPress={() => setIsOpen(false)}
                      className="w-full"
                    >
                      Confirm Selection
                    </Button>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// Import Button component
import { Button } from './Button';

// Select variant with predefined options for common use cases
interface PredefinedSelectProps extends Omit<SelectProps, 'options'> {
  type?: 'currency' | 'language' | 'unit' | 'category';
}

export const PredefinedSelect: React.FC<PredefinedSelectProps> = ({
  type,
  ...props
}) => {
  const predefinedOptions: Record<string, SelectOption[]> = {
    currency: [
      { value: 'BIF', label: 'Franc Burundais (BIF)', icon: 'cash-outline' },
      { value: 'USD', label: 'US Dollar (USD)', icon: 'cash-outline' },
      { value: 'EUR', label: 'Euro (EUR)', icon: 'cash-outline' },
    ],
    language: [
      { value: 'fr', label: 'Français', icon: 'language-outline' },
      { value: 'en', label: 'English', icon: 'language-outline' },
      { value: 'rn', label: 'Kirundi', icon: 'language-outline' },
    ],
    unit: [
      { value: 'piece', label: 'Pièce', icon: 'cube-outline' },
      { value: 'weight', label: 'Poids', icon: 'scale-outline' },
      { value: 'volume', label: 'Volume', icon: 'flask-outline' },
      { value: 'length', label: 'Longueur', icon: 'resize-outline' },
      { value: 'pack', label: 'Paquet', icon: 'archive-outline' },
    ],
    category: [
      { value: 'food', label: 'Aliments', icon: 'fast-food-outline' },
      { value: 'drinks', label: 'Boissons', icon: 'wine-outline' },
      { value: 'cleaning', label: 'Nettoyage', icon: 'sparkles-outline' },
      { value: 'personal-care', label: 'Soins Personnels', icon: 'person-outline' },
      { value: 'electronics', label: 'Électronique', icon: 'hardware-chip-outline' },
      { value: 'other', label: 'Autre', icon: 'grid-outline' },
    ],
  };

  const options = type ? predefinedOptions[type] : [];

  return <Select options={options} {...props} />;
};

export default Select;