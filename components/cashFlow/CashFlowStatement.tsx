// components/CashFlowStatement.tsx
import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { AccountTransaction } from '@/database/models/AccountTransaction';

interface CashFlowStatementProps {
  accountTransactions: AccountTransaction[];
  summary: {
    currentBalance: number;
    beginningBalance: number;
    burnRate: number;
    liquidityRatio: number;
  };
  getDateRange: () => { start: Date; end: Date };
  formatCurrency: (amount: number) => string;
  formatShortCurrency: (amount: number) => string;
  generatePDFReport: () => Promise<void>;
  selectedPeriod: string;
}

export const CashFlowStatement: React.FC<CashFlowStatementProps> = ({
  accountTransactions,
  summary,
  getDateRange,
  formatCurrency,
  formatShortCurrency,
  generatePDFReport,
  selectedPeriod,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [expandedSections, setExpandedSections] = useState({
    operating: true,
    investing: true,
    financing: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Calculate operating activities data
  const operatingData = useMemo(() => {
    const { start, end } = getDateRange();
    const periodTransactions = accountTransactions.filter(at => 
      at.transactionDate >= start.getTime() && at.transactionDate <= end.getTime()
    );

    // Cash from customers: Sales, credit sales, and payments received
    const cashFromCustomers = periodTransactions
      .filter(at => at.type === 'income' || at.type === 'deposit' || at.type === 'receivable' || at.type === 'receivable_payment')
      .reduce((sum, at) => sum + at.amount, 0);

    // Cash paid to suppliers: Inventory/purchase transactions
    const cashToSuppliers = periodTransactions
      .filter(at => (at.type === 'expense' || at.type === 'withdrawal') && 
              (at.category === 'purchase' || at.category === 'inventory'))
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);

    // Cash for operating expenses: General expenses (not purchases, not equipment)
    const cashForExpenses = periodTransactions
      .filter(at => (at.type === 'expense' || at.type === 'withdrawal') && 
              at.category !== 'purchase' && 
              at.category !== 'inventory' &&
              at.category !== 'equipment' &&
              at.category !== 'loan_repayment' &&
              at.category !== 'withdrawal')
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);

    // Cash for wages/salaries
    const cashForWages = periodTransactions
      .filter(at => (at.type === 'expense' || at.type === 'withdrawal') && 
              (at.category === 'salary' || at.category === 'wages'))
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);

    return {
      cashFromCustomers,
      cashToSuppliers,
      cashForExpenses,
      cashForWages,
      netOperating: cashFromCustomers - (cashToSuppliers + cashForExpenses + cashForWages),
    };
  }, [accountTransactions, getDateRange]);

  // Calculate investing activities data
  const investingData = useMemo(() => {
    const { start, end } = getDateRange();
    const periodTransactions = accountTransactions.filter(at => 
      at.transactionDate >= start.getTime() && at.transactionDate <= end.getTime()
    );

    // Equipment/Asset purchases
    const equipmentPurchases = periodTransactions
      .filter(at => (at.type === 'expense' || at.type === 'withdrawal') && 
              (at.category === 'equipment' || at.category === 'asset'))
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);

    // Asset sales
    const assetSales = periodTransactions
      .filter(at => (at.type === 'income' || at.type === 'deposit') && 
              (at.category === 'asset_sale' || at.category === 'equipment_sale'))
      .reduce((sum, at) => sum + at.amount, 0);

    return {
      equipmentPurchases,
      assetSales,
      netInvesting: assetSales - equipmentPurchases,
    };
  }, [accountTransactions, getDateRange]);

  // Calculate financing activities data
  const financingData = useMemo(() => {
    const { start, end } = getDateRange();
    const periodTransactions = accountTransactions.filter(at => 
      at.transactionDate >= start.getTime() && at.transactionDate <= end.getTime()
    );

    // Loans received
    const loansReceived = periodTransactions
      .filter(at => (at.type === 'income' || at.type === 'deposit') && 
              (at.category === 'loan' || at.category === 'financing'))
      .reduce((sum, at) => sum + at.amount, 0);

    // Loan repayments
    const loanRepayments = periodTransactions
      .filter(at => (at.type === 'expense' || at.type === 'withdrawal') && 
              at.category === 'loan_repayment')
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);

    // Owner withdrawals/dividends
    const ownerWithdrawals = periodTransactions
      .filter(at => (at.type === 'expense' || at.type === 'withdrawal') && 
              (at.category === 'withdrawal' || at.category === 'dividend'))
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);

    return {
      loansReceived,
      loanRepayments,
      ownerWithdrawals,
      netFinancing: loansReceived - (loanRepayments + ownerWithdrawals),
    };
  }, [accountTransactions, getDateRange]);

  const netCashChange = operatingData.netOperating + investingData.netInvesting + financingData.netFinancing;

  return (
    <Card variant="elevated" className="mx-2 mt-6">
      <CardHeader 
        title="Cash Flow Statement"
        subtitle={`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} ${new Date().getFullYear()}`}
        action={
          <TouchableOpacity 
            onPress={generatePDFReport} 
            className="flex-row items-center gap-1 px-3 py-1.5 bg-brand/10 rounded-full"
          >
            <Ionicons name="download-outline" size={16} color="#0ea5e9" />
            <ThemedText variant="brand" size="xs">Export PDF</ThemedText>
          </TouchableOpacity>
        }
      />
      <CardContent className="p-5">
        {/* Summary Section - At a glance */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText variant="muted" size="sm">NET CASH FLOW</ThemedText>
            <ThemedText 
              variant="heading" 
              size="lg" 
              className={`font-bold ${
                netCashChange >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {netCashChange >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(netCashChange))}
            </ThemedText>
          </View>
          
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <View className="flex-row items-center mb-1">
                <Ionicons name="arrow-up" size={12} color="#22c55e" />
                <ThemedText variant="success" size="xs" className="ml-1">Inflows</ThemedText>
              </View>
              <ThemedText variant="default" size="lg" className="font-bold text-success">
                {formatCurrency(operatingData.cashFromCustomers + investingData.assetSales + financingData.loansReceived)}
              </ThemedText>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-1">
                <Ionicons name="arrow-down" size={12} color="#ef4444" />
                <ThemedText variant="error" size="xs" className="ml-1">Outflows</ThemedText>
              </View>
              <ThemedText variant="default" size="lg" className="font-bold text-error">
                {formatCurrency(
                  operatingData.cashToSuppliers + 
                  operatingData.cashForExpenses + 
                  operatingData.cashForWages + 
                  investingData.equipmentPurchases + 
                  financingData.loanRepayments + 
                  financingData.ownerWithdrawals
                )}
              </ThemedText>
            </View>
          </View>

          {/* Mini progress bar */}
          <View className="mt-3">
            <View className="w-full h-1.5 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden flex-row">
              <View 
                className="h-full rounded-l-full"
                style={{ 
                  width: `${(operatingData.cashFromCustomers / (operatingData.cashFromCustomers || 1)) * 100}%`,
                  backgroundColor: '#22c55e'
                }}
              />
              <View 
                className="h-full"
                style={{ 
                  width: `${(investingData.assetSales / (operatingData.cashFromCustomers || 1)) * 100}%`,
                  backgroundColor: '#3b82f6'
                }}
              />
              <View 
                className="h-full rounded-r-full"
                style={{ 
                  width: `${(financingData.loansReceived / (operatingData.cashFromCustomers || 1)) * 100}%`,
                  backgroundColor: '#8b5cf6'
                }}
              />
            </View>
            <View className="flex-row justify-between mt-1">
              <ThemedText variant="muted" size="xs">Operations</ThemedText>
              <ThemedText variant="muted" size="xs">Investing</ThemedText>
              <ThemedText variant="muted" size="xs">Financing</ThemedText>
            </View>
          </View>
        </View>

        {/* Operating Activities */}
        <View className="mb-4 border border-border dark:border-dark-border rounded-xl overflow-hidden">
          <TouchableOpacity 
            onPress={() => toggleSection('operating')}
            className="flex-row items-center justify-between p-4 bg-surface-soft dark:bg-dark-surface-soft"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-brand/10 items-center justify-center mr-3">
                <Ionicons name="business" size={16} color="#0ea5e9" />
              </View>
              <ThemedText variant="subheading" size="base" className="font-semibold">
                Operating Activities
              </ThemedText>
            </View>
            <View className="flex-row items-center gap-3">
              <ThemedText 
                variant={operatingData.netOperating >= 0 ? "success" : "error"}
                size="sm"
                className="font-medium"
              >
                {operatingData.netOperating >= 0 ? '+' : '-'}
                {formatShortCurrency(Math.abs(operatingData.netOperating))}
              </ThemedText>
              <Ionicons 
                name={expandedSections.operating ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#64748b" 
              />
            </View>
          </TouchableOpacity>
          
          {expandedSections.operating && (
            <View className="p-4 bg-white dark:bg-dark-surface">
              <View className="space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <View className="flex-row items-center">
                    <Ionicons name="people" size={14} color="#22c55e" />
                    <ThemedText variant="muted" size="sm" className="ml-2">Cash received from customers</ThemedText>
                  </View>
                  <ThemedText variant="success" size="sm" className="font-medium">
                    {formatCurrency(operatingData.cashFromCustomers)}
                  </ThemedText>
                </View>
                
                {operatingData.cashToSuppliers > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="cube" size={14} color="#ef4444" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Cash paid to suppliers</ThemedText>
                    </View>
                    <ThemedText variant="error" size="sm" className="font-medium">
                      -{formatCurrency(operatingData.cashToSuppliers)}
                    </ThemedText>
                  </View>
                )}
                
                {operatingData.cashForExpenses > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="receipt" size={14} color="#ef4444" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Cash paid for expenses</ThemedText>
                    </View>
                    <ThemedText variant="error" size="sm" className="font-medium">
                      -{formatCurrency(operatingData.cashForExpenses)}
                    </ThemedText>
                  </View>
                )}
                
                {operatingData.cashForWages > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="people-circle" size={14} color="#ef4444" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Cash paid for wages</ThemedText>
                    </View>
                    <ThemedText variant="error" size="sm" className="font-medium">
                      -{formatCurrency(operatingData.cashForWages)}
                    </ThemedText>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center pt-3 mt-2 border-t-2 border-brand">
                  <ThemedText variant="brand" size="sm" className="font-semibold">Net Operating Cash Flow</ThemedText>
                  <ThemedText 
                    variant={operatingData.netOperating >= 0 ? "success" : "error"}
                    size="sm"
                    className="font-bold"
                  >
                    {operatingData.netOperating >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(operatingData.netOperating))}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Investing Activities */}
        <View className="mb-4 border border-border dark:border-dark-border rounded-xl overflow-hidden">
          <TouchableOpacity 
            onPress={() => toggleSection('investing')}
            className="flex-row items-center justify-between p-4 bg-surface-soft dark:bg-dark-surface-soft"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-info/10 items-center justify-center mr-3">
                <Ionicons name="trending-up" size={16} color="#3b82f6" />
              </View>
              <ThemedText variant="subheading" size="base" className="font-semibold">
                Investing Activities
              </ThemedText>
            </View>
            <View className="flex-row items-center gap-3">
              <ThemedText 
                variant={investingData.netInvesting >= 0 ? "success" : "error"}
                size="sm"
                className="font-medium"
              >
                {investingData.netInvesting >= 0 ? '+' : '-'}
                {formatShortCurrency(Math.abs(investingData.netInvesting))}
              </ThemedText>
              <Ionicons 
                name={expandedSections.investing ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#64748b" 
              />
            </View>
          </TouchableOpacity>
          
          {expandedSections.investing && (
            <View className="p-4 bg-white dark:bg-dark-surface">
              <View className="space-y-3">
                {investingData.assetSales > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="cash" size={14} color="#22c55e" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Proceeds from asset sales</ThemedText>
                    </View>
                    <ThemedText variant="success" size="sm" className="font-medium">
                      {formatCurrency(investingData.assetSales)}
                    </ThemedText>
                  </View>
                )}
                
                {investingData.equipmentPurchases > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="hardware-chip" size={14} color="#ef4444" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Purchase of equipment/assets</ThemedText>
                    </View>
                    <ThemedText variant="error" size="sm" className="font-medium">
                      -{formatCurrency(investingData.equipmentPurchases)}
                    </ThemedText>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center pt-3 mt-2 border-t-2 border-brand">
                  <ThemedText variant="brand" size="sm" className="font-semibold">Net Investing Cash Flow</ThemedText>
                  <ThemedText 
                    variant={investingData.netInvesting >= 0 ? "success" : "error"}
                    size="sm"
                    className="font-bold"
                  >
                    {investingData.netInvesting >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(investingData.netInvesting))}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Financing Activities */}
        <View className="mb-6 border border-border dark:border-dark-border rounded-xl overflow-hidden">
          <TouchableOpacity 
            onPress={() => toggleSection('financing')}
            className="flex-row items-center justify-between p-4 bg-surface-soft dark:bg-dark-surface-soft"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-warning/10 items-center justify-center mr-3">
                <Ionicons name="business" size={16} color="#f59e0b" />
              </View>
              <ThemedText variant="subheading" size="base" className="font-semibold">
                Financing Activities
              </ThemedText>
            </View>
            <View className="flex-row items-center gap-3">
              <ThemedText 
                variant={financingData.netFinancing >= 0 ? "success" : "error"}
                size="sm"
                className="font-medium"
              >
                {financingData.netFinancing >= 0 ? '+' : '-'}
                {formatShortCurrency(Math.abs(financingData.netFinancing))}
              </ThemedText>
              <Ionicons 
                name={expandedSections.financing ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#64748b" 
              />
            </View>
          </TouchableOpacity>
          
          {expandedSections.financing && (
            <View className="p-4 bg-white dark:bg-dark-surface">
              <View className="space-y-3">
                {financingData.loansReceived > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="business" size={14} color="#22c55e" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Proceeds from loans</ThemedText>
                    </View>
                    <ThemedText variant="success" size="sm" className="font-medium">
                      {formatCurrency(financingData.loansReceived)}
                    </ThemedText>
                  </View>
                )}
                
                {financingData.loanRepayments > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="card" size={14} color="#ef4444" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Loan repayments</ThemedText>
                    </View>
                    <ThemedText variant="error" size="sm" className="font-medium">
                      -{formatCurrency(financingData.loanRepayments)}
                    </ThemedText>
                  </View>
                )}
                
                {financingData.ownerWithdrawals > 0 && (
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <View className="flex-row items-center">
                      <Ionicons name="person" size={14} color="#ef4444" />
                      <ThemedText variant="muted" size="sm" className="ml-2">Owner withdrawals</ThemedText>
                    </View>
                    <ThemedText variant="error" size="sm" className="font-medium">
                      -{formatCurrency(financingData.ownerWithdrawals)}
                    </ThemedText>
                  </View>
                )}
                
                <View className="flex-row justify-between items-center pt-3 mt-2 border-t-2 border-brand">
                  <ThemedText variant="brand" size="sm" className="font-semibold">Net Financing Cash Flow</ThemedText>
                  <ThemedText 
                    variant={financingData.netFinancing >= 0 ? "success" : "error"}
                    size="sm"
                    className="font-bold"
                  >
                    {financingData.netFinancing >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(financingData.netFinancing))}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Net Cash Flow Summary */}
        <View className="mt-2 pt-4 border-t-2 border-brand bg-gradient-to-r from-brand/10 to-brand/5 rounded-xl p-5">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <ThemedText variant="brand" size="base" className="font-bold">
                NET CASH FLOW
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                Change in cash during period
              </ThemedText>
            </View>
            <ThemedText 
              variant="subheading" 
              size="lg" 
              className={`font-bold ${
                netCashChange >= 0 ? 'text-success' : 'text-error'
              }`}
            >
              {netCashChange >= 0 ? '+' : '-'}
              {formatCurrency(Math.abs(netCashChange))}
            </ThemedText>
          </View>
          
          <View className="flex-row justify-between items-center py-3 border-t border-border dark:border-dark-border">
            <ThemedText variant="muted" size="sm">Beginning Cash Balance</ThemedText>
            <ThemedText variant="default" size="sm" className="font-medium">
              {formatCurrency(summary.beginningBalance)}
            </ThemedText>
          </View>
          
          <View className="flex-row justify-between items-center py-3 border-t border-border dark:border-dark-border">
            <ThemedText variant="brand" size="base" className="font-semibold">
              Ending Cash Balance
            </ThemedText>
            <ThemedText variant="subheading" size="lg" className="font-bold text-brand">
              {formatCurrency(summary.currentBalance)}
            </ThemedText>
          </View>
          
          {/* Performance Insights */}
          <View className="mt-4 pt-3 border-t border-border dark:border-dark-border">
            <ThemedText variant="muted" size="xs" className="mb-2">Performance Insights</ThemedText>
            <View className="flex-row justify-between gap-3">
              <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-2">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="flame" size={12} color={summary.burnRate > 1000 ? "#ef4444" : "#f59e0b"} />
                  <ThemedText variant="muted" size="xs" className="ml-1">Burn Rate</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {formatShortCurrency(summary.burnRate)}/day
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  {summary.burnRate > 1000 ? 'High' : summary.burnRate > 500 ? 'Medium' : 'Low'} consumption
                </ThemedText>
              </View>
              
              <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-2">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="timer" size={12} color="#0ea5e9" />
                  <ThemedText variant="muted" size="xs" className="ml-1">Runway</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {summary.burnRate > 0 ? Math.floor(summary.currentBalance / summary.burnRate) : '∞'} days
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  {summary.burnRate > 0 && Math.floor(summary.currentBalance / summary.burnRate) < 30 ? 'Critical' : 
                   summary.burnRate > 0 && Math.floor(summary.currentBalance / summary.burnRate) < 90 ? 'Warning' : 'Healthy'}
                </ThemedText>
              </View>
              
              <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft rounded-lg p-2">
                <View className="flex-row items-center mb-1">
                  <Ionicons name="water" size={12} color="#22c55e" />
                  <ThemedText variant="muted" size="xs" className="ml-1">Liquidity</ThemedText>
                </View>
                <ThemedText variant="default" size="sm" className="font-medium">
                  {summary.liquidityRatio.toFixed(0)}%
                </ThemedText>
                <ThemedText variant="muted" size="xs">
                  {summary.liquidityRatio > 50 ? 'Good' : summary.liquidityRatio > 25 ? 'Fair' : 'Poor'}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Operating vs Investing vs Financing Contribution */}
          <View className="mt-4 pt-3 border-t border-border dark:border-dark-border">
            <ThemedText variant="muted" size="xs" className="mb-2">Cash Flow Composition</ThemedText>
            <View className="flex-row h-2 rounded-full overflow-hidden">
              <View 
                className="h-full bg-success"
                style={{ width: `${Math.abs(operatingData.netOperating) / (Math.abs(operatingData.netOperating) + Math.abs(investingData.netInvesting) + Math.abs(financingData.netFinancing) || 1) * 100}%` }}
              />
              <View 
                className="h-full bg-info"
                style={{ width: `${Math.abs(investingData.netInvesting) / (Math.abs(operatingData.netOperating) + Math.abs(investingData.netInvesting) + Math.abs(financingData.netFinancing) || 1) * 100}%` }}
              />
              <View 
                className="h-full bg-warning"
                style={{ width: `${Math.abs(financingData.netFinancing) / (Math.abs(operatingData.netOperating) + Math.abs(investingData.netInvesting) + Math.abs(financingData.netFinancing) || 1) * 100}%` }}
              />
            </View>
            <View className="flex-row justify-between mt-1">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-success mr-1" />
                <ThemedText variant="muted" size="xs">Operating</ThemedText>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-info mr-1" />
                <ThemedText variant="muted" size="xs">Investing</ThemedText>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-warning mr-1" />
                <ThemedText variant="muted" size="xs">Financing</ThemedText>
              </View>
            </View>
          </View>
        </View>
      </CardContent>
    </Card>
  );
};