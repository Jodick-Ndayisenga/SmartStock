// components/sales/CreditSaleForm.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Input } from '@/components/ui/Input';
import { Ionicons } from '@expo/vector-icons';
import { Contact } from '@/database/models/Contact';

interface CreditSaleFormProps {
  customers: Contact[];
  selectedCustomer: string | null;
  setSelectedCustomer: (id: string | null) => void;
  dueDate: number | null;
  setDueDate: (date: number | null) => void;
  creditTerms: string;
  setCreditTerms: (terms: string) => void;
  creditPaymentAmount: number;
  setCreditPaymentAmount: (amount: number) => void;
  finalTotal: number;
  onSelectCustomer: () => void;
  onAddCustomer: () => void;
  onOpenDatePicker: () => void;
}

export default function CreditSaleForm({
  customers,
  selectedCustomer,
  setSelectedCustomer,
  dueDate,
  setDueDate,
  creditTerms,
  setCreditTerms,
  creditPaymentAmount,
  setCreditPaymentAmount,
  finalTotal,
  onSelectCustomer,
  onAddCustomer,
  onOpenDatePicker,
}: CreditSaleFormProps) {
  return (
    <Card variant="elevated" className="mt-4">
      <CardContent className="p-4">
        {/* Customer Selection */}
        <View className="mb-4">
          <ThemedText variant="label" className="mb-2 font-semibold">
            Customer
          </ThemedText>
          <TouchableOpacity
            onPress={onSelectCustomer}
            className="p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border flex-row justify-between items-center"
          >
            {selectedCustomer ? (
              <ThemedText variant="default">
                {customers.find(c => c.id === selectedCustomer)?.name || 'Unknown'}
              </ThemedText>
            ) : (
              <ThemedText variant="muted">Select a customer</ThemedText>
            )}
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </TouchableOpacity>
          {!selectedCustomer && (
            <TouchableOpacity
              onPress={onAddCustomer}
              className="mt-2 flex-row items-center gap-1"
            >
              <Ionicons name="add-circle" size={16} color="#3b82f6" />
              <ThemedText variant="brand" size="sm">
                Add New Customer
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Amount Paying Today */}
        <View className="mb-4">
          <ThemedText variant="label" className="mb-2 font-semibold">
            Amount Paying Today (Optional)
          </ThemedText>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Input
                placeholder="Enter amount"
                value={creditPaymentAmount.toString()}
                onChangeText={(text) => setCreditPaymentAmount(parseFloat(text) || 0)}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              onPress={() => setCreditPaymentAmount(finalTotal)}
              className="px-4 py-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg"
            >
              <ThemedText variant="brand" size="sm">Full</ThemedText>
            </TouchableOpacity>
          </View>
          {creditPaymentAmount > 0 && (
            <ThemedText variant="muted" size="sm" className="mt-1">
              Credit remaining: ₣{(finalTotal - creditPaymentAmount).toLocaleString()}
            </ThemedText>
          )}
        </View>

        {/* Due Date Picker */}
        <View className="mb-4">
          <ThemedText variant="label" className="mb-2 font-semibold">
            Due Date (Optional)
          </ThemedText>
          <TouchableOpacity
            onPress={onOpenDatePicker}
            className="p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border"
          >
            <ThemedText variant="default">
              {dueDate 
                ? new Date(dueDate).toLocaleDateString() 
                : 'Tap to set due date'}
            </ThemedText>
          </TouchableOpacity>
          {dueDate && (
            <TouchableOpacity
              onPress={() => setDueDate(null)}
              className="mt-2 flex-row items-center gap-1"
            >
              <Ionicons name="close-circle" size={16} color="#ef4444" />
              <ThemedText variant="error" size="sm">
                Clear Due Date
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Credit Terms */}
        <View className="mt-4">
          <ThemedText variant="label" className="mb-2 font-semibold">
            Credit Terms
          </ThemedText>
          <Input
            placeholder="e.g., Net 30, Pay within 2 weeks"
            value={creditTerms}
            onChangeText={setCreditTerms}
          />
        </View>
      </CardContent>
    </Card>
  );
}