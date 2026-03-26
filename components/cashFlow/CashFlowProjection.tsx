// components/CashFlowProjection.tsx
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';

interface CashFlowProjectionProps {
  currentBalance: number;
  netCashFlow: number;
  formatCurrency: (amount: number) => string;
  formatShortCurrency: (amount: number) => string;
}

export const CashFlowProjection: React.FC<CashFlowProjectionProps> = ({
  currentBalance,
  netCashFlow,
  formatCurrency,
  formatShortCurrency,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const projections = useMemo(() => {
    const growthRate = 0.15; // 15% growth assumption
    
    const oneMonth = currentBalance + netCashFlow * (1 + growthRate);
    const threeMonths = currentBalance + netCashFlow * 3 * (1 + growthRate);
    const sixMonths = currentBalance + netCashFlow * 6 * (1 + growthRate);
    
    return {
      oneMonth,
      threeMonths,
      sixMonths,
      growthRate: growthRate * 100,
    };
  }, [currentBalance, netCashFlow]);

  return (
    <Card variant="elevated" className="mx-4 mt-4">
      <CardHeader 
        title="Growth Projection"
        subtitle="Based on current trends"
      />
      <CardContent className="p-4">
        <View className="flex-row justify-between items-end mb-4">
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">Now</ThemedText>
            <ThemedText variant="default" size="sm" className="font-bold">
              {formatShortCurrency(currentBalance)}
            </ThemedText>
          </View>
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">1 Month</ThemedText>
            <ThemedText variant="default" size="sm" className="font-bold text-success">
              {formatShortCurrency(projections.oneMonth)}
            </ThemedText>
          </View>
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">3 Months</ThemedText>
            <ThemedText variant="default" size="sm" className="font-bold text-brand">
              {formatShortCurrency(projections.threeMonths)}
            </ThemedText>
          </View>
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">6 Months</ThemedText>
            <ThemedText variant="default" size="sm" className="font-bold text-success">
              {formatShortCurrency(projections.sixMonths)}
            </ThemedText>
          </View>
        </View>
        
        <View className="h-2 bg-surface-soft rounded-full overflow-hidden">
          <View 
            className="h-full bg-gradient-to-r from-brand to-success rounded-full" 
            style={{ width: '60%' }} 
          />
        </View>
        
        <ThemedText variant="muted" size="xs" className="text-center mt-3">
          Projected growth of {projections.growthRate.toFixed(0)}% per month based on historical data
        </ThemedText>
      </CardContent>
    </Card>
  );
};