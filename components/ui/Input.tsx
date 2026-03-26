// components/ui/Input.tsx
import React from 'react';
import { TextInput, View, Text, TouchableOpacity } from 'react-native';
import { cn } from '../../lib/utils';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText?: (text: string) => void;
  error?: string;
  editable?: boolean;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean;
  required?: boolean;
  readOnly?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  iconSize?: number;
  iconColor?: string;
  showRequiredIndicator?: boolean;
  containerClassName?: string;
  placeholderTextColor?: string;
  maxLength?: number;
}

export const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  editable = true,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  className = '',
  multiline = false,
  numberOfLines = 1,
  autoFocus = false,
  required = false,
  readOnly = false,
  leftIcon,
  rightIcon,
  onLeftIconPress,
  onRightIconPress,
  iconSize = 20,
  iconColor,
  showRequiredIndicator = false,
  containerClassName = '',
  maxLength = 1000
  
}: InputProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const defaultIconColor = iconColor || (isDark ? '#9CA3AF' : '#6B7280');
  const errorIconColor = '#EF4444';

  return (
    <View className={cn('mb-4', containerClassName)}>
      {label && (
        <View className="flex-row items-center mb-2">
          <Text className="text-sm font-medium text-text-soft dark:text-dark-text-soft">
            {label}
          </Text>
          {required && showRequiredIndicator && (
            <Text className="text-error ml-1">*</Text>
          )}
        </View>
      )}
      
      <View className="relative">
        {leftIcon && (
          <View className="absolute left-3 top-0 bottom-0 justify-center z-10">
            {onLeftIconPress ? (
              <TouchableOpacity 
                onPress={onLeftIconPress}
                disabled={disabled}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={leftIcon as any} 
                  size={iconSize} 
                  color={error ? errorIconColor : defaultIconColor}
                />
              </TouchableOpacity>
            ) : (
              <Ionicons 
                name={leftIcon as any} 
                size={iconSize} 
                color={error ? errorIconColor : defaultIconColor}
              />
            )}
          </View>
        )}
        
        {rightIcon && (
          <View className="absolute right-3 top-0 bottom-0 justify-center z-10">
            {onRightIconPress ? (
              <TouchableOpacity 
                onPress={onRightIconPress}
                disabled={disabled}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={rightIcon as any} 
                  size={iconSize} 
                  color={error ? errorIconColor : defaultIconColor}
                />
              </TouchableOpacity>
            ) : (
              <Ionicons 
                name={rightIcon as any} 
                size={iconSize} 
                color={error ? errorIconColor : defaultIconColor}
              />
            )}
          </View>
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={(!disabled && !readOnly && editable)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoFocus={autoFocus}
          readOnly={readOnly}
          maxLength={maxLength}
          className={cn(
            'border border-border dark:border-dark-border rounded-base px-4 py-3 text-text text-base dark:text-dark-text',
            'bg-surface-soft dark:bg-dark-surface-soft',
            error && 'border-error',
            disabled && 'opacity-50',
            readOnly && 'bg-gray-100 dark:bg-gray-900',
            multiline && 'min-h-[100px] text-top',
            leftIcon && 'pl-12',
            rightIcon && 'pr-12'
          )}
          style={{ textAlignVertical: multiline ? 'top' : 'center' }}
        />
      </View>
      
      {error && (
        <View className="flex-row items-center mt-1">
          <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
          <Text className="text-error text-sm ml-1">{error}</Text>
        </View>
      )}
    </View>
  );
};

// Numeric Input with increment/decrement buttons
interface NumericInputProps extends Omit<InputProps, 'onChangeText' | 'keyboardType' | 'value'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showControls?: boolean;
}

export const NumericInput = ({
  value,
  onChange,
  min = 0,
  max = 999999,
  step = 1,
  showControls = true,
  ...props
}: NumericInputProps) => {
  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleTextChange = (text: string) => {
    const num = parseFloat(text) || 0;
    onChange(Math.max(min, Math.min(max, num)));
  };

  return (
    <View className="relative">
      <Input
        {...props}
        value={String(value)}
        onChangeText={handleTextChange}
        keyboardType="numeric"
        rightIcon={showControls ? undefined : props.rightIcon}
      />
      
      {showControls && (
        <View className="absolute right-3 top-1/2 -translate-y-1/2 flex-row items-center">
          <TouchableOpacity
            onPress={handleDecrement}
            disabled={value <= min || props.disabled}
            className={cn(
              'w-8 h-8 items-center justify-center rounded-l',
              (value <= min || props.disabled) 
                ? 'bg-gray-200 dark:bg-gray-800' 
                : 'bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            )}
          >
            <Ionicons 
              name="remove" 
              size={16} 
              color={(value <= min || props.disabled) 
                ? '#9CA3AF' 
                : '#374151'
              } 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleIncrement}
            disabled={value >= max || props.disabled}
            className={cn(
              'w-8 h-8 items-center justify-center rounded-r border-l border-gray-300 dark:border-gray-600',
              (value >= max || props.disabled) 
                ? 'bg-gray-200 dark:bg-gray-800' 
                : 'bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600'
            )}
          >
            <Ionicons 
              name="add" 
              size={16} 
              color={(value >= max || props.disabled) 
                ? '#9CA3AF' 
                : '#374151'
              } 
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Currency Input for Burundi Francs (BIF)
interface CurrencyInputProps extends Omit<InputProps, 'value' | 'onChangeText' | 'leftIcon'> {
  value: number;
  onChange: (value: number) => void;
  currencySymbol?: string;
}

export const CurrencyInput = ({
  value,
  onChange,
  currencySymbol = '₣',
  ...props
}: CurrencyInputProps) => {
  const handleTextChange = (text: string) => {
    // Remove all non-numeric characters except decimal point
    const cleaned = text.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += '.' + parts[1];
    }
    
    const num = parseFloat(formatted) || 0;
    onChange(num);
  };

  const formattedValue = value === 0 ? '' : value.toLocaleString('fr-FR');

  return (
    <View className="relative">
      <Input
        {...props}
        value={formattedValue}
        onChangeText={handleTextChange}
        keyboardType="numeric"
        leftIcon="cash-outline"
        placeholderTextColor="#9CA3AF"
      />
      <View className="absolute right-3 top-1/2 -translate-y-1/2">
        <Text className="text-text-muted dark:text-dark-text-muted font-medium">
          {currencySymbol}
        </Text>
      </View>
    </View>
  );
};

// Search Input variant
interface SearchInputProps extends Omit<InputProps, 'label' | 'multiline' | 'numberOfLines' | 'leftIcon'> {
  onClear?: () => void;
  onSearch?: () => void;
}

export const SearchInput = ({ onClear, onSearch, ...props }: SearchInputProps) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="relative">
      <Input
        {...props}
        leftIcon="search-outline"
        onLeftIconPress={onSearch}
        className={cn('pr-12', props.className)}
        placeholder={props.placeholder || "Rechercher..."}
      />
      
      {props.value && onClear && (
        <View className="absolute right-3 top-3">
          <TouchableOpacity
            onPress={onClear}
            className="w-8 h-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="close" 
              size={18} 
              color={isDark ? '#9CA3AF' : '#6B7280'} 
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Barcode Input with scanner
interface BarcodeInputProps extends Omit<InputProps, 'leftIcon' | 'onLeftIconPress'> {
  onScan?: () => void;
  scanLabel?: string;
}

export const BarcodeInput = ({
  onScan,
  scanLabel = "Scanner",
  ...props
}: BarcodeInputProps) => {
  return (
    <View className="relative">
      <Input
        {...props}
        leftIcon="barcode-outline"
        onLeftIconPress={onScan}
        placeholder={props.placeholder || "Code barre ou cliquez pour scanner"}
      />
      {onScan && (
        <TouchableOpacity
          onPress={onScan}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <View className="bg-brand px-3 py-1.5 rounded">
            <Text className="text-white text-sm font-medium">{scanLabel}</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Phone Input for Burundi format
// Replace the existing PhoneInput component in components/ui/Input.tsx with this:

interface PhoneInputProps extends Omit<InputProps, 'value' | 'onChangeText' | 'leftIcon' | 'keyboardType'> {
  value: string;
  onChange: (phone: string) => void;
  countryCode?: string;
}

export const PhoneInput = ({
  value,
  onChange,
  countryCode = '+257',
  ...props
}: PhoneInputProps) => {
  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');
    
    // Simple grouping for readability: XX XXX XX (or similar)
    // Only add spaces, do not alter the actual data stored
    if (digits.length <= 2) {
      return digits;
    } else if (digits.length <= 5) {
      return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    } else {
      // Fallback for longer numbers
      return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
  };

  const handleTextChange = (text: string) => {
    // 1. Strip any existing country code if the user pasted a full number
    let cleanText = text.replace(countryCode, '').trim();
    
    // 2. Remove all non-digits to get raw numbers only
    const digitsOnly = cleanText.replace(/\D/g, '');
    
    // 3. Pass ONLY the digits back to the parent. 
    // Do NOT pass the formatted string with spaces to the state.
    // We will only use formatting for the display value below.
    onChange(digitsOnly);
  };

  // Format ONLY for display purposes. 
  // The 'value' prop coming in is now just digits (e.g., "757"), 
  // so we format it visually as "75 77" but don't store that space in state.
  const formattedDisplay = formatPhoneNumber(value);

  return (
    <View className="relative">
      <Input
        {...props}
        value={formattedDisplay} // Show formatted version (e.g., "75 77")
        onChangeText={handleTextChange} // Save raw digits only (e.g., "7577")
        leftIcon="call-outline"
        keyboardType="phone-pad"
        placeholder="Enter phone number"
      />
      {/* Optional: Show country code as a visual label inside the input if desired, 
          but since you have a separate selector in RegisterScreen, 
          we rely on that for the actual code. */}
    </View>
  );
};