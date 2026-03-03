// components/sales/CartSummary.tsx
import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import * as Haptics from 'expo-haptics';
import { PaymentMode } from '@/types/sales';

interface CartSummaryProps {
  finalTotal: number;
  cartLength: number;
  totalItems: number;
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;
  cartAnimation: Animated.Value;
}

export default function CartSummary({
  finalTotal,
  cartLength,
  totalItems,
  paymentMode,
  setPaymentMode,
  cartAnimation,
}: CartSummaryProps) {
  return (
    <Animated.View
      style={{
        transform: [
          {
            scale: cartAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.05],
            }),
          },
        ],
      }}
      className="bg-brand/10 border-b border-brand/20"
    >
      <Card variant="filled" className="m-0 border-0">
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center">
            <View>
              <ThemedText variant="brand" size="lg" className="font-semibold">
                ₣{finalTotal.toLocaleString()}
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                {cartLength} item{cartLength > 1 ? 's' : ''} • {totalItems} units
              </ThemedText>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPaymentMode('cash');
                }}
                className={`px-8 py-2 rounded-full ${
                  paymentMode === 'cash'
                    ? 'bg-green-500'
                    : 'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border'
                }`}
              >
                <ThemedText
                  size="sm"
                  className={`font-medium ${paymentMode === 'cash' ? 'text-white' : ''}`}
                >
                  Cash
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPaymentMode('credit');
                }}
                className={`px-8 py-2 rounded-full ${
                  paymentMode === 'credit'
                    ? 'bg-blue-500'
                    : 'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border'
                }`}
              >
                <ThemedText
                  size="sm"
                  className={`font-medium ${paymentMode === 'credit' ? 'text-white' : ''}`}
                >
                  Credit
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </CardContent>
      </Card>
    </Animated.View>
  );
}