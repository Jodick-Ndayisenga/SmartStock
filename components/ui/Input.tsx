// components/ui/Input.tsx
import React from 'react';
import { TextInput, View, Text } from 'react-native';
import { cn } from '../../lib/utils';
import {Button} from "./Button";
import { readonly } from 'zod';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
  multiline?: boolean;
  numberOfLines?: number;
  autoFocus?: boolean,
  required?: boolean
  readOnly?: boolean
}

export const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  className = '',
  multiline = false,
  numberOfLines = 1,
  autoFocus = false,
  required = false,
  readOnly = false
}: InputProps) => {
  return (
    <View className={cn('mb-4', className)}>
      {label && (
        <Text className="text-sm font-medium text-text-soft mb-2">
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={!disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        focusable={autoFocus}
        readOnly={readOnly}
        className={cn(
          'border border-border dark:border-dark-border rounded-base px-4 py-3 text-text text-base dark:text-dark-text',
          'bg-surface-soft dark:bg-dark-surface-soft',
          error && 'border-error',
          disabled && 'opacity-50',
          multiline && 'min-h-[100px] text-top'
        )}
        style={{ textAlignVertical: multiline ? 'top' : 'center' }}
      />
      {error && (
        <Text className="text-error text-sm mt-1">{error}</Text>
      )}
    </View>
  );
};

// Search Input variant
interface SearchInputProps extends Omit<InputProps, 'label' | 'multiline' | 'numberOfLines'> {
  onClear?: () => void;
}

export const SearchInput = ({ onClear, ...props }: SearchInputProps) => {
  return (
    <View className="relative">
      <Input
        {...props}
        className="pr-12"
        placeholder={props.placeholder || "Search..."}
      />
      {props.value && onClear && (
        <View className="absolute right-3 top-3">
          <Button
            variant="ghost"
            size="sm"
            onPress={onClear}
            className="p-1"
          >
            <Text className="text-text-muted text-lg">×</Text>
          </Button>
        </View>
      )}
    </View>
  );
};