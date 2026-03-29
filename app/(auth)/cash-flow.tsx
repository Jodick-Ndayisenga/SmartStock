// app/(tabs)/cashflow.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  Share
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from "react-native-gifted-charts";
import { useWindowDimensions } from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';

// Models
import Transaction from '@/database/models/Transaction';
import { CashAccount } from '@/database/models/CashAccount';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';
import { Contact } from '@/database/models/Contact';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';


import { useColorScheme } from 'nativewind';
import CustomDialog from '@/components/ui/CustomDialog';
import { CashFlowStatement } from '@/components/cashFlow/CashFlowStatement';
import { CashFlowForecast } from '@/components/cashFlow/CashFlowForecast';
import { CashFlowProjection } from '@/components/cashFlow/CashFlowProjection';
import { of } from '@nozbe/watermelondb/utils/rx';

// Types
interface CashFlowSummary {
  currentBalance: number;
  netCashFlow: number;
  moneyIn: number;
  moneyOut: number;
  operatingCF: number;
  investingCF: number;
  financingCF: number;
  beginningBalance: number;
  cashReserve: number;
  liquidityRatio: number;
  burnRate: number;
}

interface CashFlowTransaction {
  id: string;
  date: Date;
  amount: number;
  type: 'in' | 'out';
  category: string;
  description: string;
  reference: string;
  paymentMethod: string;
  accountName?: string;
}

interface CashFlowByCategory {
  category: string;
  amount: number;
  color: string;
  percentage: number;
  icon: string;
  count?: number;  // Optional: number of transactions in this category
  inflowPercentage?: number;  // Optional: percentage within inflow category
  outflowPercentage?: number;  // Optional: percentage within outflow category
  type?: string;
}

interface DailyCashFlow {
  date: Date;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
type ChartType = 'line' | 'bar' | 'area';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Loading Skeleton Component
const CashFlowSkeleton = () => {
  const { width } = useWindowDimensions();
  
  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader title="Cash Flow" showBackButton />
      <ScrollView className="flex-1">
        <View className="px-4 py-2">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} className="w-16 h-8 bg-surface dark:bg-dark-surface rounded-full animate-pulse" />
            ))}
          </View>
        </View>

        <View className="mx-2 mt-2">
          <View className="flex-row bg-surface dark:bg-dark-surface rounded-lg p-1">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="flex-1 h-8 bg-surface-soft dark:bg-dark-surface-soft rounded-md mx-1 animate-pulse" />
            ))}
          </View>
        </View>

        <View className="flex-row flex-wrap px-2 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="w-[48%] mr-[4%] mb-4">
              <View className="bg-white dark:bg-dark-surface rounded-xl p-3">
                <View className="flex-row items-center mb-2">
                  <View className="w-8 h-8 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse mr-2" />
                  <View className="w-16 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
                </View>
                <View className="w-24 h-6 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-1" />
                <View className="w-16 h-3 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
              </View>
            </View>
          ))}
        </View>

        <View className="mx-2 mt-4">
          <View className="bg-white dark:bg-dark-surface rounded-xl p-4">
            <View className="w-32 h-5 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-2" />
            <View className="w-48 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-4" />
            <View className="h-[200px] w-full bg-surface-soft dark:bg-dark-surface-soft rounded-lg animate-pulse" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Inner component that receives observable data
const CashFlowScreenInner = ({
  transactions = [],
  accountTransactions = [],
  accounts = [],
  products = [],
  stockMovements = [],
  contacts = [],
  isLoading = false,
}: {
  transactions?: Transaction[],
  accountTransactions?: AccountTransaction[],
  accounts?: CashAccount[],
  products?: Product[],
  stockMovements?: StockMovement[],
  contacts?: Contact[],
  isLoading?: boolean;
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { currentShop } = useAuth();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month');
  const [selectedView, setSelectedView] = useState<'overview' | 'statement' | 'categories' | 'forecast'>('overview');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(1)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const {colorScheme} = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Show loading skeleton while data is loading
  if (isLoading) {
    return <CashFlowSkeleton />;
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `FBU ${amount.toLocaleString('fr-FR')}`;
  };

  const formatShortCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `FBU ${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `FBU ${(amount / 1000).toFixed(0)}K`;
    }
    return `FBU ${amount}`;
  };

  // Get date range based on selected period
  const getDateRange = useCallback(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (selectedPeriod) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        return { start: startDate, end: endDate };
    }
    return { start, end };
  }, [selectedPeriod, startDate, endDate]);

  // Calculate cash flow summary using account transactions (more accurate)
  const summary = useMemo((): CashFlowSummary => {
    const { start, end } = getDateRange();
    const startTimestamp = start.getTime();
    const endTimestamp = end.getTime();
    
    // Use account transactions for accurate cash flow
    const periodTransactions = accountTransactions.filter(at => 
      at.transactionDate >= startTimestamp && at.transactionDate <= endTimestamp
    );

    // Calculate totals from account transactions
    let moneyIn = 0;
    let moneyOut = 0;
    let operatingCF = 0;
    let investingCF = 0;
    let financingCF = 0;

    periodTransactions.forEach(at => {
      const amount = Math.abs(at.amount);
      if (at.type === 'income' || at.type === 'deposit' || at.type === 'receivable') {
        moneyIn += amount;
        operatingCF += amount;
      } else if (at.type === 'expense' || at.type === 'withdrawal') {
        moneyOut += amount;
        operatingCF -= amount;
      }
    });

    // Calculate current balance from all accounts
    const currentBalance = accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0);
    
    // Calculate beginning balance (all time)
    const allTransactions = accountTransactions;
    const beginningBalance = allTransactions.reduce((sum, at) => {
      if (at.type === 'income' || at.type === 'deposit') {
        return sum + at.amount;
      } else if (at.type === 'expense' || at.type === 'withdrawal') {
        return sum - at.amount;
      }
      return sum;
    }, 0);

    const netCashFlow = moneyIn - moneyOut;
    
    // Calculate cash reserve (last 30 days average balance)
    const last30Days = accountTransactions.filter(at => 
      at.transactionDate >= Date.now() - 30 * 24 * 60 * 60 * 1000
    );
    const cashReserve = last30Days.length > 0 
      ? last30Days.reduce((sum, at) => sum + at.balanceAfter, 0) / last30Days.length
      : currentBalance;
    
    // Calculate liquidity ratio (cash / liabilities - simplified)
    const liquidityRatio = currentBalance > 0 ? (currentBalance / (moneyOut || 1)) * 100 : 0;
    
    // Calculate burn rate (average daily outflow over last 30 days)
    const dailyOutflows = last30Days
      .filter(at => at.type === 'expense' || at.type === 'withdrawal')
      .reduce((sum, at) => sum + Math.abs(at.amount), 0);
    const burnRate = dailyOutflows / 30;

    return {
      currentBalance,
      netCashFlow,
      moneyIn,
      moneyOut,
      operatingCF,
      investingCF,
      financingCF,
      beginningBalance,
      cashReserve,
      liquidityRatio,
      burnRate,
    };
  }, [accountTransactions, accounts, getDateRange]);

  // Prepare daily cash flow data for chart
  const dailyCashFlow = useMemo((): DailyCashFlow[] => {
    const { start, end } = getDateRange();
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const dailyData: DailyCashFlow[] = [];
    
    let runningBalance = summary.beginningBalance;
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayTransactions = accountTransactions.filter(at => 
        at.transactionDate >= dayStart.getTime() && at.transactionDate <= dayEnd.getTime()
      );
      
      const inflow = dayTransactions
        .filter(at => at.type === 'income' || at.type === 'deposit')
        .reduce((sum, at) => sum + at.amount, 0);
      
      const outflow = dayTransactions
        .filter(at => at.type === 'expense' || at.type === 'withdrawal')
        .reduce((sum, at) => sum + Math.abs(at.amount), 0);
      
      const net = inflow - outflow;
      runningBalance += net;
      
      dailyData.push({
        date,
        inflow,
        outflow,
        net,
        balance: runningBalance,
      });
    }
    
    return dailyData;
  }, [accountTransactions, getDateRange, summary.beginningBalance]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const points = Math.min(dailyCashFlow.length, 30);
    const step = Math.max(1, Math.floor(dailyCashFlow.length / points));
    
    const inflowData: any[] = [];
    const outflowData: any[] = [];
    const netData: any[] = [];
    
    for (let i = 0; i < dailyCashFlow.length; i += step) {
      const day = dailyCashFlow[i];
      let label = '';
      
      if (selectedPeriod === 'today') {
        label = day.date.getHours() + 'h';
      } else if (selectedPeriod === 'week') {
        label = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.date.getDay()];
      } else {
        label = day.date.getDate().toString();
      }
      
      inflowData.push({
        value: day.inflow,
        label,
        dataPointText: day.inflow > 0 ? formatShortCurrency(day.inflow) : '',
      });
      
      outflowData.push({
        value: day.outflow,
        label,
        dataPointText: day.outflow > 0 ? formatShortCurrency(day.outflow) : '',
      });
      
      netData.push({
        value: day.net,
        label,
        dataPointText: day.net !== 0 ? formatShortCurrency(day.net) : '',
      });
    }
    
    return { inflowData, outflowData, netData };
  }, [dailyCashFlow, selectedPeriod]);

  // Category breakdown from account transactions with smart handling
  const categoryBreakdown = useMemo((): CashFlowByCategory[] => {
    const { start, end } = getDateRange();
    const categories: Record<string, { amount: number, type: 'inflow' | 'outflow', count: number }> = {};
    
    const periodTransactions = accountTransactions.filter(at => 
      at.transactionDate >= start.getTime() && at.transactionDate <= end.getTime()
    );
    
    periodTransactions.forEach(at => {
      // Smart category determination based on type and category
      let categoryName = '';
      let isInflow = false;
      
      // Determine based on transaction type first, then category
      switch (at.type) {
        case 'income':
          isInflow = true;
          categoryName = at.category === 'sales' ? 'Sales Revenue' : 
                        at.category === 'payment' ? 'Payment Received' :
                        'Income';
          break;
          
        case 'deposit':
          isInflow = true;
          categoryName = at.category === 'payment' ? 'Payment Received' :
                        at.category === 'sales' ? 'Sales Revenue' :
                        'Cash Deposit';
          break;
          
        case 'receivable':
          isInflow = true;
          categoryName = 'Credit Sales';
          break;
          
        case 'receivable_payment':
          isInflow = true;
          categoryName = 'Debt Collection';
          break;
          
        case 'expense':
          isInflow = false;
          categoryName = at.category === 'purchase' ? 'Inventory Purchase' :
                        at.category === 'expense' ? 'Operating Expense' :
                        'Expense';
          break;
          
        case 'withdrawal':
          isInflow = false;
          categoryName = at.category === 'purchase' ? 'Inventory Purchase' :
                        at.category === 'expense' ? 'Operating Expense' :
                        'Cash Withdrawal';
          break;
          
        case 'transfer_out':
          isInflow = false;
          categoryName = 'Transfer Out';
          break;
          
        case 'transfer_in':
          isInflow = true;
          categoryName = 'Transfer In';
          break;
          
        default:
          // Fallback based on category if available
          if (at.category === 'sales') {
            isInflow = true;
            categoryName = 'Sales Revenue';
          } else if (at.category === 'payment') {
            isInflow = true;
            categoryName = 'Payment Received';
          } else if (at.category === 'purchase') {
            isInflow = false;
            categoryName = 'Inventory Purchase';
          } else if (at.category === 'expense') {
            isInflow = false;
            categoryName = 'Operating Expense';
          } else {
            // Default based on amount sign
            isInflow = at.amount > 0;
            categoryName = isInflow ? 'Other Income' : 'Other Expense';
          }
          break;
      }
      
      const amount = Math.abs(at.amount);
      
      if (!categories[categoryName]) {
        categories[categoryName] = { amount: 0, type: isInflow ? 'inflow' : 'outflow', count: 0 };
      }
      categories[categoryName].amount += amount;
      categories[categoryName].count += 1;
    });
    
    // Separate inflow and outflow
    const inflowCategoriesList = Object.entries(categories)
      .filter(([_, data]) => data.type === 'inflow')
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        type: 'inflow' as const,
      }));
    
    const outflowCategoriesList = Object.entries(categories)
      .filter(([_, data]) => data.type === 'outflow')
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        type: 'outflow' as const,
      }));
    
    const totalInflow = inflowCategoriesList.reduce((sum, cat) => sum + cat.amount, 0);
    const totalOutflow = outflowCategoriesList.reduce((sum, cat) => sum + cat.amount, 0);
    const total = totalInflow + totalOutflow;
    
    // Color schemes
    const inflowColors = ['#22c55e', '#4ade80', '#86efac', '#15803d', '#166534', '#2e7d32', '#388e3c', '#43a047'];
    const outflowColors = ['#ef4444', '#f87171', '#fca5a5', '#b91c1c', '#991b1b', '#c62828', '#d32f2f', '#e53935'];
    
    // Icons for different categories (using valid Ionicons names)
    const getIconForCategory = (category: string, type: 'inflow' | 'outflow'): string => {
      const categoryLower = category.toLowerCase();
      
      if (type === 'inflow') {
        if (categoryLower.includes('sales')) return 'cart-outline';
        if (categoryLower.includes('credit')) return 'receipt-outline';
        if (categoryLower.includes('payment') || categoryLower.includes('debt')) return 'cash-outline';
        if (categoryLower.includes('deposit')) return 'cloud-upload-outline';
        if (categoryLower.includes('transfer')) return 'swap-horizontal-outline';
        return 'trending-up-outline';
      } else {
        if (categoryLower.includes('inventory') || categoryLower.includes('purchase')) return 'cube-outline';
        if (categoryLower.includes('expense')) return 'receipt-outline';
        if (categoryLower.includes('withdrawal')) return 'cloud-download-outline';
        if (categoryLower.includes('transfer')) return 'swap-horizontal-outline';
        return 'trending-down-outline';
      }
    };
    
    // Combine and sort categories with all properties
    const allCategories: CashFlowByCategory[] = [
      ...inflowCategoriesList.map((cat, idx) => {
        const inflowPercentage = totalInflow > 0 ? (cat.amount / totalInflow) * 100 : 0;
        return {
          category: cat.category,
          amount: cat.amount,
          count: cat.count,
          color: inflowColors[idx % inflowColors.length],
          percentage: total > 0 ? (cat.amount / total) * 100 : 0,
          inflowPercentage: inflowPercentage,
          icon: getIconForCategory(cat.category, 'inflow'),
          type: 'inflow' as const,
        };
      }),
      ...outflowCategoriesList.map((cat, idx) => {
        const outflowPercentage = totalOutflow > 0 ? (cat.amount / totalOutflow) * 100 : 0;
        return {
          category: cat.category,
          amount: cat.amount,
          count: cat.count,
          color: outflowColors[idx % outflowColors.length],
          percentage: total > 0 ? (cat.amount / total) * 100 : 0,
          outflowPercentage: outflowPercentage,
          icon: getIconForCategory(cat.category, 'outflow'),
          type: 'outflow' as const,
        };
      }),
    ].sort((a, b) => b.amount - a.amount);
    
    return allCategories;
  }, [accountTransactions, getDateRange]);

  // Recent transactions for cash flow
  const recentTransactions = useMemo((): CashFlowTransaction[] => {
    return accountTransactions
      .sort((a, b) => b.transactionDate - a.transactionDate)
      .slice(0, 15)
      .map(at => {
        const account = accounts.find(a => a.id === at.cashAccountId);
        return {
          id: at.id,
          date: new Date(at.transactionDate),
          amount: Math.abs(at.amount),
          type: (at.type === 'income' || at.type === 'deposit') ? 'in' : 'out',
          category: at.category || at.type,
          description: at.description,
          reference: at.reference || at.id.slice(0, 8),
          paymentMethod: account?.type || 'Cash',
          accountName: account?.name,
        };
      });
  }, [accountTransactions, accounts]);

  // Calculate trends
  const trends = useMemo(() => {
    const previousPeriod = dailyCashFlow.slice(0, Math.floor(dailyCashFlow.length / 2));
    const currentPeriod = dailyCashFlow.slice(Math.floor(dailyCashFlow.length / 2));
    
    const prevAvg = previousPeriod.reduce((sum, d) => sum + d.net, 0) / (previousPeriod.length || 1);
    const currAvg = currentPeriod.reduce((sum, d) => sum + d.net, 0) / (currentPeriod.length || 1);
    
    const percentChange = prevAvg !== 0 ? ((currAvg - prevAvg) / Math.abs(prevAvg)) * 100 : 0;
    
    return {
      percentChange,
      isPositive: currAvg > prevAvg,
      trend: percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'stable',
    };
  }, [dailyCashFlow]);

  // Generate PDF Report
  const generatePDFReport = async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const { start, end } = getDateRange();
      const currencySymbol = 'FBU';
      const currentDate = format(new Date(), 'MMMM dd, yyyy HH:mm');
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Cash Flow Report - ${currentShop?.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              background: #f8fafc;
              padding: 40px;
              color: #1e293b;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              border-radius: 24px;
              overflow: hidden;
              box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
            }
            .header h1 { font-size: 32px; margin-bottom: 8px; }
            .header p { opacity: 0.9; }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 20px;
              padding: 30px;
            }
            .summary-card {
              background: #f8fafc;
              border-radius: 16px;
              padding: 20px;
              text-align: center;
            }
            .summary-value { font-size: 28px; font-weight: 800; margin-top: 8px; }
            .summary-label { font-size: 14px; color: #64748b; }
            .positive { color: #22c55e; }
            .negative { color: #ef4444; }
            .section {
              padding: 30px;
              border-top: 1px solid #e2e8f0;
            }
            .section-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 12px;
              text-align: left;
              border-bottom: 1px solid #e2e8f0;
            }
            th {
              background: #f8fafc;
              font-weight: 600;
            }
            .footer {
              background: #f8fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Cash Flow Report</h1>
              <p>${currentShop?.name} • ${format(start, 'MMMM dd, yyyy')} - ${format(end, 'MMMM dd, yyyy')}</p>
              <p style="margin-top: 16px;">Generated: ${currentDate}</p>
            </div>
            
            <div class="summary-grid">
              <div class="summary-card">
                <div>💰 Money In</div>
                <div class="summary-value positive">${currencySymbol} ${summary.moneyIn.toLocaleString()}</div>
                <div class="summary-label">Total inflow</div>
              </div>
              <div class="summary-card">
                <div>💸 Money Out</div>
                <div class="summary-value negative">${currencySymbol} ${summary.moneyOut.toLocaleString()}</div>
                <div class="summary-label">Total outflow</div>
              </div>
              <div class="summary-card">
                <div>📊 Net Flow</div>
                <div class="summary-value ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}">
                  ${summary.netCashFlow >= 0 ? '+' : '-'}${currencySymbol} ${Math.abs(summary.netCashFlow).toLocaleString()}
                </div>
                <div class="summary-label">Net cash flow</div>
              </div>
              <div class="summary-card">
                <div>🏦 Balance</div>
                <div class="summary-value">${currencySymbol} ${summary.currentBalance.toLocaleString()}</div>
                <div class="summary-label">Current balance</div>
              </div>
            </div>
            
            <div class="section">
              <h2 class="section-title">Cash Flow by Category</h2>
              <table>
                <thead>
                  <tr><th>Category</th><th>Amount</th><th>Percentage</th></tr>
                </thead>
                <tbody>
                  ${categoryBreakdown.map(cat => `
                    <tr>
                      <td>${cat.category}</td>
                      <td>${currencySymbol} ${cat.amount.toLocaleString()}</td>
                      <td>${cat.percentage.toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <h2 class="section-title">Recent Transactions</h2>
              <table>
                <thead>
                  <tr><th>Date</th><th>Description</th><th>Type</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  ${recentTransactions.slice(0, 10).map(tx => `
                    <tr>
                      <td>${format(tx.date, 'MMM dd, yyyy')}</td>
                      <td>${tx.description}</td>
                      <td>${tx.type === 'in' ? 'Income' : 'Expense'}</td>
                      <td class="${tx.type === 'in' ? 'positive' : 'negative'}">
                        ${tx.type === 'in' ? '+' : '-'}${currencySymbol} ${tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            
            <div class="footer">
              <p>This is a computer-generated document. No signature required.</p>
              <p>Generated by ${currentShop?.name} • ${currentDate}</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html, width: 794, height: 1123 });
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss');
      const filename = `CashFlow_Report_${timestamp}.pdf`;
      const newUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.moveAsync({ from: uri, to: newUri });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Cash Flow Report - ${currentShop?.name}`,
        });
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Report generated and shared successfully!');
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to generate report');
    } finally {
      setIsExporting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      database.get<Transaction>('transactions').query().fetch(),
      database.get<AccountTransaction>('account_transactions').query().fetch(),
      database.get<CashAccount>('cash_accounts').query().fetch(),
      database.get<Product>('products').query().fetch(),
      database.get<StockMovement>('stock_movements').query().fetch(),
      database.get<Contact>('contacts').query().fetch(),
    ]);
    setRefreshing(false);
  };

  // Time period selector component
  const PeriodSelector = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2 py-3">
      <View className="flex-row gap-2">
        {(['today', 'week', 'month', 'quarter', 'year'] as TimePeriod[]).map(period => (
          <TouchableOpacity
            key={period}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedPeriod(period);
            }}
            className={`px-4 py-2 rounded-full ${
              selectedPeriod === period 
                ? 'bg-brand' 
                : 'bg-white dark:bg-dark-surface border border-border dark:border-dark-border'
            }`}
          >
            <ThemedText 
              variant={selectedPeriod === period ? 'default' : 'muted'}
              className={selectedPeriod === period ? 'text-white' : ''}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

 // View selector tabs with horizontal scrolling
const ViewSelector = () => (
  <ScrollView 
    horizontal 
    showsHorizontalScrollIndicator={false}
    className="mx-2 mt-2"
  >
    <View className="flex-row gap-2">
      {(['overview', 'statement', 'categories', 'forecast'] as const).map(view => (
        <TouchableOpacity
          key={view}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedView(view);
          }}
          className={`px-4 py-2 rounded-lg p-1 border border-border dark:border-dark-border flex-row items-center justify-center gap-2 ${
            selectedView === view ? 'bg-brand shadow-sm' : ''
          }`}
          style={{ minWidth: 100 }} // Ensure minimum width for each tab
        >
          <Ionicons 
            name={
              view === 'overview' ? 'analytics' :
              view === 'statement' ? 'document-text' :
              view === 'categories' ? 'pie-chart' : 'trending-up'
            } 
            size={16} 
            color={selectedView === view ? '#ffffff' : '#64748b'} 
          />
          <ThemedText 
            variant={selectedView === view ? 'default' : 'muted'}
            className={selectedView === view ? 'text-white' : ''}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  </ScrollView>
);

  // Summary Cards Component with Enhanced Metrics
const SummaryCards = () => (
    <View className="flex-row flex-wrap px-2 mt-4">
      <Card variant="elevated" className="w-[48%] mr-[4%] mb-4">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center mr-3">
                <Ionicons name="trending-down" size={20} color="#22c55e" />
              </View>
              <ThemedText variant="muted" size="sm">Money In</ThemedText>
            </View>
            <TouchableOpacity>
              <Ionicons name="information-circle-outline" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ThemedText variant="brand" size="xl" className="font-bold">
            {formatShortCurrency(summary.moneyIn)}
          </ThemedText>
          <View className="flex-row items-center mt-1">
            <Badge variant="success" size="sm">
              +{((summary.moneyIn / (summary.moneyOut || 1)) * 100).toFixed(0)}%
            </Badge>
            <ThemedText variant="muted" size="xs" className="ml-2">
              of total inflow
            </ThemedText>
          </View>
        </CardContent>
      </Card>

      <Card variant="elevated" className="w-[48%] mb-4">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-error/10 items-center justify-center mr-3">
                <Ionicons name="trending-up" size={20} color="#ef4444" />
              </View>
              <ThemedText variant="muted" size="sm">Money Out</ThemedText>
            </View>
          </View>
          <ThemedText variant="brand" size="xl" className="font-bold text-error">
            {formatShortCurrency(summary.moneyOut)}
          </ThemedText>
          <View className="flex-row items-center mt-1">
            <Badge variant="error" size="sm">
              -{((summary.moneyOut / (summary.moneyIn || 1)) * 100).toFixed(0)}%
            </Badge>
            <ThemedText variant="muted" size="xs" className="ml-2">
              of total outflow
            </ThemedText>
          </View>
        </CardContent>
      </Card>

      <Card variant="elevated" className="w-[48%] mr-[4%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                <MaterialCommunityIcons name="cash-flow" size={20} color="#0ea5e9" />
              </View>
              <ThemedText variant="muted" size="sm">Net Flow</ThemedText>
            </View>
          </View>
          <ThemedText 
            variant="brand" 
            size="xl" 
            className={`font-bold ${
              summary.netCashFlow >= 0 ? 'text-success' : 'text-error'
            }`}
          >
            {summary.netCashFlow >= 0 ? '+' : '-'}
            {formatShortCurrency(Math.abs(summary.netCashFlow))}
          </ThemedText>
          <View className="flex-row items-center mt-1">
            <Ionicons 
              name={trends.isPositive ? 'trending-up' : 'trending-down'} 
              size={14} 
              color={trends.isPositive ? '#22c55e' : '#ef4444'} 
            />
            <ThemedText 
              variant="muted" 
              size="xs" 
              className={`ml-1 ${trends.isPositive ? 'text-success' : 'text-error'}`}
            >
              {Math.abs(trends.percentChange).toFixed(1)}% vs previous
            </ThemedText>
          </View>
        </CardContent>
      </Card>

      <Card variant="elevated" className="w-[48%]">
        <CardContent className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center mr-3">
                <Ionicons name="wallet" size={20} color="#f59e0b" />
              </View>
              <ThemedText variant="muted" size="sm">Balance</ThemedText>
            </View>
          </View>
          <ThemedText variant="brand" size="xl" className="font-bold">
            {formatShortCurrency(summary.currentBalance)}
          </ThemedText>
          <View className="flex-row items-center mt-1">
            <Badge variant={summary.liquidityRatio > 50 ? 'success' : 'warning'} size="sm">
              {summary.liquidityRatio.toFixed(0)}% Liquidity
            </Badge>
            <ThemedText variant="muted" size="xs" className="ml-2">
              Cash reserve: {formatShortCurrency(summary.cashReserve)}
            </ThemedText>
          </View>
        </CardContent>
      </Card>
    </View>
  );


const CashFlowChart = () => {
  const [activeDataset, setActiveDataset] = useState<'inflow' | 'outflow' | 'net'>('net');
  const [chartType, setChartType] = useState<ChartType>('line');
  
  const getChartData = () => {
    switch (activeDataset) {
      case 'inflow': return chartData.inflowData;
      case 'outflow': return chartData.outflowData;
      default: return chartData.netData;
    }
  };
  
  const getChartColor = () => {
    switch (activeDataset) {
      case 'inflow': return '#22c55e';
      case 'outflow': return '#ef4444';
      default: return '#0ea5e9';
    }
  };

  // Prepare bar chart data with 3D effect
  const getBarChartData = () => {
    const data = getChartData();
    const maxValue = Math.max(
      ...chartData.inflowData.map(d => d.value),
      ...chartData.outflowData.map(d => d.value),
      ...chartData.netData.map(d => Math.abs(d.value)),
      1
    );
    
    // Color schemes for different datasets
    const colorSchemes = {
      inflow: {
        frontColor: '#22c55e',
        sideColor: '#16a34a',
        topColor: '#4ade80',
      },
      outflow: {
        frontColor: '#ef4444',
        sideColor: '#dc2626',
        topColor: '#f87171',
      },
      net: {
        frontColor: '#0ea5e9',
        sideColor: '#0284c7',
        topColor: '#38bdf8',
      },
    };
    
    const colors = colorSchemes[activeDataset];
    
    return data.map(item => ({
      value: Math.abs(item.value),
      label: item.label,
      frontColor: colors.frontColor,
      sideColor: colors.sideColor,
      topColor: colors.topColor,
      ...(item.value < 0 && { 
        frontColor: '#ef4444',
        sideColor: '#dc2626',
        topColor: '#f87171',
      }),
    }));
  };

  // Render different chart based on selected type
  const renderChart = () => {
    const data = getChartData();
    const color = getChartColor();
    const maxValue = Math.max(
      ...chartData.inflowData.map(d => d.value),
      ...chartData.outflowData.map(d => d.value),
      ...chartData.netData.map(d => Math.abs(d.value)),
      1
    );
    
    if (data.length === 0) {
      return (
        <View className="h-[220px] items-center justify-center">
          <ThemedText variant="muted">No data available for this period</ThemedText>
        </View>
      );
    }

    switch (chartType) {
      case 'bar':
        // Bar Chart Implementation with 3D effect
        return (
          <View className="items-center">
            <BarChart
              showFractionalValue={false}
              showYAxisIndices={true}
              hideRules={false}
              noOfSections={5}
              maxValue={maxValue * 1.2}
              data={getBarChartData()}
              barWidth={40}
              sideWidth={15}
              isThreeD={true}
              side="right"
              showGradient={true}
              gradientColor={getChartColor()}
              barBorderRadius={4}
              yAxisColor="#94a3b8"
              xAxisColor="#94a3b8"
              yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
              xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10, width: 50 }}
              spacing={15}
              showValuesAsTopLabel={true}
              topLabelTextStyle={{ color: '#1e293b', fontSize: 10 }}
              showScrollIndicator={true}
              scrollAnimation={true}
              isAnimated={true}
              animationDuration={500}
              renderTooltip={(item: any) => (
                <View className="bg-white dark:bg-dark-surface px-3 py-2 rounded-lg shadow-lg border border-border dark:border-dark-border">
                  <ThemedText variant="subheading" size="sm">
                    {formatShortCurrency(item.value)}
                  </ThemedText>
                </View>
              )}
            />
          </View>
        );
      
      case 'area':
        // Area Chart Implementation
        return (
          <LineChart
            data={data}
            height={220}
            width={SCREEN_WIDTH - 80}
            color={color}
            thickness={2.5}
            backgroundColor="transparent"
            curved={true}
            isAnimated
            animationDuration={500}
            spacing={Math.min(40, (SCREEN_WIDTH - 80) / data.length)}
            hideDataPoints={false}
            dataPointsColor={color}
            yAxisColor="#94a3b8"
            xAxisColor="#94a3b8"
            yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
            noOfSections={5}
            maxValue={maxValue * 1.2}
            areaChart={true}
            startFillColor={color}
            startOpacity={0.3}
            endFillColor={color}
            endOpacity={0.01}
            pointerConfig={{
              pointerStripHeight: 200,
              pointerStripColor: '#94a3b8',
              pointerStripWidth: 1,
              pointerColor: color,
              radius: 6,
              pointerLabelWidth: 100,
              pointerLabelHeight: 90,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: any[]) => (
                <View className="bg-white dark:bg-dark-surface px-3 py-2 rounded-lg shadow-lg border border-border dark:border-dark-border">
                  <ThemedText variant="subheading" size="sm">
                    {formatShortCurrency(items[0]?.value || 0)}
                  </ThemedText>
                </View>
              ),
            }}
          />
        );
      
      case 'line':
      default:
        // Line Chart Implementation
        return (
          <LineChart
            data={data}
            height={220}
            width={SCREEN_WIDTH - 80}
            color={color}
            thickness={2.5}
            backgroundColor="transparent"
            curved={true}
            isAnimated
            animationDuration={500}
            spacing={Math.min(40, (SCREEN_WIDTH - 80) / data.length)}
            hideDataPoints={false}
            dataPointsColor={color}
            dataPointsRadius={4}
            yAxisColor="#94a3b8"
            xAxisColor="#94a3b8"
            yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
            noOfSections={5}
            maxValue={maxValue * 1.2}
            pointerConfig={{
              pointerStripHeight: 200,
              pointerStripColor: '#94a3b8',
              pointerStripWidth: 1,
              pointerColor: color,
              radius: 6,
              pointerLabelWidth: 100,
              pointerLabelHeight: 90,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: any[]) => (
                <View className="bg-white dark:bg-dark-surface px-3 py-2 rounded-lg shadow-lg border border-border dark:border-dark-border">
                  <ThemedText variant="subheading" size="sm">
                    {formatShortCurrency(items[0]?.value || 0)}
                  </ThemedText>
                </View>
              ),
            }}
          />
        );
    }
  };

  return (
    <Card variant="elevated" className="mx-2 mt-6">
      <CardHeader 
        title="Cash Flow Trend"
        subtitle={`${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} overview`}
        action={
          <View className="flex-row gap-2">
            {(['line', 'bar', 'area'] as ChartType[]).map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setChartType(type);
                }}
                className={`p-2 rounded-lg ${
                  chartType === type 
                    ? 'bg-brand' 
                    : 'bg-surface-soft dark:bg-dark-surface-soft'
                }`}
              >
                <Ionicons 
                  name={
                    type === 'line' ? 'trending-up' : 
                    type === 'bar' ? 'bar-chart' : 'grid'
                  } 
                  size={18} 
                  color={chartType === type ? '#ffffff' : '#64748b'} 
                />
              </TouchableOpacity>
            ))}
          </View>
        }
      />
      <CardContent className="p-4">
        {/* Dataset Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveDataset('net');
              }}
              className={`px-4 py-2 rounded-full ${
                activeDataset === 'net' 
                  ? 'bg-brand' 
                  : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}
            >
              <ThemedText 
                variant={activeDataset === 'net' ? 'default' : 'muted'} 
                className={activeDataset === 'net' ? 'text-white' : ''}
              >
                Net Flow
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveDataset('inflow');
              }}
              className={`px-4 py-2 rounded-full ${
                activeDataset === 'inflow' 
                  ? 'bg-success' 
                  : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}
            >
              <ThemedText 
                variant={activeDataset === 'inflow' ? 'default' : 'muted'} 
                className={activeDataset === 'inflow' ? 'text-white' : ''}
              >
                Money In
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveDataset('outflow');
              }}
              className={`px-4 py-2 rounded-full ${
                activeDataset === 'outflow' 
                  ? 'bg-error' 
                  : 'bg-surface-soft dark:bg-dark-surface-soft'
              }`}
            >
              <ThemedText 
                variant={activeDataset === 'outflow' ? 'default' : 'muted'} 
                className={activeDataset === 'outflow' ? 'text-white' : ''}
              >
                Money Out
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Dynamic Chart Rendering */}
        <View className="items-center justify-center">
          {renderChart()}
        </View>
        
        {/* Mini Stats */}
        <View className="flex-row justify-between mt-4 pt-4 border-t border-border dark:border-dark-border">
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">Highest Inflow</ThemedText>
            <ThemedText variant="success" size="sm" className="font-bold">
              {formatShortCurrency(Math.max(...chartData.inflowData.map(d => d.value), 0))}
            </ThemedText>
          </View>
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">Highest Outflow</ThemedText>
            <ThemedText variant="error" size="sm" className="font-bold">
              {formatShortCurrency(Math.max(...chartData.outflowData.map(d => d.value), 0))}
            </ThemedText>
          </View>
          <View className="items-center flex-1">
            <ThemedText variant="muted" size="xs">Best Day</ThemedText>
            <ThemedText variant="success" size="sm" className="font-bold">
              {formatShortCurrency(Math.max(...chartData.netData.map(d => d.value), 0))}
            </ThemedText>
          </View>
        </View>

        {/* Chart Legend */}
        <View className="mt-3 pt-3 border-t border-border dark:border-dark-border">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row justify-center gap-4">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-success mr-1" />
                <ThemedText variant="muted" size="xs">Positive/Income</ThemedText>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full bg-error mr-1" />
                <ThemedText variant="muted" size="xs">Negative/Expense</ThemedText>
              </View>
              <View className="flex-row items-center">
                <View className="w-4 h-3 bg-brand rounded-sm mr-1" />
                <ThemedText variant="muted" size="xs">Current Dataset</ThemedText>
              </View>
              {chartType === 'bar' && (
                <View className="flex-row items-center">
                  <View className="w-4 h-4 bg-brand rounded-sm mr-1" style={{ transform: [{ skewX: '-15deg' }] }} />
                  <ThemedText variant="muted" size="xs">3D Effect</ThemedText>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </CardContent>
    </Card>
  );
};

  // Category Breakdown Component with UNIQUE colors for EVERY category
const CategoryBreakdown = () => {
  const inflowCategories = categoryBreakdown.filter(c => c.type === 'inflow');
  const outflowCategories = categoryBreakdown.filter(c => c.type === 'outflow');
  const totalInflow = inflowCategories.reduce((sum, cat) => sum + cat.amount, 0);
  const totalOutflow = outflowCategories.reduce((sum, cat) => sum + cat.amount, 0);
  const netFlow = totalInflow - totalOutflow;
  
  // State for dialog
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  
  // UNIQUE color palette - each category gets a distinct color
  // Based on your actual categories: Cash Deposit, Credit Sales, Payment Received, Debt Collection, Cash Withdrawal
  const UNIQUE_CATEGORY_COLORS: Record<string, string> = {
    // Inflow categories - each with unique color
    'Cash Deposit': '#22c55e',      // Vibrant Green
    'Credit Sales': '#3b82f6',      // Bright Blue
    'Payment Received': '#8b5cf6',  // Purple
    'Debt Collection': '#f59e0b',   // Orange
    // Outflow categories
    'Cash Withdrawal': '#ef4444',   // Red
    
    // Additional colors for any other categories that might appear
    'Sales Revenue': '#06b6d4',     // Cyan
    'Income': '#84cc16',            // Lime
    'Transfer In': '#14b8a6',       // Teal
    'Transfer Out': '#f97316',      // Dark Orange
    'Inventory Purchase': '#ec4899', // Pink
    'Operating Expense': '#a855f7', // Violet
    'Expense': '#dc2626',           // Dark Red
    'Other Income': '#10b981',      // Emerald
    'Other Expense': '#f43f5e',     // Rose
  };
  
  // Assign colors to categories
  const assignColors = (categories: any[]) => {
    return categories.map(cat => ({
      ...cat,
      color: UNIQUE_CATEGORY_COLORS[cat.category] || UNIQUE_CATEGORY_COLORS['Other Income'] || '#64748b'
    }));
  };
  
  const coloredInflow = assignColors(inflowCategories);
  const coloredOutflow = assignColors(outflowCategories);
  
  // Prepare pie chart data with unique colors
  const pieData = [
    ...coloredInflow.map((cat) => ({
      value: cat.amount,
      color: cat.color,
      text: `${(cat.inflowPercentage || 0).toFixed(0)}%`,
      label: cat.category,
      type: 'inflow' as const,
      name: cat.category,
      icon: cat.icon,
      amount: cat.amount,
      count: cat.count,
    })),
    ...coloredOutflow.map((cat) => ({
      value: cat.amount,
      color: cat.color,
      text: `${(cat.outflowPercentage || 0).toFixed(0)}%`,
      label: cat.category,
      type: 'outflow' as const,
      name: cat.category,
      icon: cat.icon,
      amount: cat.amount,
      count: cat.count,
    })),
  ].filter(item => item.value > 0);
  
  // Calculate center shift for 3D effect
  const centerShift = pieData.length > 4 ? -8 : -5;
  
  // Handle category press
  const handleCategoryPress = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(item);
    setDialogVisible(true);
  };
  
  if (categoryBreakdown.length === 0) {
    return (
      <Card variant="elevated" className="mx-2 mt-6">
        <CardHeader 
          title="Cash Flow by Category"
          subtitle="Where your money comes from and goes"
        />
        <CardContent className="p-4">
          <View className="py-8">
            <EmptyState
              icon="pie-chart-outline"
              title="No Category Data"
              description="Start adding transactions to see category breakdown"
            />
          </View>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card variant="elevated" className="mx-2 mt-6">
        <CardHeader 
          title="Cash Flow by Category"
          subtitle="Where your money comes from and goes"
          action={
            <TouchableOpacity>
              <ThemedText variant="brand" size="xs">View All</ThemedText>
            </TouchableOpacity>
          }
        />
        <CardContent className="p-4">
          {/* Summary Stats Row */}
          <View className="flex-row gap-3">
            <View className="flex-1 bg-success/10 rounded-sm p-3">
              <View className="flex-row items-center justify-between mb-1">
                <ThemedText variant="muted" size="xs">Total Inflow</ThemedText>
                <Ionicons name="trending-up" size={14} color="#22c55e" />
              </View>
              <ThemedText variant="success" size="lg" className="font-bold">
                {formatShortCurrency(totalInflow)}
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1">
                {inflowCategories.length} categories
              </ThemedText>
            </View>
            <View className="flex-1 bg-error/10 rounded-sm p-3">
              <View className="flex-row items-center justify-between mb-1">
                <ThemedText variant="muted" size="xs">Total Outflow</ThemedText>
                <Ionicons name="trending-down" size={14} color="#ef4444" />
              </View>
              <ThemedText variant="error" size="lg" className="font-bold">
                {formatShortCurrency(totalOutflow)}
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="mt-1">
                {outflowCategories.length} categories
              </ThemedText>
            </View>
          </View>


          {/* Beautiful 3D Pie Chart Section */}
          {pieData.length > 0 && (
            <View className="items-center mb-2">
              <View className="relative">
                <PieChart
                  data={pieData}
                  donut
                  isThreeD
                  showText
                  innerCircleBorderWidth={4}  // Increased from 4 to 6 for thicker border
                  innerCircleBorderColor={isDark ? '#334155' : '#cbd5e1'}  // More visible color
                  innerCircleColor={isDark ? '#0f172a' : '#ffffff'}  // This sets the background color of the donut hole
                  shiftInnerCenterX={centerShift}
                  shiftInnerCenterY={centerShift - 6}
                  textColor={isDark ? '#f9f1f1' : '#1e293b'}
                  textSize={14}
                  showTextBackground
                  textBackgroundRadius={20}
                  textBackgroundColor={isDark ? '#1e293b' : '#ffffff'}
                  //textBackgroundColorOpacity={0.1}
                  // Option 2: Medium (Default but larger)
                  radius={SCREEN_WIDTH / 2.5}  // Medium large
                  innerRadius={SCREEN_WIDTH / 4.2}
                  strokeColor={isDark ? '#1e293b' : '#ffffff'}  // Outer stroke around each segment
                  strokeWidth={2}
                  showValuesAsLabels={false}
                  showTooltip
                  tooltipBackgroundColor={isDark ? '#1e293b' : '#ffffff'}
                  tooltipTextStyle={{ 
                    color: isDark ? '#f1f5f9' : '#1e293b', 
                    fontSize: 12,
                    fontWeight: '500'
                  }}
                  focusOnPress
                  onPress={(item: any) => {
                    handleCategoryPress(item);
                  }}
                  centerLabelComponent={() => (
                    <View className="items-center">
                      <ThemedText variant="heading" size="xl" className="font-bold">
                        {formatShortCurrency(Math.abs(netFlow))}
                      </ThemedText>
                      <View className="flex-row items-center mt-1">
                        <Ionicons 
                          name={netFlow >= 0 ? "trending-up" : "trending-down"} 
                          size={12} 
                          color={netFlow >= 0 ? "#22c55e" : "#ef4444"} 
                        />
                        <ThemedText 
                          variant={netFlow >= 0 ? "success" : "error"} 
                          size="xs" 
                          className="ml-1"
                        >
                          Net Flow
                        </ThemedText>
                      </View>
                      <View className="mt-2 px-2 py-1 bg-surface-soft dark:bg-dark-surface-soft rounded-full">
                        <ThemedText variant="muted" size="xs">
                          {pieData.length} Categories
                        </ThemedText>
                      </View>
                    </View>
                  )}
                  showGradient
                  gradientCenterColor={isDark ? '#0f172a' : '#f8fafc'}
                  // Additional properties for better visibility
                  focusEnabled={true}
                  showStrip={false}
                  showShadow={true}
                  //shadowColor={isDark ? '#000000' : '#00000020'}
                />
              </View>
              
              {/* Pie Chart Legend with Icons */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                <View className="flex-row gap-2">
                  {pieData.map((item, index) => (
                    <TouchableOpacity 
                      key={index} 
                      className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft px-3 py-1.5 rounded-full"
                      onPress={() => handleCategoryPress(item)}
                    >
                      <View 
                        className="w-3 h-3 rounded-full mr-1.5" 
                        style={{ backgroundColor: item.color }}
                      />
                      <Ionicons name={item.icon as any} size={10} color={item.color} />
                      <ThemedText variant="muted" size="xs" numberOfLines={1} className="ml-1">
                        {item.label.length > 10 ? item.label.slice(0, 10) + '...' : item.label}
                      </ThemedText>
                      <ThemedText variant="default" size="xs" className="ml-1 font-semibold">
                        {item.text}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Inflow Section - Now with UNIQUE colors */}
          {coloredInflow.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-1 h-5 bg-success rounded-full mr-2" />
                <ThemedText variant="subheading" size="sm" className="font-semibold">
                  Money In
                </ThemedText>
                <Badge variant="success" size="sm" className="ml-2">
                  {totalInflow > 0 ? ((totalInflow / (totalInflow + totalOutflow || 1)) * 100).toFixed(0) : 0}%
                </Badge>
              </View>
              
              {coloredInflow.map((item, index) => (
                <TouchableOpacity 
                  key={item.category} 
                  className="mb-3"
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress({
                    ...item,
                    type: 'inflow',
                    value: item.amount,
                    text: `${(item.inflowPercentage || 0).toFixed(0)}%`
                  })}
                >
                  <View className="flex-row justify-between items-center mb-1">
                    <View className="flex-row items-center flex-1">
                      <View 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      />
                      <View className="flex-row items-center gap-1 flex-1">
                        <Ionicons name={item.icon as any} size={14} color={item.color} />
                        <ThemedText numberOfLines={1} className="flex-1 ml-1 font-medium">
                          {item.category}
                        </ThemedText>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <ThemedText variant="default" className="font-semibold">
                        {formatShortCurrency(item.amount)}
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        ({((item.inflowPercentage || 0)).toFixed(0)}%)
                      </ThemedText>
                    </View>
                  </View>
                  <View className="w-full h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                    <View 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${item.inflowPercentage || 0}%`,
                        backgroundColor: item.color 
                      }}
                    />
                  </View>
                  {(item.count && item.count > 1) && (
                    <ThemedText variant="muted" size="xs" className="mt-1 text-right">
                      {item.count} transactions
                    </ThemedText>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Outflow Section - Now with UNIQUE colors */}
          {coloredOutflow.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-1 h-5 bg-error rounded-full mr-2" />
                <ThemedText variant="subheading" size="sm" className="font-semibold">
                  Money Out
                </ThemedText>
                <Badge variant="error" size="sm" className="ml-2">
                  {totalOutflow > 0 ? ((totalOutflow / (totalInflow + totalOutflow || 1)) * 100).toFixed(0) : 0}%
                </Badge>
              </View>
              
              {coloredOutflow.map((item, index) => (
                <TouchableOpacity 
                  key={item.category} 
                  className="mb-3"
                  activeOpacity={0.7}
                  onPress={() => handleCategoryPress({
                    ...item,
                    type: 'outflow',
                    value: item.amount,
                    text: `${(item.outflowPercentage || 0).toFixed(0)}%`
                  })}
                >
                  <View className="flex-row justify-between items-center mb-1">
                    <View className="flex-row items-center flex-1">
                      <View 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      />
                      <View className="flex-row items-center gap-1 flex-1">
                        <Ionicons name={item.icon as any} size={14} color={item.color} />
                        <ThemedText numberOfLines={1} className="flex-1 ml-1 font-medium">
                          {item.category}
                        </ThemedText>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <ThemedText variant="default" className="font-semibold">
                        {formatShortCurrency(item.amount)}
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        ({((item.outflowPercentage || 0)).toFixed(0)}%)
                      </ThemedText>
                    </View>
                  </View>
                  <View className="w-full h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden">
                    <View 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${item.outflowPercentage || 0}%`,
                        backgroundColor: item.color 
                      }}
                    />
                  </View>
                  {(item.count && item.count > 1) && (
                    <ThemedText variant="muted" size="xs" className="mt-1 text-right">
                      {item.count} transactions
                    </ThemedText>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Enhanced Ratio Summary with Gradient */}
          <View className="mt-4 pt-4 border-t border-border dark:border-dark-border">
            <View className="flex-row justify-around">
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-gradient-to-br from-success/30 to-success/10 items-center justify-center">
                  <Ionicons name="cash" size={24} color="#22c55e" />
                </View>
                <ThemedText variant="success" size="sm" className="font-bold mt-2">
                  {((totalInflow / (totalInflow + totalOutflow || 1)) * 100).toFixed(0)}%
                </ThemedText>
                <ThemedText variant="muted" size="xs">Income Ratio</ThemedText>
              </View>
              
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-gradient-to-br from-error/30 to-error/10 items-center justify-center">
                  <Ionicons name="receipt" size={24} color="#ef4444" />
                </View>
                <ThemedText variant="error" size="sm" className="font-bold mt-2">
                  {((totalOutflow / (totalInflow + totalOutflow || 1)) * 100).toFixed(0)}%
                </ThemedText>
                <ThemedText variant="muted" size="xs">Expense Ratio</ThemedText>
              </View>
              
              <View className="items-center">
                <View className="w-14 h-14 rounded-full bg-gradient-to-br from-brand/30 to-brand/10 items-center justify-center">
                  <Ionicons name="trending-up" size={24} color="#0ea5e9" />
                </View>
                <ThemedText 
                  variant={netFlow >= 0 ? "success" : "error"} 
                  size="sm" 
                  className="font-bold mt-2"
                >
                  {netFlow >= 0 ? '+' : ''}{formatShortCurrency(netFlow)}
                </ThemedText>
                <ThemedText variant="muted" size="xs">Net Flow</ThemedText>
              </View>
            </View>
            
            {/* Mini Progress Bar */}
            <View className="mt-4">
              <View className="flex-row justify-between mb-1">
                <ThemedText variant="muted" size="xs">Income</ThemedText>
                <ThemedText variant="muted" size="xs">Expense</ThemedText>
              </View>
              <View className="w-full h-2 bg-surface-soft dark:bg-dark-surface-soft rounded-full overflow-hidden flex-row">
                <View 
                  className="h-full rounded-l-full"
                  style={{ 
                    width: `${(totalInflow / (totalInflow + totalOutflow || 1)) * 100}%`,
                    backgroundColor: '#22c55e'
                  }}
                />
                <View 
                  className="h-full rounded-r-full"
                  style={{ 
                    width: `${(totalOutflow / (totalInflow + totalOutflow || 1)) * 100}%`,
                    backgroundColor: '#ef4444'
                  }}
                />
              </View>
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Custom Dialog for Category Details */}
      <CustomDialog
        visible={dialogVisible}
        title={selectedCategory?.label || ''}
        description={
          selectedCategory ? 
          `Total ${selectedCategory.type === 'inflow' ? 'Income' : 'Expense'}: ${formatCurrency(selectedCategory.amount)}\n` +
          `Percentage of total flow: ${selectedCategory.text}\n` +
          `Number of transactions: ${selectedCategory.count || 1}\n` +
          `Category type: ${selectedCategory.type === 'inflow' ? 'Income' : 'Expense'}`
          : ''
        }
        variant={selectedCategory?.type === 'inflow' ? 'success' : 'error'}
        icon={selectedCategory?.icon as any || (selectedCategory?.type === 'inflow' ? 'cash-outline' : 'receipt-outline')}
        actions={[
          {
            label: 'view all',
            onPress: () => {
              setDialogVisible(false);
              // Navigate to filtered transactions
              router.push({
                pathname: `/shops/${currentShop?.id}/transactions`,
                params: { 
                  filter: selectedCategory?.type === 'inflow' ? 'income' : 'expense',
                  category: selectedCategory?.label 
                }
              });
            },
            variant: 'default',
          },
        ]}
        showCancel={true}
        cancelLabel="Close"
        onCancel={() => setDialogVisible(false)}
        onClose={() => setDialogVisible(false)}
        disableBackdropClose={false}
      />
    </>
  );
};
  // Enhanced Recent Transactions Component
  const RecentTransactions = () => (
    <Card variant="elevated" className="mx-2 mt-6 mb-8">
      <CardHeader 
        title="Recent Transactions"
        subtitle="Latest cash flow activities"
        action={
          <TouchableOpacity onPress={() => router.push(`/shops/${currentShop?.id}/transactions`)}>
            <ThemedText variant="brand" size="sm">View All</ThemedText>
          </TouchableOpacity>
        }
      />
      <CardContent className="p-2">
        {recentTransactions.length > 0 ? (
          recentTransactions.map((t, index) => (
            <TouchableOpacity 
              key={t.id}
              className={`flex-row items-center p-3 ${
                index < recentTransactions.length - 1 ? 'border-b border-border dark:border-dark-border' : ''
              }`}
              onPress={() => router.push(`/shops/${currentShop?.id}/transaction/${t.id}`)}
            >
              <View className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                t.type === 'in' ? 'bg-success/10' : 'bg-error/10'
              }`}>
                <Ionicons 
                  name={t.type === 'in' ? 'arrow-down' : 'arrow-up'} 
                  size={22} 
                  color={t.type === 'in' ? '#22c55e' : '#ef4444'} 
                />
              </View>
              
              <View className="flex-1">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 mr-2">
                    <ThemedText variant="subheading" size="sm" numberOfLines={1}>
                      {t.description}
                    </ThemedText>
                    {t.accountName && (
                      <ThemedText variant="muted" size="xs" numberOfLines={1}>
                        {t.accountName}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText 
                    variant={t.type === 'in' ? 'success' : 'error'}
                    size="sm"
                    className="font-semibold"
                  >
                    {t.type === 'in' ? '+' : '-'}{formatShortCurrency(t.amount)}
                  </ThemedText>
                </View>
                
                <View className="flex-row justify-between mt-1">
                  <View className="flex-row gap-1">
                    <Badge variant="outline" size="sm">
                      {t.category}
                    </Badge>
                    <Badge variant="outline" size="sm">
                      {t.paymentMethod}
                    </Badge>
                  </View>
                  <ThemedText variant="muted" size="xs">
                    {t.date.toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="py-8">
            <EmptyState
              icon="swap-vertical-outline"
              title="No Transactions"
              description="Transactions will appear here"
            />
          </View>
        )}
      </CardContent>
    </Card>
  );

  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Cash Flow" showBackButton />
        <EmptyState
          icon="cash-outline"
          title="No Shop Found"
          description="Create a shop first to view cash flow"
          action={{
            label: "Create Shop",
            onPress: () => router.push('/(auth)/create-shop')
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Cash Flow Analysis"
        subtitle={currentShop.name}
        showBackButton
      />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
        }
        showsVerticalScrollIndicator={false}
      >
        <PeriodSelector />
        <ViewSelector />
        <SummaryCards />
        
        {selectedView === 'overview' && (
          <>
            <CashFlowChart />
            <RecentTransactions />
          </>
        )}

        {selectedView === 'statement' && (
        <CashFlowStatement
          accountTransactions={accountTransactions}
          summary={{
            currentBalance: summary.currentBalance,
            beginningBalance: summary.beginningBalance,
            burnRate: summary.burnRate,
            liquidityRatio: summary.liquidityRatio,
          }}
          getDateRange={getDateRange}
          formatCurrency={formatCurrency}
          formatShortCurrency={formatShortCurrency}
          generatePDFReport={generatePDFReport}
          selectedPeriod={selectedPeriod}
        />
      )}

        {selectedView === 'categories' && (
          <>
            <CategoryBreakdown />
            <Card variant="elevated" className="mx-2 mt-4 mb-8 p-4">
              <ThemedText variant="subheading" className="mb-4">Cash Flow by Account</ThemedText>
              <View className="flex-row flex-wrap justify-between">
                {accounts.slice(0, 4).map(account => (
                  <View key={account.id} className="w-[48%] mb-3">
                    <View className="bg-surface-soft dark:bg-dark-surface-soft rounded-xl p-3 items-center">
                      <FontAwesome5 name="wallet" size={24} color={account.type === 'cash' ? '#22c55e' : '#0ea5e9'} />
                      <ThemedText variant="muted" size="sm" className="mt-1 text-center" numberOfLines={1}>
                        {account.name}
                      </ThemedText>
                      <ThemedText variant="default" className="font-bold">
                        {formatShortCurrency(account.currentBalance || 0)}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {selectedView === 'forecast' && (
          <>
            <CashFlowForecast
              currentBalance={summary.currentBalance}
              moneyIn={summary.moneyIn}
              moneyOut={summary.moneyOut}
              netCashFlow={summary.netCashFlow}
              formatCurrency={formatCurrency}
              formatShortCurrency={formatShortCurrency}
              onRunScenario={() => {
                // Handle scenario analysis
                console.log('Run scenario clicked');
              }}
              onWhatIf={() => {
                // Handle what-if analysis
                console.log('What-if clicked');
              }}
            />
            <CashFlowProjection
              currentBalance={summary.currentBalance}
              netCashFlow={summary.netCashFlow}
              formatCurrency={formatCurrency}
              formatShortCurrency={formatShortCurrency}
            />
          </>
        )}

        {/* Quick Actions */}
        <View className="flex-row gap-3 mx-2 mt-4 mb-4">
          <Button 
            variant="default" 
            className="flex-1"
            onPress={() => router.push('/(tabs)/sales')}
          >
            <Ionicons name="add-circle" size={20} color="white" />
            <ThemedText className="text-white ml-2">New Sale</ThemedText>
          </Button>
          <Button 
            variant="outline" 
            className="flex-1"
            onPress={() => router.push('/(auth)/add-transaction')}
          >
            <Ionicons name="remove-circle" size={20} color="#ef4444" />
            <ThemedText className="ml-2">Add Expense</ThemedText>
          </Button>
        </View>
        <View className='px-2 pb-8'>
        <Button variant='success' size='lg'>
          <Ionicons name="document-text" size={20} color="white" />
          <ThemedText className="text-white ml-2" onPress={() => setShowExportModal(true)}>
            Export Report
          </ThemedText>
        </Button>
        </View>
      </ScrollView>

      {/* Export Modal */}
      <Modal
        visible={showExportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExportModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-dark-surface rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <ThemedText variant="heading" size="lg">Export Report</ThemedText>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ThemedText variant="muted" className="mb-6">
              Generate a professional PDF report of your cash flow analysis
            </ThemedText>
            
            <Button
              variant="default"
              size="lg"
              onPress={generatePDFReport}
              loading={isExporting}
              className="mb-3"
            >
              <Ionicons name="document-text" size={20} color="white" />
              <ThemedText className="text-white ml-2">Generate PDF Report</ThemedText>
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onPress={() => {
                Share.share({
                  message: `Cash Flow Summary for ${currentShop?.name}\n\n` +
                    `💰 Money In: ${formatCurrency(summary.moneyIn)}\n` +
                    `💸 Money Out: ${formatCurrency(summary.moneyOut)}\n` +
                    `📊 Net Flow: ${summary.netCashFlow >= 0 ? '+' : '-'}${formatCurrency(Math.abs(summary.netCashFlow))}\n` +
                    `🏦 Current Balance: ${formatCurrency(summary.currentBalance)}\n\n` +
                    `Generated from ${currentShop?.name}`
                });
              }}
            >
              <Ionicons name="share-social" size={20} color="#0ea5e9" />
              <ThemedText className="ml-2">Share Summary</ThemedText>
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Loading wrapper component
const CashFlowWithLoading = ({
  transactions,
  accountTransactions,
  accounts,
  products,
  stockMovements,
  contacts,
}: {
  transactions?: Transaction[],
  accountTransactions?: AccountTransaction[],
  accounts?: CashAccount[],
  products?: Product[],
  stockMovements?: StockMovement[],
  contacts?: Contact[],
}) => {
  const isLoading = !transactions || !accountTransactions || !accounts || !products || !stockMovements || !contacts;
  
  return (
    <CashFlowScreenInner
      transactions={transactions}
      accountTransactions={accountTransactions}
      accounts={accounts}
      products={products}
      stockMovements={stockMovements}
      contacts={contacts}
      isLoading={isLoading}
    />
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        transactions: of([]), // or [],
        accountTransactions: of([]), // or [],
        accounts: of([]), // or [],
        products: of([]), // or [],
        stockMovements: of([]), // or [],
        contacts: of([]), // or [],
      };
    }

    return {
      transactions: database
        .get<Transaction>('transactions')
        .query(Q.where('shop_id', currentShop.id))
        .observe(),
      accountTransactions: database
        .get<AccountTransaction>('account_transactions')
        .query(Q.where('shop_id', currentShop.id))
        .observe(),
      accounts: database
        .get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      products: database
        .get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      stockMovements: database
        .get<StockMovement>('stock_movements')
        .query(Q.where('shop_id', currentShop.id))
        .observe(),
      contacts: database
        .get<Contact>('contacts')
        .query(
          Q.where('shop_id', currentShop.id)
        )
        .observe(),
    };
  }
);

const CashFlowScreenWithObservables = enhance(CashFlowWithLoading);

// Main exported component
export default function CashFlowScreen() {
  const { currentShop } = useAuth();
  return <CashFlowScreenWithObservables currentShop={currentShop} />;
}