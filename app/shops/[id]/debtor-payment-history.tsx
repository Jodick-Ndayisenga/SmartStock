// // app/(tabs)/debtor-payment-history.tsx
// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import {
//   View,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Animated,
//   Dimensions,
// } from 'react-native';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { useColorScheme } from 'nativewind';
// import * as Haptics from 'expo-haptics';
// import { LineChart, BarChart, PieChart } from 'react-native-gifted-charts';

// // Components
// import PremiumHeader from '@/components/layout/PremiumHeader';
// import { ThemedText } from '@/components/ui/ThemedText';
// import { Card, CardContent } from '@/components/ui/Card';
// import { Loading } from '@/components/ui/Loading';
// import { EmptyState } from '@/components/ui/EmptyState';
// import CustomDialog from '@/components/ui/CustomDialog';
// import { useAuth } from '@/context/AuthContext';
// import { useNotification } from '@/context/NotificationContext';

// // Services
// import { DebtService, PaymentHistoryItem, DebtorSummary } from '@/services/debtService';
// import database from '@/database';
// import Transaction from '@/database/models/Transaction';

// // Types
// type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';
// type ChartType = 'line' | 'bar' | 'pie';
// type PaymentMethod = 'cash' | 'bank' | 'mobile' | 'all';

// interface PaymentStats {
//   totalPaid: number;
//   averagePayment: number;
//   largestPayment: number;
//   smallestPayment: number;
//   paymentCount: number;
//   uniqueDebtors: number;
//   averagePerDay: number;
//   projectedMonthly: number;
//   paymentMethods: {
//     cash: number;
//     bank: number;
//     mobile: number;
//   };
//   bestDay: {
//     date: string;
//     amount: number;
//   };
//   bestWeek: {
//     week: string;
//     amount: number;
//   };
// }

// export default function DebtorPaymentHistoryScreen() {
//   const router = useRouter();
//   const { colorScheme } = useColorScheme();
//   const { currentShop } = useAuth();
//   const { showNotification } = useNotification();
//   const params = useLocalSearchParams();
//   const isDark = colorScheme === 'dark';
//   const { width: screenWidth } = Dimensions.get('window');

//   // Animation values
//   const scrollY = useRef(new Animated.Value(0)).current;
//   const headerOpacity = scrollY.interpolate({
//     inputRange: [0, 100],
//     outputRange: [1, 0.9],
//     extrapolate: 'clamp',
//   });

//   // State
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
//   const [debtors, setDebtors] = useState<DebtorSummary[]>([]);
//   const [selectedDebtor, setSelectedDebtor] = useState<DebtorSummary | null>(null);
//   const [selectedPayment, setSelectedPayment] = useState<PaymentHistoryItem | null>(null);
  
//   // Filter state
//   const [timeRange, setTimeRange] = useState<TimeRange>('month');
//   const [chartType, setChartType] = useState<ChartType>('line');
//   const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('all');
//   const [selectedDebtorId, setSelectedDebtorId] = useState<string | null>(
//     params.debtorId as string || null
//   );
//   const [selectedBarIndex, setSelectedBarIndex] = useState(-1);
//   const [selectedPieIndex, setSelectedPieIndex] = useState(-1);

//   // Dialog states
//   const [showPaymentDetailDialog, setShowPaymentDetailDialog] = useState(false);
//   const [showFilterDialog, setShowFilterDialog] = useState(false);
//   const [showExportDialog, setShowExportDialog] = useState(false);

//   // Load data
//   const loadData = useCallback(async () => {
//     if (!currentShop) return;

//     try {
//       setLoading(true);
      
//       // Load all debtors first
//       const debtorsData = await DebtService.getDebtorSummaries(currentShop.id);
//       setDebtors(debtorsData);

//       // Load all payments from transactions that are from debtors
//       // Since we don't have a direct payment history table, we need to query transactions
//       const transactions = await database
//         .get<Transaction>('transactions')
//         .query()
//         .fetch();

//       // Filter transactions that are payments (you might need to adjust this logic based on your schema)
//       const paymentTransactions = transactions.filter(t => 
//         t.transactionType === 'payment' || 
//         (t.transactionType === 'sale' && t.balanceDue === 0 && t.contactId)
//       );

//       // Map to PaymentHistoryItem format
//       const paymentHistory: PaymentHistoryItem[] = paymentTransactions.map(t => {
//         const debtor = debtorsData.find(d => d.contactId === t.contactId);
//         return {
//           id: t.id,
//           amount: t.totalAmount,
//           date: t.transactionDate,
//           method: (t.paymentMethod as PaymentMethod) || 'cash',
//           notes: t.notes,
//           debtorId: t.contactId,
//           debtorName: debtor?.contactName || 'Unknown Debtor',
//           debtorPhone: debtor?.contactPhone,
//         };
//       });

//       // Sort by date (newest first)
//       paymentHistory.sort((a, b) => b.date - a.date);
//       setPayments(paymentHistory);
//     } catch (error) {
//       console.error('Error loading payment history:', error);
//       showNotification({
//         type: 'error',
//         title: 'Error',
//         message: 'Failed to load payment history',
//       });
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [currentShop, showNotification]);

//   useEffect(() => {
//     loadData();
//   }, [loadData]);

//   // Filter payments based on selected filters
//   const filteredPayments = useMemo(() => {
//     let filtered = [...payments];

//     // Filter by debtor
//     if (selectedDebtorId) {
//       filtered = filtered.filter(p => p.debtorId === selectedDebtorId);
//     }

//     // Filter by payment method
//     if (selectedMethod !== 'all') {
//       filtered = filtered.filter(p => p.method === selectedMethod);
//     }

//     // Filter by time range
//     const now = Date.now();
//     const ranges = {
//       week: 7 * 24 * 60 * 60 * 1000,
//       month: 30 * 24 * 60 * 60 * 1000,
//       quarter: 90 * 24 * 60 * 60 * 1000,
//       year: 365 * 24 * 60 * 60 * 1000,
//       all: Infinity,
//     };

//     if (timeRange !== 'all') {
//       filtered = filtered.filter(p => p.date > now - ranges[timeRange]);
//     }

//     return filtered;
//   }, [payments, selectedDebtorId, selectedMethod, timeRange]);

//   // Calculate statistics
//   const stats = useMemo((): PaymentStats => {
//     const amounts = filteredPayments.map(p => p.amount);
//     const totalPaid = amounts.reduce((sum, amt) => sum + amt, 0);
//     const paymentCount = amounts.length;
    
//     // Payment methods breakdown
//     const methods = {
//       cash: filteredPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
//       bank: filteredPayments.filter(p => p.method === 'bank').reduce((sum, p) => sum + p.amount, 0),
//       mobile: filteredPayments.filter(p => p.method === 'mobile').reduce((sum, p) => sum + p.amount, 0),
//     };

//     // Unique debtors
//     const uniqueDebtorIds = new Set(filteredPayments.map(p => p.debtorId));
    
//     // Days in range
//     let daysInRange = 1;
//     if (filteredPayments.length > 0) {
//       const oldestDate = Math.min(...filteredPayments.map(p => p.date));
//       const newestDate = Math.max(...filteredPayments.map(p => p.date));
//       daysInRange = Math.max(1, Math.ceil((newestDate - oldestDate) / (24 * 60 * 60 * 1000)));
//     }

//     // Find best day
//     const paymentsByDate = new Map<string, number>();
//     filteredPayments.forEach(p => {
//       const date = new Date(p.date).toLocaleDateString('en-US', {
//         month: 'short',
//         day: 'numeric',
//         year: 'numeric'
//       });
//       paymentsByDate.set(date, (paymentsByDate.get(date) || 0) + p.amount);
//     });
    
//     let bestDayAmount = 0;
//     let bestDayDate = '';
//     paymentsByDate.forEach((amount, date) => {
//       if (amount > bestDayAmount) {
//         bestDayAmount = amount;
//         bestDayDate = date;
//       }
//     });

//     return {
//       totalPaid,
//       averagePayment: paymentCount > 0 ? totalPaid / paymentCount : 0,
//       largestPayment: amounts.length > 0 ? Math.max(...amounts) : 0,
//       smallestPayment: amounts.length > 0 ? Math.min(...amounts) : 0,
//       paymentCount,
//       uniqueDebtors: uniqueDebtorIds.size,
//       averagePerDay: daysInRange > 0 ? totalPaid / daysInRange : 0,
//       projectedMonthly: daysInRange > 0 ? (totalPaid / daysInRange) * 30 : 0,
//       paymentMethods: methods,
//       bestDay: {
//         date: bestDayDate,
//         amount: bestDayAmount,
//       },
//       bestWeek: {
//         week: 'This period',
//         amount: bestDayAmount, // Simplified for now
//       },
//     };
//   }, [filteredPayments]);

//   // Prepare chart data for Gifted Charts
//   const chartData = useMemo(() => {
//     // Group payments by date for line/bar charts
//     const paymentsByDate = new Map<string, { date: Date; amount: number; count: number }>();
    
//     filteredPayments.forEach(payment => {
//       const date = new Date(payment.date);
//       const dateKey = date.toLocaleDateString('en-US', {
//         month: 'short',
//         day: 'numeric',
//       });
      
//       const existing = paymentsByDate.get(dateKey);
//       if (existing) {
//         existing.amount += payment.amount;
//         existing.count += 1;
//       } else {
//         paymentsByDate.set(dateKey, {
//           date,
//           amount: payment.amount,
//           count: 1,
//         });
//       }
//     });

//     // Sort chronologically and take last 15 for better visibility
//     const sortedEntries = Array.from(paymentsByDate.entries())
//       .sort((a, b) => a[1].date.getTime() - b[1].date.getTime())
//       .slice(-15);

//     // Line chart data
//     const lineData = sortedEntries.map(([label, data]) => ({
//       value: data.amount,
//       label,
//       dataPointText: `${data.count} payment${data.count > 1 ? 's' : ''}`,
//     }));

//     // Bar chart data (payment methods)
//     const barData = [
//       {
//         value: stats.paymentMethods.cash,
//         label: 'Cash',
//         frontColor: '#22c55e',
//         gradientColor: '#16a34a',
//         topLabelComponent: () => (
//           <ThemedText variant="muted" size="xs" className="mb-1">
//             {formatCurrency(stats.paymentMethods.cash)}
//           </ThemedText>
//         ),
//       },
//       {
//         value: stats.paymentMethods.bank,
//         label: 'Bank',
//         frontColor: '#3b82f6',
//         gradientColor: '#2563eb',
//         topLabelComponent: () => (
//           <ThemedText variant="muted" size="xs" className="mb-1">
//             {formatCurrency(stats.paymentMethods.bank)}
//           </ThemedText>
//         ),
//       },
//       {
//         value: stats.paymentMethods.mobile,
//         label: 'Mobile',
//         frontColor: '#f59e0b',
//         gradientColor: '#d97706',
//         topLabelComponent: () => (
//           <ThemedText variant="muted" size="xs" className="mb-1">
//             {formatCurrency(stats.paymentMethods.mobile)}
//           </ThemedText>
//         ),
//       },
//     ].filter(item => item.value > 0);

//     // Pie chart data
//     const pieData = [
//       { 
//         value: stats.paymentMethods.cash, 
//         color: '#22c55e', 
//         text: 'Cash',
//         gradientCenterColor: '#16a34a',
//         focused: selectedPieIndex === 0,
//       },
//       { 
//         value: stats.paymentMethods.bank, 
//         color: '#3b82f6', 
//         text: 'Bank',
//         gradientCenterColor: '#2563eb',
//         focused: selectedPieIndex === 1,
//       },
//       { 
//         value: stats.paymentMethods.mobile, 
//         color: '#f59e0b', 
//         text: 'Mobile',
//         gradientCenterColor: '#d97706',
//         focused: selectedPieIndex === 2,
//       },
//     ].filter(item => item.value > 0);

//     return {
//       lineData,
//       barData,
//       pieData,
//       hasData: filteredPayments.length > 0,
//     };
//   }, [filteredPayments, stats.paymentMethods, selectedPieIndex]);

//   // Format currency
//   const formatCurrency = (amount: number) => {
//     return `₣${amount.toLocaleString(undefined, { 
//       minimumFractionDigits: 0, 
//       maximumFractionDigits: 0 
//     })}`;
//   };

//   const formatDate = (timestamp: number) => {
//     return new Date(timestamp).toLocaleDateString('en-US', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit',
//     });
//   };

//   const handleRefresh = useCallback(() => {
//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//     setRefreshing(true);
//     loadData();
//   }, [loadData]);

//   const handleExport = useCallback(async () => {
//     try {
//       // Prepare export data
//       const exportData = filteredPayments.map(p => ({
//         'Date': formatDate(p.date),
//         'Debtor': p.debtorName,
//         'Amount': p.amount,
//         'Method': p.method,
//         'Notes': p.notes || '',
//       }));

//       console.log('Export data:', exportData);
      
//       showNotification({
//         type: 'success',
//         title: 'Export Ready',
//         message: `${exportData.length} payments exported`,
//       });
      
//       setShowExportDialog(false);
//     } catch (error) {
//       showNotification({
//         type: 'error',
//         title: 'Export Failed',
//         message: 'Could not export payment history',
//       });
//     }
//   }, [filteredPayments, showNotification]);

//   // Gifted Charts theme
//   const chartTheme = {
//     backgroundColor: 'transparent',
//     color: isDark ? '#f1f5f9' : '#0f172a',
//     labelColor: isDark ? '#94a3b8' : '#64748b',
//     gridColor: isDark ? '#334155' : '#e2e8f0',
//   };

//   if (loading) {
//     return (
//       <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//         <PremiumHeader title="Payment History" showBackButton />
//         <Loading text="Loading payment history..." />
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//       <Animated.View style={{ opacity: headerOpacity }}>
//         <PremiumHeader
//           title="Payment History"
//           showBackButton
//           action={
//             <TouchableOpacity
//               onPress={() => setShowFilterDialog(true)}
//               className="w-10 h-10 rounded-xl bg-surface-soft items-center justify-center active:opacity-70 border border-border"
//             >
//               <Ionicons name="options-outline" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
//             </TouchableOpacity>
//           }
//         />
//       </Animated.View>

//       <ScrollView
//         className="flex-1"
//         showsVerticalScrollIndicator={false}
//         onScroll={Animated.event(
//           [{ nativeEvent: { contentOffset: { y: scrollY } } }],
//           { useNativeDriver: true }
//         )}
//         scrollEventThrottle={16}
//         refreshControl={
//           <RefreshControl 
//             refreshing={refreshing} 
//             onRefresh={handleRefresh}
//             tintColor={isDark ? '#fff' : '#0ea5e9'}
//           />
//         }
//       >
//         <View className="p-4">
//           {/* Summary Cards */}
//           <View className="flex-row flex-wrap gap-3 mb-6">
//             <Card variant="elevated" className="flex-1 min-w-[48%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-success/10 items-center justify-center mb-2">
//                   <Ionicons name="cash" size={20} color="#22c55e" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">Total Received</ThemedText>
//                 <ThemedText variant="heading" size="xl" className="font-bold text-success">
//                   {formatCurrency(stats.totalPaid)}
//                 </ThemedText>
//                 <ThemedText variant="muted" size="xs" className="mt-1">
//                   {stats.paymentCount} payments
//                 </ThemedText>
//               </CardContent>
//             </Card>

//             <Card variant="elevated" className="flex-1 min-w-[48%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center mb-2">
//                   <Ionicons name="people" size={20} color="#3b82f6" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">Unique Debtors</ThemedText>
//                 <ThemedText variant="heading" size="xl" className="font-bold text-info">
//                   {stats.uniqueDebtors}
//                 </ThemedText>
//                 <ThemedText variant="muted" size="xs" className="mt-1">
//                   Avg {formatCurrency(stats.averagePayment)} per payment
//                 </ThemedText>
//               </CardContent>
//             </Card>

//             <Card variant="elevated" className="flex-1 min-w-[48%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center mb-2">
//                   <Ionicons name="trending-up" size={20} color="#f59e0b" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">Daily Average</ThemedText>
//                 <ThemedText variant="heading" size="xl" className="font-bold text-warning">
//                   {formatCurrency(stats.averagePerDay)}
//                 </ThemedText>
//                 <ThemedText variant="muted" size="xs" className="mt-1">
//                   Projected: {formatCurrency(stats.projectedMonthly)}/month
//                 </ThemedText>
//               </CardContent>
//             </Card>

//             <Card variant="elevated" className="flex-1 min-w-[48%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-purple-500/10 items-center justify-center mb-2">
//                   <Ionicons name="trophy" size={20} color="#a855f7" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">Best Day</ThemedText>
//                 <ThemedText variant="heading" size="xl" className="font-bold text-purple-500">
//                   {formatCurrency(stats.bestDay.amount)}
//                 </ThemedText>
//                 <ThemedText variant="muted" size="xs" className="mt-1">
//                   {stats.bestDay.date}
//                 </ThemedText>
//               </CardContent>
//             </Card>
//           </View>

//           {/* Time Range Selector */}
//           <ScrollView 
//             horizontal 
//             showsHorizontalScrollIndicator={false}
//             className="mb-4"
//           >
//             <View className="flex-row gap-2">
//               {(['week', 'month', 'quarter', 'year', 'all'] as TimeRange[]).map((range) => (
//                 <TouchableOpacity
//                   key={range}
//                   onPress={() => {
//                     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                     setTimeRange(range);
//                   }}
//                   className={`px-4 py-2 rounded-full ${
//                     timeRange === range
//                       ? 'bg-brand'
//                       : 'bg-white dark:bg-dark-surface border border-border dark:border-dark-border'
//                   }`}
//                 >
//                   <ThemedText
//                     size="sm"
//                     className={timeRange === range ? 'text-white' : ''}
//                   >
//                     {range.charAt(0).toUpperCase() + range.slice(1)}
//                   </ThemedText>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </ScrollView>

//           {/* Chart Type Selector */}
//           <View className="flex-row items-center justify-between mb-4">
//             <ThemedText variant="heading" size="base" className="font-semibold">
//               Payment Trends
//             </ThemedText>
//             <View className="flex-row bg-white dark:bg-dark-surface rounded-lg p-1 border border-border dark:border-dark-border">
//               <TouchableOpacity
//                 onPress={() => setChartType('line')}
//                 className={`px-3 py-2 rounded-l-lg ${
//                   chartType === 'line' ? 'bg-brand/20' : ''
//                 }`}
//               >
//                 <Ionicons 
//                   name="trending-up" 
//                   size={18} 
//                   color={chartType === 'line' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'} 
//                 />
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => setChartType('bar')}
//                 className={`px-3 py-2 ${
//                   chartType === 'bar' ? 'bg-brand/20' : ''
//                 }`}
//               >
//                 <Ionicons 
//                   name="bar-chart" 
//                   size={18} 
//                   color={chartType === 'bar' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'} 
//                 />
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={() => setChartType('pie')}
//                 className={`px-3 py-2 rounded-r-lg ${
//                   chartType === 'pie' ? 'bg-brand/20' : ''
//                 }`}
//               >
//                 <Ionicons 
//                   name="pie-chart" 
//                   size={18} 
//                   color={chartType === 'pie' ? '#0ea5e9' : isDark ? '#94a3b8' : '#64748b'} 
//                 />
//               </TouchableOpacity>
//             </View>
//           </View>

//           {/* Chart */}
//           <Card variant="elevated" className="mb-6">
//             <CardContent className="p-4">
//               {!chartData.hasData ? (
//                 <View className="h-64 items-center justify-center">
//                   <Ionicons name="analytics-outline" size={48} color={isDark ? '#334155' : '#cbd5e1'} />
//                   <ThemedText variant="muted" size="base" className="mt-2">
//                     No payment data for this period
//                   </ThemedText>
//                 </View>
//               ) : (
//                 <>
//                   {chartType === 'line' && (
//                     <LineChart
//                       data={chartData.lineData}
//                       width={screenWidth - 64}
//                       height={220}
//                       curved
//                       isAnimated
//                       animationDuration={500}
//                       color="#0ea5e9"
//                       thickness={3}
//                       dataPointsColor1="#0ea5e9"
//                       dataPointsRadius={4}
//                       textColor={chartTheme.labelColor}
//                       textFontSize={10}
//                       xAxisLabelTextStyle={{ color: chartTheme.labelColor }}
//                       yAxisTextStyle={{ color: chartTheme.labelColor }}
//                       yAxisColor={chartTheme.gridColor}
//                       xAxisColor={chartTheme.gridColor}
//                       backgroundColor="transparent"
//                       hideRules={false}
//                       rulesColor={chartTheme.gridColor}
//                       rulesType="solid"
//                       showValuesAsDataPointsText={false}
//                       hideDataPoints={false}
//                       spacing={45}
//                       initialSpacing={20}
//                       endSpacing={20}
//                       pointerConfig={{
//                         pointerStripHeight: 160,
//                         pointerStripColor: isDark ? '#475569' : '#cbd5e1',
//                         pointerStripWidth: 2,
//                         pointerColor: '#0ea5e9',
//                         radius: 6,
//                         pointerLabelWidth: 100,
//                         pointerLabelHeight: 80,
//                         autoAdjustPointerLabelPosition: true,
//                         pointerLabelComponent: (items: any[]) => {
//                           const item = items[0];
//                           return (
//                             <View className="bg-white dark:bg-dark-surface px-3 py-2 rounded-lg shadow-elevated border border-border dark:border-dark-border">
//                               <ThemedText variant="default" size="sm" className="font-medium">
//                                 {item.value ? formatCurrency(item.value) : ''}
//                               </ThemedText>
//                               <ThemedText variant="muted" size="xs">
//                                 {item.label}
//                               </ThemedText>
//                             </View>
//                           );
//                         },
//                       }}
//                     />
//                   )}

//                   {chartType === 'bar' && (
//                     <BarChart
//                       data={chartData.barData}
//                       width={screenWidth - 64}
//                       height={220}
//                       isAnimated
//                       animationDuration={500}
//                       barWidth={40}
//                       spacing={24}
//                       initialSpacing={20}
//                       yAxisThickness={1}
//                       xAxisThickness={1}
//                       xAxisColor={chartTheme.gridColor}
//                       yAxisColor={chartTheme.gridColor}
//                       yAxisTextStyle={{ color: chartTheme.labelColor }}
//                       xAxisLabelTextStyle={{ color: chartTheme.labelColor }}
//                       noOfSections={4}
//                       maxValue={Math.max(...chartData.barData.map(b => b.value), 1) * 1.1}
//                       barBorderRadius={8}
//                       showGradient
//                       gradientColor="rgba(255,255,255,0.2)"
//                       showValuesAsTopLabel
//                       topLabelContainerStyle={{ marginBottom: 6 }}
//                       onPress={(item: any, index: number) => {
//                         setSelectedBarIndex(index);
//                         Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                       }}
//                     />
//                   )}

//                   {chartType === 'pie' && chartData.pieData.length > 0 && (
//                     <View className="items-center">
//                       <PieChart
//                         data={chartData.pieData}
//                         radius={100}
//                         innerRadius={40}
//                         donut
//                         isAnimated
//                         animationDuration={500}
//                         focusOnPress
//                         onPress={(item: any, index: number) => {
//                           setSelectedPieIndex(index);
//                           Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
//                         }}
//                         centerLabelComponent={() => (
//                           <View className="items-center">
//                             <ThemedText variant="heading" size="lg" className="font-bold">
//                               {formatCurrency(stats.totalPaid)}
//                             </ThemedText>
//                             <ThemedText variant="muted" size="xs">Total</ThemedText>
//                           </View>
//                         )}
//                         textColor={chartTheme.labelColor}
//                         textSize={12}
//                         showText
//                         textBackgroundRadius={0}
//                       />
                      
//                       {/* Legend */}
//                       <View className="flex-row flex-wrap justify-center gap-4 mt-4">
//                         {chartData.pieData.map((item, index) => (
//                           <TouchableOpacity
//                             key={index}
//                             onPress={() => setSelectedPieIndex(index)}
//                             className="flex-row items-center"
//                           >
//                             <View 
//                               className="w-3 h-3 rounded-full mr-2"
//                               style={{ backgroundColor: item.color }}
//                             />
//                             <ThemedText 
//                               variant="default" 
//                               size="sm"
//                               className={selectedPieIndex === index ? 'font-semibold' : ''}
//                             >
//                               {item.text}: {formatCurrency(item.value)}
//                             </ThemedText>
//                           </TouchableOpacity>
//                         ))}
//                       </View>
//                     </View>
//                   )}
//                 </>
//               )}
//             </CardContent>
//           </Card>

//           {/* Debtor Filter */}
//           <View className="mb-4">
//             <ThemedText variant="label" className="mb-2 font-semibold">
//               Filter by Debtor
//             </ThemedText>
//             <ScrollView horizontal showsHorizontalScrollIndicator={false}>
//               <View className="flex-row gap-2">
//                 <TouchableOpacity
//                   onPress={() => setSelectedDebtorId(null)}
//                   className={`px-4 py-2 rounded-full ${
//                     !selectedDebtorId
//                       ? 'bg-brand'
//                       : 'bg-white dark:bg-dark-surface border border-border dark:border-dark-border'
//                   }`}
//                 >
//                   <ThemedText size="sm" className={!selectedDebtorId ? 'text-white' : ''}>
//                     All Debtors
//                   </ThemedText>
//                 </TouchableOpacity>
                
//                 {debtors.slice(0, 10).map(debtor => (
//                   <TouchableOpacity
//                     key={debtor.contactId}
//                     onPress={() => setSelectedDebtorId(debtor.contactId)}
//                     className={`px-4 py-2 rounded-full ${
//                       selectedDebtorId === debtor.contactId
//                         ? 'bg-brand'
//                         : 'bg-white dark:bg-dark-surface border border-border dark:border-dark-border'
//                     }`}
//                   >
//                     <ThemedText 
//                       size="sm" 
//                       className={selectedDebtorId === debtor.contactId ? 'text-white' : ''}
//                       numberOfLines={1}
//                     >
//                       {debtor.contactName}
//                     </ThemedText>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </ScrollView>
//           </View>

//           {/* Payment History List */}
//           <View className="mb-4">
//             <View className="flex-row items-center justify-between mb-3">
//               <ThemedText variant="heading" size="base" className="font-semibold">
//                 Payment Transactions
//               </ThemedText>
//               <TouchableOpacity
//                 onPress={() => setShowExportDialog(true)}
//                 className="flex-row items-center"
//               >
//                 <Ionicons name="download-outline" size={18} color="#0ea5e9" />
//                 <ThemedText variant="brand" size="sm" className="ml-1">
//                   Export
//                 </ThemedText>
//               </TouchableOpacity>
//             </View>

//             {filteredPayments.length === 0 ? (
//               <EmptyState
//                 icon="card-outline"
//                 title="No Payments Found"
//                 description="No payment records match your filters"
//               />
//             ) : (
//               filteredPayments.slice(0, 20).map((payment, index) => (
//                 <TouchableOpacity
//                   key={payment.id}
//                   onPress={() => {
//                     setSelectedPayment(payment);
//                     const debtor = debtors.find(d => d.contactId === payment.debtorId);
//                     setSelectedDebtor(debtor || null);
//                     setShowPaymentDetailDialog(true);
//                   }}
//                   activeOpacity={0.7}
//                 >
//                   <Card variant="filled" className="mb-2">
//                     <CardContent className="p-4">
//                       <View className="flex-row items-center justify-between">
//                         <View className="flex-1">
//                           <View className="flex-row items-center gap-2 mb-1">
//                             <View className={`w-2 h-2 rounded-full ${
//                               payment.method === 'cash' ? 'bg-success' :
//                               payment.method === 'bank' ? 'bg-info' :
//                               'bg-warning'
//                             }`} />
//                             <ThemedText variant="default" size="base" className="font-semibold">
//                               {payment.debtorName}
//                             </ThemedText>
//                           </View>
                          
//                           <ThemedText variant="muted" size="sm">
//                             {formatDate(payment.date)}
//                           </ThemedText>
                          
//                           {payment.notes && (
//                             <ThemedText variant="muted" size="xs" className="mt-1">
//                               {payment.notes.length > 30 ? payment.notes.slice(0, 30) + '...' : payment.notes}
//                             </ThemedText>
//                           )}
//                         </View>

//                         <View className="items-end">
//                           <ThemedText variant="heading" size="lg" className="font-bold text-success">
//                             {formatCurrency(payment.amount)}
//                           </ThemedText>
//                           <View className="flex-row items-center mt-1">
//                             <Ionicons 
//                               name={
//                                 payment.method === 'cash' ? 'cash-outline' :
//                                 payment.method === 'bank' ? 'business-outline' :
//                                 'phone-portrait-outline'
//                               } 
//                               size={14} 
//                               color={isDark ? '#94a3b8' : '#64748b'} 
//                             />
//                             <ThemedText variant="muted" size="xs" className="ml-1 capitalize">
//                               {payment.method}
//                             </ThemedText>
//                           </View>
//                         </View>
//                       </View>
//                     </CardContent>
//                   </Card>
//                 </TouchableOpacity>
//               ))
//             )}

//             {filteredPayments.length > 20 && (
//               <TouchableOpacity 
//                 className="mt-2 p-3 bg-white dark:bg-dark-surface rounded-lg items-center border border-border dark:border-dark-border"
//                 onPress={() => {
//                   showNotification({
//                     type: 'info',
//                     title: 'View All',
//                     message: `${filteredPayments.length - 20} more payments available`,
//                   });
//                 }}
//               >
//                 <ThemedText variant="brand" size="sm">
//                   View All {filteredPayments.length} Payments
//                 </ThemedText>
//               </TouchableOpacity>
//             )}
//           </View>
//         </View>
//       </ScrollView>

//       {/* Payment Detail Dialog */}
//       <CustomDialog
//         visible={showPaymentDetailDialog}
//         title="Payment Details"
//         variant="neutral"
//         icon="card-outline"
//         width={400}
//         onClose={() => {
//           setShowPaymentDetailDialog(false);
//           setSelectedPayment(null);
//           setSelectedDebtor(null);
//         }}
//         showCancel={false}
//         actions={[
//           {
//             label: 'Close',
//             variant: 'default',
//             onPress: () => {
//               setShowPaymentDetailDialog(false);
//               setSelectedPayment(null);
//               setSelectedDebtor(null);
//             },
//           },
//         ]}
//       >
//         {selectedPayment && (
//           <View className="w-full mt-4">
//             {/* Debtor Info */}
//             <View className="mb-4 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
//               <View className="flex-row items-center mb-2">
//                 <View className="w-10 h-10 rounded-full bg-brand-soft items-center justify-center mr-3">
//                   <ThemedText variant="heading" size="lg" className="text-brand">
//                     {selectedPayment.debtorName?.charAt(0).toUpperCase()}
//                   </ThemedText>
//                 </View>
//                 <View>
//                   <ThemedText variant="heading" size="base" className="font-bold">
//                     {selectedPayment.debtorName}
//                   </ThemedText>
//                   <ThemedText variant="muted" size="sm">
//                     {selectedPayment.debtorPhone}
//                   </ThemedText>
//                 </View>
//               </View>
//             </View>

//             {/* Payment Details */}
//             <View className="gap-3">
//               <View className="flex-row justify-between items-center p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
//                 <ThemedText variant="muted" size="sm">Amount</ThemedText>
//                 <ThemedText variant="heading" size="lg" className="text-success font-bold">
//                   {formatCurrency(selectedPayment.amount)}
//                 </ThemedText>
//               </View>

//               <View className="flex-row justify-between items-center p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
//                 <ThemedText variant="muted" size="sm">Payment Method</ThemedText>
//                 <View className="flex-row items-center">
//                   <Ionicons 
//                     name={
//                       selectedPayment.method === 'cash' ? 'cash-outline' :
//                       selectedPayment.method === 'bank' ? 'business-outline' :
//                       'phone-portrait-outline'
//                     } 
//                     size={16} 
//                     color={
//                       selectedPayment.method === 'cash' ? '#22c55e' :
//                       selectedPayment.method === 'bank' ? '#3b82f6' :
//                       '#f59e0b'
//                     } 
//                   />
//                   <ThemedText 
//                     variant="default" 
//                     size="base" 
//                     className="ml-2 capitalize"
//                     style={{
//                       color: selectedPayment.method === 'cash' ? '#22c55e' :
//                              selectedPayment.method === 'bank' ? '#3b82f6' :
//                              '#f59e0b'
//                     }}
//                   >
//                     {selectedPayment.method}
//                   </ThemedText>
//                 </View>
//               </View>

//               <View className="flex-row justify-between items-center p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
//                 <ThemedText variant="muted" size="sm">Date & Time</ThemedText>
//                 <ThemedText variant="default" size="base">
//                   {formatDate(selectedPayment.date)}
//                 </ThemedText>
//               </View>

//               {selectedPayment.notes && (
//                 <View className="p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
//                   <ThemedText variant="muted" size="sm" className="mb-1">Notes</ThemedText>
//                   <ThemedText variant="default" size="base">
//                     {selectedPayment.notes}
//                   </ThemedText>
//                 </View>
//               )}

//               {selectedDebtor && (
//                 <TouchableOpacity
//                   onPress={() => {
//                     setShowPaymentDetailDialog(false);
//                     router.push(`/debtor-details?id=${selectedDebtor.contactId}`);
//                   }}
//                   className="mt-2 p-3 bg-brand/10 rounded-lg flex-row items-center justify-center"
//                 >
//                   <Ionicons name="person-circle-outline" size={20} color="#0ea5e9" />
//                   <ThemedText variant="brand" size="base" className="ml-2 font-medium">
//                     View Full Debtor Profile
//                   </ThemedText>
//                 </TouchableOpacity>
//               )}
//             </View>
//           </View>
//         )}
//       </CustomDialog>

//       {/* Filter Dialog */}
//       <CustomDialog
//         visible={showFilterDialog}
//         title="Filter Payments"
//         variant="neutral"
//         icon="options-outline"
//         width={400}
//         onClose={() => setShowFilterDialog(false)}
//         showCancel={true}
//         cancelLabel="Reset"
//         onCancel={() => {
//           setSelectedMethod('all');
//           setTimeRange('month');
//           setSelectedDebtorId(null);
//         }}
//         actions={[
//           {
//             label: 'Apply Filters',
//             variant: 'default',
//             onPress: () => setShowFilterDialog(false),
//           },
//         ]}
//       >
//         <View className="w-full mt-4">
//           {/* Payment Method Filter */}
//           <View className="mb-4">
//             <ThemedText variant="label" className="mb-2 font-semibold">
//               Payment Method
//             </ThemedText>
//             <View className="flex-row gap-2">
//               {(['all', 'cash', 'bank', 'mobile'] as const).map((method) => (
//                 <TouchableOpacity
//                   key={method}
//                   onPress={() => setSelectedMethod(method)}
//                   className={`flex-1 p-2 rounded-lg items-center ${
//                     selectedMethod === method
//                       ? 'bg-brand'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <Ionicons 
//                     name={
//                       method === 'all' ? 'options-outline' :
//                       method === 'cash' ? 'cash-outline' :
//                       method === 'bank' ? 'business-outline' :
//                       'phone-portrait-outline'
//                     } 
//                     size={20} 
//                     color={selectedMethod === method ? '#fff' : isDark ? '#94a3b8' : '#64748b'} 
//                   />
//                   <ThemedText 
//                     size="xs" 
//                     className={`mt-1 capitalize ${
//                       selectedMethod === method ? 'text-white' : ''
//                     }`}
//                   >
//                     {method}
//                   </ThemedText>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>

//           {/* Time Range Filter */}
//           <View>
//             <ThemedText variant="label" className="mb-2 font-semibold">
//               Time Range
//             </ThemedText>
//             <View className="flex-row flex-wrap gap-2">
//               {(['week', 'month', 'quarter', 'year', 'all'] as TimeRange[]).map((range) => (
//                 <TouchableOpacity
//                   key={range}
//                   onPress={() => setTimeRange(range)}
//                   className={`px-4 py-2 rounded-full ${
//                     timeRange === range
//                       ? 'bg-brand'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText
//                     size="sm"
//                     className={timeRange === range ? 'text-white' : ''}
//                   >
//                     {range.charAt(0).toUpperCase() + range.slice(1)}
//                   </ThemedText>
//                 </TouchableOpacity>
//               ))}
//             </View>
//           </View>
//         </View>
//       </CustomDialog>

//       {/* Export Dialog */}
//       <CustomDialog
//         visible={showExportDialog}
//         title="Export Payment History"
//         variant="neutral"
//         icon="download-outline"
//         width={400}
//         onClose={() => setShowExportDialog(false)}
//         showCancel={true}
//         cancelLabel="Cancel"
//         actions={[
//           {
//             label: 'Export CSV',
//             variant: 'default',
//             onPress: handleExport,
//           },
//         ]}
//       >
//         <View className="w-full mt-4">
//           <TouchableOpacity
//             onPress={() => {
//               setShowExportDialog(false);
//               showNotification({
//                 type: 'info',
//                 title: 'Export Preview',
//                 message: `${filteredPayments.length} payments will be exported`,
//               });
//             }}
//             className="flex-row items-center p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg mb-2"
//           >
//             <View className="w-10 h-10 rounded-full bg-info/10 items-center justify-center mr-3">
//               <Ionicons name="eye-outline" size={20} color="#3b82f6" />
//             </View>
//             <View className="flex-1">
//               <ThemedText variant="default" size="base" className="font-semibold">
//                 Preview Export
//               </ThemedText>
//               <ThemedText variant="muted" size="sm">
//                 {filteredPayments.length} payments, {formatCurrency(stats.totalPaid)} total
//               </ThemedText>
//             </View>
//           </TouchableOpacity>

//           <View className="p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
//             <ThemedText variant="label" size="sm" className="font-semibold mb-2">
//               Export Includes:
//             </ThemedText>
//             <View className="gap-1">
//               <View className="flex-row items-center">
//                 <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
//                 <ThemedText variant="muted" size="sm" className="ml-2">
//                   Date & Time
//                 </ThemedText>
//               </View>
//               <View className="flex-row items-center">
//                 <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
//                 <ThemedText variant="muted" size="sm" className="ml-2">
//                   Debtor Name
//                 </ThemedText>
//               </View>
//               <View className="flex-row items-center">
//                 <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
//                 <ThemedText variant="muted" size="sm" className="ml-2">
//                   Payment Amount
//                 </ThemedText>
//               </View>
//               <View className="flex-row items-center">
//                 <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
//                 <ThemedText variant="muted" size="sm" className="ml-2">
//                   Payment Method
//                 </ThemedText>
//               </View>
//               <View className="flex-row items-center">
//                 <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
//                 <ThemedText variant="muted" size="sm" className="ml-2">
//                   Notes
//                 </ThemedText>
//               </View>
//             </View>
//           </View>
//         </View>
//       </CustomDialog>
//     </View>
//   );
// }