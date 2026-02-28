// components/debtors/DebtorCard.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { DebtorSummary } from '@/services/debtService';

interface DebtorCardProps {
  debtor: DebtorSummary;
  onPress: () => void;
  onPayment: () => void;
  onMessage: () => void;
  onCall: () => void;
  onCopyPhone: () => void;
  viewMode: 'grid' | 'list';
  riskLevel?: 'low' | 'medium' | 'high';
}

export default function DebtorCard({
  debtor,
  onPress,
  onPayment,
  onMessage,
  onCall,
  onCopyPhone,
  viewMode,
  riskLevel = 'low',
}: DebtorCardProps) {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#22c55e';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₣${amount.toLocaleString()}`;
  };

  const getDaysOverdue = () => {
    if (!debtor.dueDate) return 0;
    return Math.max(0, Math.floor((Date.now() - debtor.dueDate) / (24 * 60 * 60 * 1000)));
  };

  const daysOverdue = getDaysOverdue();
  const isOverdue = debtor.overdueAmount > 0;

  if (viewMode === 'grid') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <Card variant="elevated" className="overflow-hidden">
          {isOverdue && (
            <View className="h-1" style={{ backgroundColor: getRiskColor() }} />
          )}
          <CardContent className="p-3">
            <View className="items-center mb-3">
              <View className={`w-16 h-16 rounded-full items-center justify-center mb-2 ${
                isOverdue ? 'bg-error-soft' : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}>
                <ThemedText 
                  variant="heading" 
                  size="xl"
                  className={isOverdue ? 'text-error' : ''}
                >
                  {debtor.contactName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText 
                variant="default" 
                size="base" 
                className="font-semibold text-center"
                numberOfLines={1}
              >
                {debtor.contactName}
              </ThemedText>
              <TouchableOpacity onPress={onCopyPhone} className="flex-row items-center mt-1">
                <ThemedText variant="muted" size="xs">
                  {debtor.contactPhone}
                </ThemedText>
                <Ionicons name="copy-outline" size={12} color="#0ea5e9" className="ml-1" />
              </TouchableOpacity>
            </View>

            <View className="flex-row justify-between items-center mb-3">
              <ThemedText variant="muted" size="xs">Total Debt</ThemedText>
              <ThemedText 
                variant="subheading" 
                size="md" 
                className={`font-bold ${isOverdue ? 'text-error' : 'text-warning'}`}
              >
                {formatCurrency(debtor.totalDebt)}
              </ThemedText>
            </View>

            {isOverdue && (
              <View className="flex-row items-center justify-center mb-3">
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <ThemedText variant="error" size="xs" className="ml-1">
                  {daysOverdue} days overdue
                </ThemedText>
              </View>
            )}

            <View className="flex-row justify-around">
              <TouchableOpacity
                onPress={onPayment}
                className="items-center p-2"
              >
                <View className="w-8 h-8 rounded-full bg-success/10 items-center justify-center mb-1">
                  <Ionicons name="cash" size={16} color="#22c55e" />
                </View>
                <ThemedText variant="muted" size="xs">Pay</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onMessage}
                className="items-center p-2"
              >
                <View className="w-8 h-8 rounded-full bg-info/10 items-center justify-center mb-1">
                  <Ionicons name="chatbubble" size={16} color="#3b82f6" />
                </View>
                <ThemedText variant="muted" size="xs">Message</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCall}
                className="items-center p-2"
              >
                <View className="w-8 h-8 rounded-full bg-brand/10 items-center justify-center mb-1">
                  <Ionicons name="call" size={16} color="#0ea5e9" />
                </View>
                <ThemedText variant="muted" size="xs">Call</ThemedText>
              </TouchableOpacity>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  }

  // List view
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="mb-3">
      <Card variant="elevated" className="overflow-hidden">
        {isOverdue && (
          <View className="h-1" style={{ backgroundColor: getRiskColor() }} />
        )}
        <CardContent className="p-4">
          <View className="flex-row items-center">
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
              isOverdue ? 'bg-error-soft' : 'bg-surface-soft dark:bg-dark-surface-soft'
            }`}>
              <ThemedText 
                variant="heading" 
                size="lg"
                className={isOverdue ? 'text-error' : ''}
              >
                {debtor.contactName.charAt(0).toUpperCase()}
              </ThemedText>
            </View>

            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <ThemedText 
                  variant="default" 
                  size="base" 
                  className="font-semibold flex-1"
                  numberOfLines={1}
                >
                  {debtor.contactName}
                </ThemedText>
                <ThemedText 
                  variant="heading" 
                  size="lg" 
                  className={`font-bold ${isOverdue ? 'text-error' : 'text-warning'}`}
                >
                  {formatCurrency(debtor.totalDebt)}
                </ThemedText>
              </View>

              <View className="flex-row items-center mb-2">
                <TouchableOpacity onPress={onCopyPhone} className="flex-row items-center">
                  <Ionicons name="call-outline" size={14} color="#64748b" />
                  <ThemedText variant="muted" size="sm" className="ml-1 mr-1">
                    {debtor.contactPhone}
                  </ThemedText>
                  <Ionicons name="copy-outline" size={12} color="#0ea5e9" />
                </TouchableOpacity>
                
                <View className="w-1 h-1 rounded-full bg-border mx-2" />
                
                <Ionicons name="receipt-outline" size={14} color="#64748b" />
                <ThemedText variant="muted" size="sm" className="ml-1">
                  {debtor.transactionCount} txns
                </ThemedText>
              </View>

              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <ThemedText variant="muted" size="xs" className="ml-1">
                    Since {new Date(debtor.oldestDebtDate).toLocaleDateString()}
                  </ThemedText>
                </View>

                {isOverdue && (
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 rounded-full bg-error mr-1" />
                    <ThemedText variant="error" size="xs">
                      {daysOverdue} days overdue
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}