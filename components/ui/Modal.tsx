// components/ui/Modal.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal as RNModal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
    variant?: 'default' | 'destructive';
  };
  className?: string;
}

export const Modal = ({
  visible,
  onClose,
  title,
  children,
  action,
  className = '',
}: ModalProps) => {
  return (
    <RNModal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-surface">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-border">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-text flex-1 text-center">
            {title}
          </Text>
          <View style={{ width: 40 }} /> {/* Spacer for balance */}
        </View>

        {/* Content */}
        <View className={cn('flex-1 p-4', className)}>
          {children}
        </View>

        {/* Action */}
        {action && (
          <View className="p-4 border-t border-border">
            <Button
              variant={action.variant}
              onPress={action.onPress}
              size="lg"
            >
              {action.label}
            </Button>
          </View>
        )}
      </View>
    </RNModal>
  );
};