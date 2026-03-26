// components/CashFlowForecast.tsx
import React, { useMemo, useState } from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface CashFlowForecastProps {
  currentBalance: number;
  moneyIn: number;
  moneyOut: number;
  netCashFlow: number;
  formatCurrency: (amount: number) => string;
  formatShortCurrency: (amount: number) => string;
  onRunScenario?: () => void;
  onWhatIf?: () => void;
}

export const CashFlowForecast: React.FC<CashFlowForecastProps> = ({
  currentBalance,
  moneyIn,
  moneyOut,
  netCashFlow,
  formatCurrency,
  formatShortCurrency,
  onRunScenario,
  onWhatIf,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [selectedGrowthRate, setSelectedGrowthRate] = useState<number>(15);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'month' | 'quarter' | 'year'>('month');

  // Growth rate options
  const growthRates = [5, 10, 15, 20, 25];
  
  // Calculate projections based on growth rate
  const projections = useMemo(() => {
    const growthFactor = selectedGrowthRate / 100;
    const projectedGrowth = netCashFlow * growthFactor;
    
    let multiplier = 1;
    switch (selectedTimeframe) {
      case 'quarter':
        multiplier = 3;
        break;
      case 'year':
        multiplier = 12;
        break;
      default:
        multiplier = 1;
    }
    
    const projectedNetFlow = netCashFlow + projectedGrowth;
    const projectedBalance = currentBalance + (projectedNetFlow * multiplier);
    
    // Scenario analysis
    const optimistic = {
      growth: selectedGrowthRate + 10,
      balance: currentBalance + (netCashFlow * (1 + (selectedGrowthRate + 10) / 100) * multiplier),
    };
    
    const pessimistic = {
      growth: Math.max(0, selectedGrowthRate - 10),
      balance: currentBalance + (netCashFlow * (1 + Math.max(0, selectedGrowthRate - 10) / 100) * multiplier),
    };
    
    const conservative = {
      growth: selectedGrowthRate,
      balance: projectedBalance,
    };
    
    return {
      projectedNetFlow,
      projectedBalance,
      optimistic,
      pessimistic,
      conservative,
      growthFactor: growthFactor,
    };
  }, [currentBalance, netCashFlow, selectedGrowthRate, selectedTimeframe]);

  // Calculate expected inflows breakdown
  const expectedInflows = useMemo(() => {
    return {
      recurringSales: moneyIn * 0.6,
      pendingInvoices: moneyIn * 0.3,
      newSales: moneyIn * 0.1,
      total: moneyIn,
    };
  }, [moneyIn]);

  // Calculate expected outflows breakdown
  const expectedOutflows = useMemo(() => {
    return {
      supplierPayments: moneyOut * 0.5,
      payroll: moneyOut * 0.3,
      rentUtilities: moneyOut * 0.2,
      total: moneyOut,
    };
  }, [moneyOut]);

  // Get timeframe label
  const getTimeframeLabel = () => {
    switch (selectedTimeframe) {
      case 'month': return '30 Days';
      case 'quarter': return '90 Days';
      case 'year': return '365 Days';
      default: return '30 Days';
    }
  };

  // Get growth rate label
  const getGrowthRateLabel = () => {
    return `${selectedGrowthRate}% Growth`;
  };

  return (
    <Card variant="elevated" className="mx-2 mt-6">
      <CardHeader 
        title="Cash Flow Forecast"
        subtitle={`Next ${getTimeframeLabel()} projection`}
        action={
          <Badge variant="warning" className="bg-warning/20">
            <ThemedText variant="warning" size="xs" className="font-semibold">
              Beta
            </ThemedText>
          </Badge>
        }
      />
      <CardContent className="p-4">
        {/* Growth Rate Selector */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-3">
            <ThemedText variant="subheading" size="sm" className="font-semibold">
              Growth Assumption
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Show info about growth assumptions
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {growthRates.map(rate => (
                <TouchableOpacity
                  key={rate}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedGrowthRate(rate);
                  }}
                  className={`px-4 py-2 rounded-full ${
                    selectedGrowthRate === rate
                      ? 'bg-brand'
                      : isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
                  }`}
                >
                  <ThemedText
                    variant={selectedGrowthRate === rate ? 'default' : 'muted'}
                    className={selectedGrowthRate === rate ? 'text-white' : ''}
                  >
                    {rate}%
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Timeframe Selector */}
        <View className="mb-5">
          <ThemedText variant="subheading" size="sm" className="font-semibold mb-3">
            Forecast Period
          </ThemedText>
          <View className="flex-row gap-2">
            {(['month', 'quarter', 'year'] as const).map(timeframe => (
              <TouchableOpacity
                key={timeframe}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTimeframe(timeframe);
                }}
                className={`flex-1 py-2 rounded-lg items-center ${
                  selectedTimeframe === timeframe
                    ? 'bg-brand'
                    : isDark ? 'bg-dark-surface-soft' : 'bg-surface-soft'
                }`}
              >
                <ThemedText
                  variant={selectedTimeframe === timeframe ? 'default' : 'muted'}
                  className={selectedTimeframe === timeframe ? 'text-white' : ''}
                >
                  {timeframe === 'month' ? 'Monthly' : timeframe === 'quarter' ? 'Quarterly' : 'Yearly'}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Expected Inflows */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText variant="subheading" size="sm" className="font-semibold">
              Expected Inflows
            </ThemedText>
            <ThemedText variant="success" size="sm" className="font-bold">
              +{formatShortCurrency(expectedInflows.total)}
            </ThemedText>
          </View>
          <View className="bg-success/10 rounded-xl p-3">
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="repeat" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="sm" className="ml-2">Recurring Sales</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(expectedInflows.recurringSales)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="document-text" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="sm" className="ml-2">Pending Invoices</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(expectedInflows.pendingInvoices)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="trending-up" size={14} color="#22c55e" />
                  <ThemedText variant="muted" size="sm" className="ml-2">Expected New Sales</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(expectedInflows.newSales)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Expected Outflows */}
        <View className="mb-5">
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText variant="subheading" size="sm" className="font-semibold">
              Expected Outflows
            </ThemedText>
            <ThemedText variant="error" size="sm" className="font-bold">
              -{formatShortCurrency(expectedOutflows.total)}
            </ThemedText>
          </View>
          <View className="bg-error/10 rounded-xl p-3">
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="cube" size={14} color="#ef4444" />
                  <ThemedText variant="muted" size="sm" className="ml-2">Supplier Payments</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(expectedOutflows.supplierPayments)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="people" size={14} color="#ef4444" />
                  <ThemedText variant="muted" size="sm" className="ml-2">Payroll</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(expectedOutflows.payroll)}
                </ThemedText>
              </View>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <Ionicons name="home" size={14} color="#ef4444" />
                  <ThemedText variant="muted" size="sm" className="ml-2">Rent & Utilities</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(expectedOutflows.rentUtilities)}
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Projected Net Flow */}
        <View className="bg-gradient-to-r from-brand/20 to-brand/5 rounded-xl p-4 mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText variant="heading" size="base" className="font-semibold">
              Projected Net Flow
            </ThemedText>
            <ThemedText 
              variant={projections.projectedNetFlow >= 0 ? "success" : "error"} 
              size="lg" 
              className="font-bold"
            >
              {projections.projectedNetFlow >= 0 ? '+' : '-'}
              {formatShortCurrency(Math.abs(projections.projectedNetFlow))}
            </ThemedText>
          </View>
          <View className="flex-row justify-between items-center">
            <ThemedText variant="muted" size="sm">Current Balance</ThemedText>
            <ThemedText variant="default" size="sm" className="font-medium">
              {formatShortCurrency(currentBalance)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-border dark:border-dark-border">
            <ThemedText variant="heading" size="base" className="font-semibold">
              Projected Ending Balance
            </ThemedText>
            <ThemedText variant="heading" size="lg" className="font-bold text-brand">
              {formatShortCurrency(projections.projectedBalance)}
            </ThemedText>
          </View>
        </View>

        {/* Scenario Analysis */}
        <View className="mb-5">
          <ThemedText variant="subheading" size="sm" className="font-semibold mb-3">
            Scenario Analysis
          </ThemedText>
          <View className="flex-row gap-3">
            <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="trending-up" size={14} color="#22c55e" />
                <ThemedText variant="success" size="xs" className="ml-1">Optimistic</ThemedText>
              </View>
              <ThemedText variant="default" size="sm" className="font-bold text-success">
                +{projections.optimistic.growth}%
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1">
                {formatShortCurrency(projections.optimistic.balance)}
              </ThemedText>
            </View>
            <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="trending-down" size={14} color="#f59e0b" />
                <ThemedText variant="warning" size="xs" className="ml-1">Conservative</ThemedText>
              </View>
              <ThemedText variant="default" size="sm" className="font-bold text-warning">
                {projections.conservative.growth}%
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1">
                {formatShortCurrency(projections.conservative.balance)}
              </ThemedText>
            </View>
            <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-3">
              <View className="flex-row items-center mb-2">
                <Ionicons name="alert-circle" size={14} color="#ef4444" />
                <ThemedText variant="error" size="xs" className="ml-1">Pessimistic</ThemedText>
              </View>
              <ThemedText variant="default" size="sm" className="font-bold text-error">
                +{projections.pessimistic.growth}%
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1">
                {formatShortCurrency(projections.pessimistic.balance)}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1"
            onPress={onRunScenario || (() => {})}
            icon="calculator-outline"
          >
            Run Scenario
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="flex-1"
            onPress={onWhatIf || (() => {})}
            icon="git-branch-outline"
          >
            What-If
          </Button>
        </View>

        {/* Disclaimer */}
        <View className="mt-4 pt-3 border-t border-border dark:border-dark-border">
          <View className="flex-row items-start">
            <Ionicons name="information-circle-outline" size={14} color={isDark ? '#64748b' : '#94a3b8'} />
            <ThemedText variant="muted" size="xs" className="flex-1 ml-2">
              Forecasts are based on historical data and selected growth assumptions. Actual results may vary.
            </ThemedText>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};