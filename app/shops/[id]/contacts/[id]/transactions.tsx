// // app/contacts/[contactId]/transactions.tsx
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import {
//   View,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Alert,
//   Modal,
//   SectionList
// } from 'react-native';
// import { useRouter, useLocalSearchParams } from 'expo-router';
// import { Ionicons } from '@expo/vector-icons';
// import { useColorScheme } from 'nativewind';
// import * as Haptics from 'expo-haptics';
// import { Q } from '@nozbe/watermelondb';

// // Components
// import PremiumHeader from '@/components/layout/PremiumHeader';
// import { ThemedText } from '@/components/ui/ThemedText';
// import { Card, CardContent } from '@/components/ui/Card';
// import { Button } from '@/components/ui/Button';
// import { Loading } from '@/components/ui/Loading';
// import { EmptyState } from '@/components/ui/EmptyState';

// // Database
// import database from '@/database';
// import { useAuth } from '@/context/AuthContext';
// import { Contact } from '@/database/models/Contact';
// import { Payment } from '@/database/models/Payment';
// import Transaction from '@/database/models/Transaction';
// import { Input } from '@/components/ui/Input';

// // Types
// interface TransactionWithDetails extends Transaction {
//   payments?: Payment[];
//   remainingBalance?: number;
// }

// interface TransactionSection {
//   title: string;
//   data: TransactionWithDetails[];
// }

// type TransactionType = 'all' | 'sale' | 'payment';
// type DateRange = 'all' | 'today' | 'week' | 'month' | 'custom';

// export default function ContactTransactionsScreen() {
//   const router = useRouter();
//   const params = useLocalSearchParams<{ contactId: string }>();
//   const { colorScheme } = useColorScheme();
//   const { currentShop } = useAuth();
//   const isDark = colorScheme === 'dark';

//   // State
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [contact, setContact] = useState<Contact | null>(null);
//   const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
//   const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
//   const [showFilterModal, setShowFilterModal] = useState(false);
//   const [showPaymentModal, setShowPaymentModal] = useState(false);
  
//   // Filter state
//   const [transactionType, setTransactionType] = useState<TransactionType>('all');
//   const [dateRange, setDateRange] = useState<DateRange>('all');
//   const [customStartDate, setCustomStartDate] = useState<number | null>(null);
//   const [customEndDate, setCustomEndDate] = useState<number | null>(null);

//   // Payment state
//   const [paymentAmount, setPaymentAmount] = useState('');
//   const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mobile'>('cash');
//   const [paymentReference, setPaymentReference] = useState('');
//   const [paymentNotes, setPaymentNotes] = useState('');

//   // Statistics
//   const stats = useMemo(() => {
//     const totalPurchases = transactions
//       .filter(t => t.transactionType === 'sale')
//       .reduce((sum, t) => sum + t.totalAmount, 0);
    
//     const totalPayments = transactions
//       .filter(t => t.transactionType === 'payment')
//       .reduce((sum, t) => sum + t.totalAmount, 0);
    
//     const outstandingBalance = totalPurchases - totalPayments;
    
//     const lastTransaction = transactions.length > 0 
//       ? transactions.sort((a, b) => b.transactionDate - a.transactionDate)[0]
//       : null;

//     return {
//       totalPurchases,
//       totalPayments,
//       outstandingBalance,
//       transactionCount: transactions.length,
//       lastTransactionDate: lastTransaction?.transactionDate,
//       averageTransactionValue: transactions.length > 0 
//         ? totalPurchases / transactions.length 
//         : 0
//     };
//   }, [transactions]);

//   // Filter transactions
//   const filteredTransactions = useMemo(() => {
//     let filtered = [...transactions];

//     // Filter by type
//     if (transactionType !== 'all') {
//       filtered = filtered.filter(t => t.transactionType === transactionType);
//     }

//     // Filter by date range
//     const now = Date.now();
//     const today = new Date().setHours(0, 0, 0, 0);
//     const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
//     const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

//     switch (dateRange) {
//       case 'today':
//         filtered = filtered.filter(t => t.transactionDate >= today);
//         break;
//       case 'week':
//         filtered = filtered.filter(t => t.transactionDate >= weekAgo);
//         break;
//       case 'month':
//         filtered = filtered.filter(t => t.transactionDate >= monthAgo);
//         break;
//       case 'custom':
//         if (customStartDate) {
//           filtered = filtered.filter(t => t.transactionDate >= customStartDate);
//         }
//         if (customEndDate) {
//           filtered = filtered.filter(t => t.transactionDate <= customEndDate);
//         }
//         break;
//     }

//     // Sort by date (newest first)
//     filtered.sort((a, b) => b.transactionDate - a.transactionDate);

//     return filtered;
//   }, [transactions, transactionType, dateRange, customStartDate, customEndDate]);

//   // Group transactions by month for section list
//   const transactionSections = useMemo(() => {
//     const sections: TransactionSection[] = [];
//     const monthMap = new Map<string, TransactionWithDetails[]>();

//     filteredTransactions.forEach(transaction => {
//       const date = new Date(transaction.transactionDate);
//       const monthYear = date.toLocaleDateString('en-US', { 
//         month: 'long', 
//         year: 'numeric' 
//       });

//       if (!monthMap.has(monthYear)) {
//         monthMap.set(monthYear, []);
//       }
//       monthMap.get(monthYear)?.push(transaction);
//     });

//     monthMap.forEach((transactions, monthYear) => {
//       sections.push({
//         title: monthYear,
//         data: transactions
//       });
//     });

//     return sections;
//   }, [filteredTransactions]);

//   // Load data
//   const loadData = useCallback(async () => {
//     if (!currentShop || !params.contactId) return;

//     try {
//       // Load contact
//       const contactData = await database.get<Contact>('contacts')
//         .find(params.contactId);
//       setContact(contactData);

//       // Load all transactions for this contact
//       const transactionsData = await database.get<Transaction>('transactions')
//         .query(
//           Q.where('shop_id', currentShop.id),
//           Q.where('contact_id', params.contactId),
//           Q.sortBy('transaction_date', Q.desc)
//         )
//         .fetch();

//       // Load payments for each transaction
//       const transactionsWithDetails = await Promise.all(
//         transactionsData.map(async (transaction) => {
//           const payments = await transaction.payments.fetch();
//           const totalPaid = payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
          
//           return {
//             ...transaction,
//             payments,
//             remainingBalance: transaction.totalAmount - totalPaid
//           } as TransactionWithDetails;
//         })
//       );

//       setTransactions(transactionsWithDetails);
//     } catch (error) {
//       console.error('Error loading contact transactions:', error);
//       Alert.alert('Error', 'Failed to load transactions');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [currentShop, params.contactId]);

//   // Initial load
//   useEffect(() => {
//     loadData();
//   }, [loadData]);

//   // Pull to refresh
//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     loadData();
//   }, [loadData]);

//   // Handle payment
//   const handlePayment = useCallback(async () => {
//     const amount = parseFloat(paymentAmount);
//     if (isNaN(amount) || amount <= 0) {
//       Alert.alert('Error', 'Please enter a valid amount');
//       return;
//     }

//     if (amount > stats.outstandingBalance) {
//       Alert.alert(
//         'Error', 
//         `Amount exceeds outstanding balance of ₣${stats.outstandingBalance.toLocaleString()}`
//       );
//       return;
//     }

//     Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

//     try {
//       // TODO: Create payment transaction
//       // This would create a payment record and update the outstanding balance

//       Alert.alert(
//         '✅ Payment Recorded',
//         `Payment of ₣${amount.toLocaleString()} has been recorded`,
//         [{ text: 'OK', onPress: () => {
//           setShowPaymentModal(false);
//           setPaymentAmount('');
//           setPaymentMethod('cash');
//           setPaymentReference('');
//           setPaymentNotes('');
//           loadData();
//         }}]
//       );
//     } catch (error) {
//       Alert.alert('Error', 'Failed to record payment');
//     }
//   }, [paymentAmount, paymentMethod, paymentReference, paymentNotes, stats.outstandingBalance, loadData]);

//   // Format currency
//   const formatCurrency = (amount: number) => {
//     return `₣${amount.toLocaleString()}`;
//   };

//   // Format date
//   const formatDate = (timestamp: number, includeTime: boolean = false) => {
//     const date = new Date(timestamp);
//     if (includeTime) {
//       return date.toLocaleDateString('en-US', {
//         day: 'numeric',
//         month: 'short',
//         year: 'numeric',
//         hour: '2-digit',
//         minute: '2-digit'
//       });
//     }
//     return date.toLocaleDateString('en-US', {
//       day: 'numeric',
//       month: 'short',
//       year: 'numeric'
//     });
//   };

//   // Get transaction icon and color
//   const getTransactionStyle = (type: string, status?: string) => {
//     switch (type) {
//       case 'sale':
//         return {
//           icon: 'cart-outline',
//           bgColor: 'bg-warning-soft',
//           iconColor: '#f59e0b',
//           label: 'Sale'
//         };
//       case 'payment':
//         return {
//           icon: 'cash-outline',
//           bgColor: 'bg-success-soft',
//           iconColor: '#22c55e',
//           label: 'Payment'
//         };
//       default:
//         return {
//           icon: 'swap-horizontal-outline',
//           bgColor: 'bg-surface-soft',
//           iconColor: '#64748b',
//           label: type
//         };
//     }
//   };

//   if (loading) {
//     return (
//       <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//         <PremiumHeader title="Transactions" showBackButton />
//         <Loading />
//       </View>
//     );
//   }

//   if (!contact) {
//     return (
//       <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//         <PremiumHeader title="Transactions" showBackButton />
//         <EmptyState
//           icon="person-outline"
//           title="Contact Not Found"
//           description="The contact you're looking for doesn't exist"
          
//         />
//       </View>
//     );
//   }

//   return (
//     <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//       <PremiumHeader
//         title={`${contact.name}'s Transactions`}
//         showBackButton
        
//       />

//       <ScrollView
//         className="flex-1"
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
//         }
//       >
//         <View className="p-4">
//           {/* Contact Summary Card */}
//           <Card variant="elevated" className="mb-6 overflow-hidden">
//             <View className="h-24 bg-gradient-to-r from-brand/10 to-accent/10" />
//             <CardContent className="p-4 -mt-12">
//               <View className="flex-row items-end">
//                 <View className="w-20 h-20 rounded-full bg-surface dark:bg-dark-surface items-center justify-center shadow-soft border-4 border-surface dark:border-dark-surface">
//                   <ThemedText variant="heading" size="3xl" className="text-brand">
//                     {contact.name.charAt(0).toUpperCase()}
//                   </ThemedText>
//                 </View>
//                 <View className="flex-1 ml-4 mb-2">
//                   <ThemedText variant="heading" size="xl" className="font-bold">
//                     {contact.name}
//                   </ThemedText>
//                   <View className="flex-row items-center mt-1">
//                     <Ionicons name="call-outline" size={14} color="#64748b" />
//                     <ThemedText variant="muted" size="sm" className="ml-1">
//                       {contact.phone}
//                     </ThemedText>
//                   </View>
//                 </View>
//               </View>
//             </CardContent>
//           </Card>

//           {/* Stats Cards */}
//           <View className="flex-row flex-wrap gap-3 mb-6">
//             <Card variant="elevated" className="flex-1 min-w-[45%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-warning-soft items-center justify-center mb-2">
//                   <Ionicons name="cart" size={20} color="#f59e0b" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">
//                   Total Purchases
//                 </ThemedText>
//                 <ThemedText variant="heading" size="lg" className="font-bold text-warning">
//                   {formatCurrency(stats.totalPurchases)}
//                 </ThemedText>
//               </CardContent>
//             </Card>

//             <Card variant="elevated" className="flex-1 min-w-[45%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-success-soft items-center justify-center mb-2">
//                   <Ionicons name="cash" size={20} color="#22c55e" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">
//                   Total Payments
//                 </ThemedText>
//                 <ThemedText variant="heading" size="lg" className="font-bold text-success">
//                   {formatCurrency(stats.totalPayments)}
//                 </ThemedText>
//               </CardContent>
//             </Card>

//             <Card variant="elevated" className="flex-1 min-w-[45%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-error-soft items-center justify-center mb-2">
//                   <Ionicons name="alert-circle" size={20} color="#ef4444" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">
//                   Outstanding
//                 </ThemedText>
//                 <ThemedText 
//                   variant="heading" 
//                   size="lg" 
//                   className={`font-bold ${stats.outstandingBalance > 0 ? 'text-error' : 'text-success'}`}
//                 >
//                   {formatCurrency(stats.outstandingBalance)}
//                 </ThemedText>
//               </CardContent>
//             </Card>

//             <Card variant="elevated" className="flex-1 min-w-[45%]">
//               <CardContent className="p-4">
//                 <View className="w-10 h-10 rounded-full bg-brand-soft items-center justify-center mb-2">
//                   <Ionicons name="swap-horizontal" size={20} color="#0ea5e9" />
//                 </View>
//                 <ThemedText variant="muted" size="sm">
//                   Transactions
//                 </ThemedText>
//                 <ThemedText variant="heading" size="lg" className="font-bold">
//                   {stats.transactionCount}
//                 </ThemedText>
//                 {stats.lastTransactionDate && (
//                   <ThemedText variant="muted" size="xs" className="mt-1">
//                     Last: {formatDate(stats.lastTransactionDate)}
//                   </ThemedText>
//                 )}
//               </CardContent>
//             </Card>
//           </View>

//           {/* Quick Actions */}
//           <View className="flex-row gap-3 mb-6">
//             <Button
//               variant="default"
//               size="sm"
//               icon="add-circle"
//               onPress={() => router.push(`/(tabs)/sales?contactId=${contact.id}&mode=credit`)}
//               className="flex-1"
//             >
//               New Sale
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               icon="cash"
//               onPress={() => setShowPaymentModal(true)}
//               className="flex-1"
//               disabled={stats.outstandingBalance === 0}
//             >
//               Record Payment
//             </Button>
//           </View>

//           {/* Active Filter Indicator */}
//           {(transactionType !== 'all' || dateRange !== 'all') && (
//             <View className="flex-row items-center justify-between mb-4 p-3 bg-surface dark:bg-dark-surface rounded-lg">
//               <View className="flex-row items-center">
//                 <Ionicons name="filter" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
//                 <ThemedText variant="muted" size="sm" className="ml-2">
//                   {transactionType !== 'all' ? `${transactionType}s` : 'All transactions'} • 
//                   {dateRange !== 'all' ? ` ${dateRange}` : ' all time'}
//                 </ThemedText>
//               </View>
//               <TouchableOpacity
//                 onPress={() => {
//                   setTransactionType('all');
//                   setDateRange('all');
//                   setCustomStartDate(null);
//                   setCustomEndDate(null);
//                 }}
//               >
//                 <ThemedText variant="brand" size="sm">Clear</ThemedText>
//               </TouchableOpacity>
//             </View>
//           )}

//           {/* Transactions List */}
//           {transactionSections.length === 0 ? (
//             <EmptyState
//               icon="receipt-outline"
//               title="No Transactions Found"
//               description={
//                 transactionType !== 'all' || dateRange !== 'all'
//                   ? "No transactions match your filters"
//                   : "No transactions yet with this contact"
//               }
              
//             />
//           ) : (
//             <View className="gap-4">
//               {transactionSections.map((section) => (
//                 <View key={section.title}>
//                   {/* Section Header */}
//                   <View className="flex-row items-center mb-3">
//                     <View className="flex-1 h-[1px] bg-border dark:bg-dark-border" />
//                     <ThemedText 
//                       variant="muted" 
//                       size="sm" 
//                       className="mx-3 font-medium"
//                     >
//                       {section.title}
//                     </ThemedText>
//                     <View className="flex-1 h-[1px] bg-border dark:bg-dark-border" />
//                   </View>

//                   {/* Section Items */}
//                   <View className="gap-2">
//                     {section.data.map((transaction) => {
//                       const style = getTransactionStyle(transaction.transactionType);
//                       const isSale = transaction.transactionType === 'sale';
//                       const remainingBalance = transaction.remainingBalance || 0;
//                       const hasRemaining = isSale && remainingBalance > 0;

//                       return (
//                         <TouchableOpacity
//                           key={transaction.id}
//                           onPress={() => setSelectedTransaction(transaction)}
//                           activeOpacity={0.7}
//                         >
//                           <Card variant="elevated">
//                             <CardContent className="p-4">
//                               <View className="flex-row items-center">
//                                 {/* Icon */}
//                                 <View className={`w-12 h-12 rounded-full ${style.bgColor} items-center justify-center mr-3`}>
//                                   <Ionicons name={style.icon as any} size={24} color={style.iconColor} />
//                                 </View>

//                                 {/* Details */}
//                                 <View className="flex-1">
//                                   <View className="flex-row items-center justify-between mb-1">
//                                     <View className="flex-row items-center">
//                                       <ThemedText variant="default" size="base" className="font-semibold">
//                                         {style.label}
//                                       </ThemedText>
//                                       {hasRemaining && (
//                                         <View className="ml-2 px-2 py-0.5 bg-error-soft rounded-full">
//                                           <ThemedText variant="error" size="xs">
//                                             Due: {formatCurrency(remainingBalance)}
//                                           </ThemedText>
//                                         </View>
//                                       )}
//                                     </View>
//                                     <ThemedText 
//                                       variant="heading" 
//                                       size="base" 
//                                       className={`font-bold ${
//                                         isSale ? 'text-warning' : 'text-success'
//                                       }`}
//                                     >
//                                       {isSale ? '-' : '+'}{formatCurrency(transaction.totalAmount)}
//                                     </ThemedText>
//                                   </View>

//                                   <View className="flex-row items-center justify-between">
//                                     <View className="flex-row items-center">
//                                       <Ionicons 
//                                         name="time-outline" 
//                                         size={14} 
//                                         color={isDark ? '#94a3b8' : '#64748b'} 
//                                       />
//                                       <ThemedText variant="muted" size="xs" className="ml-1">
//                                         {formatDate(transaction.transactionDate, true)}
//                                       </ThemedText>
//                                     </View>

//                                     {transaction.paymentStatus === 'due' && (
//                                       <View className="flex-row items-center">
//                                         <View className="w-2 h-2 rounded-full bg-error mr-1" />
//                                         <ThemedText variant="error" size="xs">
//                                           {transaction.paymentStatus}
//                                         </ThemedText>
//                                       </View>
//                                     )}

//                                     {transaction.paymentStatus === 'partial' && (
//                                       <View className="flex-row items-center">
//                                         <View className="w-2 h-2 rounded-full bg-warning mr-1" />
//                                         <ThemedText variant="warning" size="xs">
//                                           partial
//                                         </ThemedText>
//                                       </View>
//                                     )}
//                                   </View>

//                                   {transaction.notes ? (
//                                     <ThemedText 
//                                       variant="muted" 
//                                       size="xs" 
//                                       className="mt-2 italic"
//                                       numberOfLines={1}
//                                     >
//                                       {transaction.notes}
//                                     </ThemedText>
//                                   ) : null}
//                                 </View>
//                               </View>
//                             </CardContent>
//                           </Card>
//                         </TouchableOpacity>
//                       );
//                     })}
//                   </View>
//                 </View>
//               ))}
//             </View>
//           )}
//         </View>
//       </ScrollView>

//       {/* Filter Modal */}
//       <Modal
//         visible={showFilterModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowFilterModal(false)}
//       >
//         <View className="flex-1 bg-black/50 justify-end">
//           <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
//             <View className="flex-row items-center justify-between mb-6">
//               <ThemedText variant="heading" size="xl" className="font-bold">
//                 Filter Transactions
//               </ThemedText>
//               <TouchableOpacity onPress={() => setShowFilterModal(false)}>
//                 <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
//               </TouchableOpacity>
//             </View>

//             {/* Transaction Type Filter */}
//             <View className="mb-6">
//               <ThemedText variant="label" className="mb-3 font-semibold">
//                 Transaction Type
//               </ThemedText>
//               <View className="flex-row gap-2">
//                 <TouchableOpacity
//                   onPress={() => setTransactionType('all')}
//                   className={`flex-1 py-3 rounded-xl items-center ${
//                     transactionType === 'all'
//                       ? 'bg-brand'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText 
//                     className={transactionType === 'all' ? 'text-white' : ''}
//                   >
//                     All
//                   </ThemedText>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setTransactionType('sale')}
//                   className={`flex-1 py-3 rounded-xl items-center ${
//                     transactionType === 'sale'
//                       ? 'bg-warning'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText 
//                     className={transactionType === 'sale' ? 'text-white' : ''}
//                   >
//                     Sales
//                   </ThemedText>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setTransactionType('payment')}
//                   className={`flex-1 py-3 rounded-xl items-center ${
//                     transactionType === 'payment'
//                       ? 'bg-success'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText 
//                     className={transactionType === 'payment' ? 'text-white' : ''}
//                   >
//                     Payments
//                   </ThemedText>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* Date Range Filter */}
//             <View className="mb-6">
//               <ThemedText variant="label" className="mb-3 font-semibold">
//                 Date Range
//               </ThemedText>
//               <View className="flex-row flex-wrap gap-2">
//                 {(['all', 'today', 'week', 'month'] as DateRange[]).map((range) => (
//                   <TouchableOpacity
//                     key={range}
//                     onPress={() => setDateRange(range)}
//                     className={`px-4 py-2 rounded-full ${
//                       dateRange === range
//                         ? 'bg-brand'
//                         : 'bg-surface-soft dark:bg-dark-surface-soft'
//                     }`}
//                   >
//                     <ThemedText 
//                       size="sm"
//                       className={dateRange === range ? 'text-white' : ''}
//                     >
//                       {range.charAt(0).toUpperCase() + range.slice(1)}
//                     </ThemedText>
//                   </TouchableOpacity>
//                 ))}
//               </View>
//             </View>

//             {/* Action Buttons */}
//             <View className="flex-row gap-3">
//               <Button
//                 variant="outline"
//                 size="lg"
//                 onPress={() => {
//                   setTransactionType('all');
//                   setDateRange('all');
//                 }}
//                 className="flex-1"
//               >
//                 Reset
//               </Button>
//               <Button
//                 variant="default"
//                 size="lg"
//                 onPress={() => setShowFilterModal(false)}
//                 className="flex-1"
//               >
//                 Apply Filters
//               </Button>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Payment Modal */}
//       <Modal
//         visible={showPaymentModal}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setShowPaymentModal(false)}
//       >
//         <View className="flex-1 bg-black/50 justify-end">
//           <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
//             <View className="flex-row items-center justify-between mb-6">
//               <ThemedText variant="heading" size="xl" className="font-bold">
//                 Record Payment
//               </ThemedText>
//               <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
//                 <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
//               </TouchableOpacity>
//             </View>

//             {/* Amount Input */}
//             <View className="mb-4">
//               <ThemedText variant="label" className="mb-2 font-semibold">
//                 Amount
//               </ThemedText>
//               <Input
//                 placeholder="Enter amount"
//                 value={paymentAmount}
//                 onChangeText={setPaymentAmount}
//                 keyboardType="numeric"
//                 leftIcon="cash-outline"
//               />
//             </View>

//             {/* Payment Method */}
//             <View className="mb-4">
//               <ThemedText variant="label" className="mb-2 font-semibold">
//                 Payment Method
//               </ThemedText>
//               <View className="flex-row gap-2">
//                 <TouchableOpacity
//                   onPress={() => setPaymentMethod('cash')}
//                   className={`flex-1 py-3 rounded-xl items-center ${
//                     paymentMethod === 'cash'
//                       ? 'bg-success'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText 
//                     className={paymentMethod === 'cash' ? 'text-white' : ''}
//                   >
//                     Cash
//                   </ThemedText>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setPaymentMethod('bank')}
//                   className={`flex-1 py-3 rounded-xl items-center ${
//                     paymentMethod === 'bank'
//                       ? 'bg-brand'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText 
//                     className={paymentMethod === 'bank' ? 'text-white' : ''}
//                   >
//                     Bank
//                   </ThemedText>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setPaymentMethod('mobile')}
//                   className={`flex-1 py-3 rounded-xl items-center ${
//                     paymentMethod === 'mobile'
//                       ? 'bg-warning'
//                       : 'bg-surface-soft dark:bg-dark-surface-soft'
//                   }`}
//                 >
//                   <ThemedText 
//                     className={paymentMethod === 'mobile' ? 'text-white' : ''}
//                   >
//                     Mobile
//                   </ThemedText>
//                 </TouchableOpacity>
//               </View>
//             </View>

//             {/* Reference (optional) */}
//             <View className="mb-4">
//               <ThemedText variant="label" className="mb-2 font-semibold">
//                 Reference (Optional)
//               </ThemedText>
//               <Input
//                 placeholder="Transaction ID, cheque number, etc."
//                 value={paymentReference}
//                 onChangeText={setPaymentReference}
//                 leftIcon="document-text-outline"
//               />
//             </View>

//             {/* Notes (optional) */}
//             <View className="mb-6">
//               <ThemedText variant="label" className="mb-2 font-semibold">
//                 Notes (Optional)
//               </ThemedText>
//               <Input
//                 placeholder="Add any notes about this payment"
//                 value={paymentNotes}
//                 onChangeText={setPaymentNotes}
//                 leftIcon="chatbubble-outline"
//                 multiline
//                 numberOfLines={3}
//               />
//             </View>

//             {/* Outstanding Balance Info */}
//             <View className="mb-6 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-xl">
//               <View className="flex-row justify-between mb-2">
//                 <ThemedText variant="muted">Outstanding Balance</ThemedText>
//                 <ThemedText 
//                   variant="heading" 
//                   size="base" 
//                   className={stats.outstandingBalance > 0 ? 'text-error' : 'text-success'}
//                 >
//                   {formatCurrency(stats.outstandingBalance)}
//                 </ThemedText>
//               </View>
//               {paymentAmount && parseFloat(paymentAmount) > 0 && (
//                 <View className="flex-row justify-between">
//                   <ThemedText variant="muted">Remaining After Payment</ThemedText>
//                   <ThemedText 
//                     variant="heading" 
//                     size="base"
//                     className={stats.outstandingBalance - parseFloat(paymentAmount) > 0 ? 'text-error' : 'text-success'}
//                   >
//                     {formatCurrency(stats.outstandingBalance - parseFloat(paymentAmount))}
//                   </ThemedText>
//                 </View>
//               )}
//             </View>

//             {/* Action Buttons */}
//             <View className="flex-row gap-3">
//               <Button
//                 variant="outline"
//                 size="lg"
//                 onPress={() => setShowPaymentModal(false)}
//                 className="flex-1"
//               >
//                 Cancel
//               </Button>
//               <Button
//                 variant="default"
//                 size="lg"
//                 onPress={handlePayment}
//                 icon="checkmark-circle"
//                 className="flex-1"
//                 disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
//               >
//                 Confirm
//               </Button>
//             </View>
//           </View>
//         </View>
//       </Modal>

//       {/* Transaction Details Modal */}
//       <Modal
//         visible={!!selectedTransaction}
//         transparent
//         animationType="slide"
//         onRequestClose={() => setSelectedTransaction(null)}
//       >
//         <View className="flex-1 bg-black/50 justify-end">
//           <View className={`rounded-t-3xl ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
//             {selectedTransaction && (
//               <>
//                 {/* Header */}
//                 <View className="p-6 border-b border-border dark:border-dark-border">
//                   <View className="flex-row items-center justify-between mb-4">
//                     <View className="flex-row items-center">
//                       {(() => {
//                         const style = getTransactionStyle(selectedTransaction.transactionType);
//                         return (
//                           <View className={`w-14 h-14 rounded-full ${style.bgColor} items-center justify-center mr-3`}>
//                             <Ionicons name={style.icon as any} size={28} color={style.iconColor} />
//                           </View>
//                         );
//                       })()}
//                       <View>
//                         <ThemedText variant="heading" size="lg" className="font-bold">
//                           {selectedTransaction.transactionType === 'sale' ? 'Sale' : 'Payment'} Details
//                         </ThemedText>
//                         <ThemedText variant="muted" size="sm">
//                           {formatDate(selectedTransaction.transactionDate, true)}
//                         </ThemedText>
//                       </View>
//                     </View>
//                     <TouchableOpacity
//                       onPress={() => setSelectedTransaction(null)}
//                       className="p-2"
//                     >
//                       <Ionicons name="close" size={24} color={isDark ? '#94a3b8' : '#64748b'} />
//                     </TouchableOpacity>
//                   </View>

//                   {/* Amount */}
//                   <View className="items-center py-4">
//                     <ThemedText variant="muted" size="sm">Total Amount</ThemedText>
//                     <ThemedText 
//                       variant="heading" 
//                       size="3xl" 
//                       className={`font-bold ${
//                         selectedTransaction.transactionType === 'sale' ? 'text-warning' : 'text-success'
//                       }`}
//                     >
//                       {selectedTransaction.transactionType === 'sale' ? '-' : '+'}
//                       {formatCurrency(selectedTransaction.totalAmount)}
//                     </ThemedText>
//                   </View>
//                 </View>

//                 {/* Details */}
//                 <View className="p-6">
//                   {/* Status */}
//                   <View className="flex-row items-center justify-between mb-4 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-xl">
//                     <View className="flex-row items-center">
//                       <Ionicons 
//                         name={selectedTransaction.paymentStatus === 'paid' ? 'checkmark-circle' : 'time'} 
//                         size={20} 
//                         color={
//                           selectedTransaction.paymentStatus === 'paid' 
//                             ? '#22c55e' 
//                             : selectedTransaction.paymentStatus === 'partial'
//                             ? '#f59e0b'
//                             : '#ef4444'
//                         } 
//                       />
//                       <ThemedText className="ml-2 font-medium">
//                         Payment Status
//                       </ThemedText>
//                     </View>
//                     <View className={`px-3 py-1 rounded-full ${
//                       selectedTransaction.paymentStatus === 'paid'
//                         ? 'bg-success-soft'
//                         : selectedTransaction.paymentStatus === 'partial'
//                         ? 'bg-warning-soft'
//                         : 'bg-error-soft'
//                     }`}>
//                       <ThemedText 
//                         className={
//                           selectedTransaction.paymentStatus === 'paid'
//                             ? 'text-success'
//                             : selectedTransaction.paymentStatus === 'partial'
//                             ? 'text-warning'
//                             : 'text-error'
//                         }
//                       >
//                         {selectedTransaction.paymentStatus}
//                       </ThemedText>
//                     </View>
//                   </View>

//                   {/* Transaction Details Grid */}
//                   <View className="flex-row flex-wrap gap-4 mb-4">
//                     <View className="flex-1 min-w-[45%]">
//                       <ThemedText variant="muted" size="xs">Reference</ThemedText>
//                       <ThemedText variant="default" size="base" className="font-medium">
//                         {selectedTransaction.transactionNumber || 'N/A'}
//                       </ThemedText>
//                     </View>
//                     <View className="flex-1 min-w-[45%]">
//                       <ThemedText variant="muted" size="xs">Recorded By</ThemedText>
//                       <ThemedText variant="default" size="base" className="font-medium">
//                         {selectedTransaction.recordedBy || 'N/A'}
//                       </ThemedText>
//                     </View>
//                     {selectedTransaction.dueDate && (
//                       <View className="flex-1 min-w-[45%]">
//                         <ThemedText variant="muted" size="xs">Due Date</ThemedText>
//                         <ThemedText 
//                           variant="default" 
//                           size="base" 
//                           className={`font-medium ${
//                             selectedTransaction.dueDate < Date.now() ? 'text-error' : ''
//                           }`}
//                         >
//                           {formatDate(selectedTransaction.dueDate)}
//                           {selectedTransaction.dueDate < Date.now() && ' (overdue)'}
//                         </ThemedText>
//                       </View>
//                     )}
//                   </View>

//                   {/* Notes */}
//                   {selectedTransaction.notes && (
//                     <View className="mb-4 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-xl">
//                       <ThemedText variant="muted" size="sm" className="mb-2">
//                         Notes
//                       </ThemedText>
//                       <ThemedText variant="default" size="base">
//                         {selectedTransaction.notes}
//                       </ThemedText>
//                     </View>
//                   )}

//                   {/* Payments List */}
//                   {selectedTransaction.payments && selectedTransaction.payments.length > 0 && (
//                     <View className="mb-4">
//                       <ThemedText variant="label" className="mb-3 font-semibold">
//                         Payment History
//                       </ThemedText>
//                       <View className="gap-2">
//                         {selectedTransaction.payments.map((payment) => (
//                           <View 
//                             key={payment.id}
//                             className="flex-row items-center justify-between p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg"
//                           >
//                             <View className="flex-row items-center">
//                               <View className="w-8 h-8 rounded-full bg-success-soft items-center justify-center mr-2">
//                                 <Ionicons name="cash" size={16} color="#22c55e" />
//                               </View>
//                               <View>
//                                 <ThemedText variant="default" size="sm" className="font-medium">
//                                   {formatCurrency(payment.amount)}
//                                 </ThemedText>
//                                 <ThemedText variant="muted" size="xs">
//                                   {formatDate(payment.createdAt, true)}
//                                 </ThemedText>
//                               </View>
//                             </View>
//                             <View className="px-2 py-1 bg-success-soft rounded-full">
//                               <ThemedText variant="success" size="xs">
//                                 {payment.method || 'Cash'}
//                               </ThemedText>
//                             </View>
//                           </View>
//                         ))}
//                       </View>
//                     </View>
//                   )}

//                   {/* Remaining Balance */}
//                   {selectedTransaction.transactionType === 'sale' && 
//                    selectedTransaction.remainingBalance !== undefined && 
//                    selectedTransaction.remainingBalance > 0 && (
//                     <View className="mb-6 p-4 bg-error-soft rounded-xl flex-row items-center justify-between">
//                       <View className="flex-row items-center">
//                         <Ionicons name="alert-circle" size={20} color="#ef4444" />
//                         <ThemedText className="ml-2 font-medium">Remaining Balance</ThemedText>
//                       </View>
//                       <ThemedText variant="heading" size="lg" className="text-error font-bold">
//                         {formatCurrency(selectedTransaction.remainingBalance)}
//                       </ThemedText>
//                     </View>
//                   )}

//                   {/* Actions */}
//                   <View className="flex-row gap-3">
//                     {selectedTransaction.transactionType === 'sale' && 
//                      selectedTransaction.remainingBalance && 
//                      selectedTransaction.remainingBalance > 0 && (
//                       <Button
//                         variant="default"
//                         size="lg"
//                         icon="cash"
//                         onPress={() => {
//                           setSelectedTransaction(null);
//                           setShowPaymentModal(true);
//                           setPaymentAmount(selectedTransaction.remainingBalance?.toString() || '');
//                         }}
//                         className="flex-1"
//                       >
//                         Record Payment
//                       </Button>
//                     )}
//                     <Button
//                       variant="outline"
//                       size="lg"
//                       onPress={() => setSelectedTransaction(null)}
//                       className="flex-1"
//                     >
//                       Close
//                     </Button>
//                   </View>
//                 </View>
//               </>
//             )}
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }