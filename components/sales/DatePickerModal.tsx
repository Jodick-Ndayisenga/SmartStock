// components/sales/DatePickerModal.tsx
import React from 'react';
import { Modal, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: number) => void;
  selectedDate: number | null;
  isDark: boolean;
}

export default function DatePickerModal({
  visible,
  onClose,
  onSelect,
  selectedDate,
  isDark,
}: DatePickerModalProps) {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
          <View className="flex-row items-center justify-between mb-6">
            <ThemedText variant="heading" size="xl" className="font-bold">
              Select Due Date
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={selectedDate ? new Date(selectedDate) : new Date()}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              if (selectedDate) {
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);
                onSelect(endOfDay.getTime());
              }
            }}
            themeVariant={isDark ? 'dark' : 'light'}
          />
          <TouchableOpacity
            onPress={onClose}
            className={`mt-6 py-3 rounded-xl items-center justify-center ${
              isDark ? 'bg-dark-brand' : 'bg-brand'
            }`}
          >
            <ThemedText variant="label" className="text-white font-semibold">
              Done
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}