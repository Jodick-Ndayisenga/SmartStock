// app/transaction/[id].tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';

// Models
import Transaction from '@/database/models/Transaction';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { User } from '@/database/models/User';

// Types
interface TransactionItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

interface TransactionDetails {
  id: string;
  transactionNumber: string;
  transactionType: 'sale' | 'purchase' | 'expense' | 'income' | 'transfer' | 'payment';
  date: Date;
  dueDate?: Date;
  paymentStatus: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  
  // Contact info
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  
  // Transfer info
  sourceAccount?: {
    id: string;
    name: string;
    type: string;
  };
  destinationAccount?: {
    id: string;
    name: string;
    type: string;
  };
  
  // Expense category
  expenseCategory?: {
    id: string;
    name: string;
    description?: string;
  };
  
  // Recurring info
  isRecurring: boolean;
  recurringInterval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextRecurringDate?: Date;
  
  // Metadata
  receiptImageUrl?: string;
  isBusinessExpense?: boolean;
  notes?: string;
  recordedBy: string;
  
  // Related records
  payments: Payment[];
  accountTransactions: AccountTransaction[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Loading Skeleton Component
const TransactionDetailsSkeleton = () => (
  <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
    <PremiumHeader title="Transaction Details" showBackButton />
    <ScrollView className="flex-1 px-2">
      {/* Header Skeleton */}
      <View className="flex-row items-center justify-between mt-4">
        <View className="flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-surface-soft dark:bg-dark-surface-soft animate-pulse" />
          <View className="ml-3">
            <View className="w-32 h-6 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-2" />
            <View className="w-24 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>
        </View>
        <View className="w-20 h-8 bg-surface-soft dark:bg-dark-surface-soft rounded-full animate-pulse" />
      </View>

      {/* Amount Card Skeleton */}
      <View className="mt-4 bg-white dark:bg-dark-surface rounded-xl p-6 items-center">
        <View className="w-24 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-2" />
        <View className="w-40 h-12 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-2" />
        <View className="w-32 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
      </View>

      {/* Multiple Card Skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} className="mt-4 bg-white dark:bg-dark-surface rounded-xl p-4">
          <View className="w-32 h-5 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse mb-3" />
          <View className="space-y-2">
            <View className="w-full h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
            <View className="w-3/4 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
            <View className="w-1/2 h-4 bg-surface-soft dark:bg-dark-surface-soft rounded animate-pulse" />
          </View>
        </View>
      ))}
    </ScrollView>
  </View>
);

// Inner component that receives observable data
const TransactionDetailsInner = ({
  transaction,
  payments,
  accountTransactions,
  users,
  isLoading = false,
}: {
  transaction?: Transaction;
  payments?: Payment[];
  accountTransactions?: AccountTransaction[];
  users?: User[];
  isLoading?: boolean;
}) => {
  const router = useRouter();
  const { currentShop } = useAuth();

  // Show loading skeleton while data is loading
  if (isLoading) {
    return <Loading/>;
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return `FBU ${amount.toLocaleString('fr-FR')}`;
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Process transaction details
  const details = useMemo((): TransactionDetails | null => {
    if (!transaction) return null;

    // Get payment status display
    const paymentStatus = transaction.paymentStatus || 
      (transaction.balanceDue === 0 ? 'paid' : 
       transaction.amountPaid > 0 ? 'partial' : 'unpaid');

    // Mock contact info - you'd fetch from contacts table
    const contactName = transaction.contactId ? 'Customer Name' : undefined;

    return {
      id: transaction.id,
      transactionNumber: transaction.transactionNumber,
      transactionType: transaction.transactionType,
      date: new Date(transaction.transactionDate),
      dueDate: transaction.dueDate ? new Date(transaction.dueDate) : undefined,
      paymentStatus,
      subtotal: transaction.subtotal,
      taxAmount: transaction.taxAmount || 0,
      discountAmount: transaction.discountAmount || 0,
      totalAmount: transaction.totalAmount,
      amountPaid: transaction.amountPaid,
      balanceDue: transaction.balanceDue,
      
      contactId: transaction.contactId,
      contactName: contactName,
      
      // Transfer accounts (would need to fetch account details)
      sourceAccount: transaction.sourceAccountId ? {
        id: transaction.sourceAccountId,
        name: 'Source Account',
        type: 'cash'
      } : undefined,
      destinationAccount: transaction.destinationAccountId ? {
        id: transaction.destinationAccountId,
        name: 'Destination Account',
        type: 'cash'
      } : undefined,
      
      // Expense category
      expenseCategory: transaction.expenseCategoryId ? {
        id: transaction.expenseCategoryId,
        name: 'Expense Category',
      } : undefined,
      
      isRecurring: transaction.isRecurring || false,
      recurringInterval: transaction.recurringInterval,
      nextRecurringDate: transaction.nextRecurringDate ? 
        new Date(transaction.nextRecurringDate) : undefined,
      
      receiptImageUrl: transaction.receiptImageUrl,
      isBusinessExpense: transaction.isBusinessExpense,
      notes: transaction.notes,
      recordedBy: users?.find(user => user.id === transaction.recordedBy)?.displayName || transaction.recordedBy,
      
      payments: payments || [],
      accountTransactions: accountTransactions || [],
      
      createdAt: new Date(transaction.createdAt),
      updatedAt: new Date(transaction.updatedAt),
    };
  }, [transaction, payments, accountTransactions, users]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'completed':
        return 'bg-success';
      case 'partial':
        return 'bg-warning';
      case 'unpaid':
      case 'pending':
        return 'bg-error';
      default:
        return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return 'cart';
      case 'purchase': return 'archive';
      case 'expense': return 'remove-circle';
      case 'income': return 'add-circle';
      case 'transfer': return 'swap-horizontal';
      case 'payment': return 'card';
      default: return 'document';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale': return '#22c55e';
      case 'income': return '#22c55e';
      case 'expense': return '#ef4444';
      case 'purchase': return '#ef4444';
      case 'transfer': return '#0ea5e9';
      case 'payment': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const handleAddPayment = () => {
    router.push(`/shops/${currentShop?.id}/debtors`);
  };


  if (!details) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Transaction Details" showBackButton />
        <EmptyState
          icon="document-text-outline"
          title="Transaction Not Found"
          description="This transaction may have been deleted"
          action={{
            label: "Go Back",
            onPress: () => router.back()
          }}
        />
      </View>
    );
  }

  const isSale = details.transactionType === 'sale' || details.transactionType === 'income';
  const isExpense = details.transactionType === 'expense' || details.transactionType === 'purchase';
  const isTransfer = details.transactionType === 'transfer';
  const hasBalanceDue = details.balanceDue > 0;

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Transaction Details"
        subtitle={`${details.transactionType.toUpperCase()} - ${details.transactionNumber}`}
        showBackButton
      />
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-2">
        {/* Header with Type and Status */}
        <View className="flex-row items-center justify-between mt-4">
          <View className="flex-row items-center">
            <View className={`w-12 h-12 rounded-full items-center justify-center mr-3`}
              style={{ backgroundColor: `${getTypeColor(details.transactionType)}20` }}
            >
              <Ionicons 
                name={getTypeIcon(details.transactionType)} 
                size={24} 
                color={getTypeColor(details.transactionType)} 
              />
            </View>
            <View>
              <ThemedText variant="subheading" size="lg" className="capitalize">
                {details.transactionType.toLocaleUpperCase()}
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                {details.transactionNumber}
              </ThemedText>
            </View>
          </View>
          <Badge variant="outline" className={`${getStatusColor(details.paymentStatus)}`}>
            {details.paymentStatus.toUpperCase()}
          </Badge>
        </View>

        {/* Amount Card */}
        <Card variant="elevated" className="mt-4">
          <CardContent className="p-6 items-center">
            <ThemedText variant="muted" size="sm" className="mb-2">
              Total Amount
            </ThemedText>
            <ThemedText 
              variant={`${isSale ? 'success' : isExpense ? 'error' : 'brand'}`} 
              size="4xl" 
              className={`font-bold ${
                isSale ? 'text-success' : isExpense ? 'text-error' : 'text-brand'
              }`}
            >
              {isExpense ? '-' : ''}{formatCurrency(details.totalAmount)}
            </ThemedText>
            <View className="flex-row items-center mt-2">
              <Ionicons name="time" size={14} color="#64748b" />
              <ThemedText variant="muted" size="xs" className="ml-1">
                {formatShortDate(details.date)}
              </ThemedText>
            </View>
          </CardContent>
        </Card>

        {/* Payment Status Card - Show if there's balance due */}
        {hasBalanceDue && (
          <Card variant="elevated" className="mt-4">
            <CardContent className="p-4">
              <View className="flex-row justify-between items-center">
                <View>
                  <ThemedText variant="muted" size="sm">Payment Status</ThemedText>
                  <View className="flex-row items-center mt-1">
                    <View className={`w-2 h-2 rounded-full ${getStatusColor(details.paymentStatus)} mr-2`} />
                    <ThemedText variant="default" className="capitalize">
                      {details.paymentStatus}
                    </ThemedText>
                  </View>
                </View>
                <View className="items-end">
                  <ThemedText variant="muted" size="sm">Balance Due</ThemedText>
                  <ThemedText variant="heading" size="lg" className="text-error font-bold">
                    {formatCurrency(details.balanceDue)}
                  </ThemedText>
                </View>
              </View>
              
              <Button
                variant="default"
                size="sm"
                className="mt-3"
                onPress={handleAddPayment}
                icon="card-outline"
              >
                Record Payment
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Amount Breakdown */}
        <Card variant="elevated" className="mt-4">
          <CardHeader title="Amount Breakdown" />
          <CardContent className="p-4">
            <View className="flex-row justify-between mb-2">
              <ThemedText variant="muted">Subtotal</ThemedText>
              <ThemedText variant="default">{formatCurrency(details.subtotal)}</ThemedText>
            </View>
            
            {details.discountAmount > 0 && (
              <View className="flex-row justify-between mb-2">
                <ThemedText variant="muted">Discount</ThemedText>
                <ThemedText variant="error">-{formatCurrency(details.discountAmount)}</ThemedText>
              </View>
            )}
            
            {details.taxAmount > 0 && (
              <View className="flex-row justify-between mb-2">
                <ThemedText variant="muted">Tax</ThemedText>
                <ThemedText variant="default">{formatCurrency(details.taxAmount)}</ThemedText>
              </View>
            )}
            
            <View className="flex-row justify-between mt-2 pt-2 border-t border-border dark:border-dark-border">
              <ThemedText variant="heading" size="base">Total</ThemedText>
              <ThemedText 
                variant="heading" 
                size="base"
                className={isSale ? 'text-success' : isExpense ? 'text-error' : 'text-brand'}
              >
                {isExpense ? '-' : ''}{formatCurrency(details.totalAmount)}
              </ThemedText>
            </View>
            
            <View className="flex-row justify-between mt-2">
              <ThemedText variant="muted">Amount Paid</ThemedText>
              <ThemedText variant="success">{formatCurrency(details.amountPaid)}</ThemedText>
            </View>
          </CardContent>
        </Card>

        {/* Transfer Details - Show for transfers */}
        {isTransfer && (
          <Card variant="elevated" className="mt-4">
            <CardHeader title="Transfer Details" />
            <CardContent className="p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-1 items-center">
                  <ThemedText variant="muted" size="sm">From</ThemedText>
                  <ThemedText variant="default" className="font-semibold">
                    {details.sourceAccount?.name || 'Unknown'}
                  </ThemedText>
                  <Badge variant="outline" size="sm" className="mt-1">
                    {details.sourceAccount?.type}
                  </Badge>
                </View>
                
                <Ionicons name="arrow-forward" size={24} color="#64748b" />
                
                <View className="flex-1 items-center">
                  <ThemedText variant="muted" size="sm">To</ThemedText>
                  <ThemedText variant="default" className="font-semibold">
                    {details.destinationAccount?.name || 'Unknown'}
                  </ThemedText>
                  <Badge variant="outline" size="sm" className="mt-1">
                    {details.destinationAccount?.type}
                  </Badge>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Expense Category - Show for expenses */}
        {details.expenseCategory && (
          <Card variant="elevated" className="mt-4">
            <CardHeader title="Expense Category" />
            <CardContent className="p-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-warning/10 items-center justify-center mr-3">
                  <Ionicons name="folder" size={20} color="#f59e0b" />
                </View>
                <View>
                  <ThemedText variant="heading" size="base">
                    {details.expenseCategory.name}
                  </ThemedText>
                  {details.expenseCategory.description && (
                    <ThemedText variant="muted" size="sm">
                      {details.expenseCategory.description}
                    </ThemedText>
                  )}
                </View>
              </View>
              
              {details.isBusinessExpense !== undefined && (
                <View className="flex-row items-center mt-3 pt-3 border-t border-border dark:border-dark-border">
                  <Ionicons 
                    name={details.isBusinessExpense ? "business" : "person"} 
                    size={16} 
                    color="#64748b" 
                  />
                  <ThemedText variant="muted" size="sm" className="ml-2">
                    {details.isBusinessExpense ? 'Business Expense' : 'Personal Expense'}
                  </ThemedText>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recurring Info */}
        {details.isRecurring && (
          <Card variant="elevated" className="mt-4">
            <CardHeader title="Recurring Transaction" />
            <CardContent className="p-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                  <Ionicons name="repeat" size={20} color="#0ea5e9" />
                </View>
                <View>
                  <ThemedText variant="default">
                    Repeats {details.recurringInterval}
                  </ThemedText>
                  {details.nextRecurringDate && (
                    <ThemedText variant="muted" size="sm">
                      Next: {formatShortDate(details.nextRecurringDate)}
                    </ThemedText>
                  )}
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {/* Payments List */}
        {details.payments.length > 0 && (
          <Card variant="elevated" className="mt-4">
            <CardHeader 
              title="Payments" 
              subtitle={`${details.payments.length} payment${details.payments.length > 1 ? 's' : ''}`}
            />
            <CardContent className="p-2">
              {details.payments.map((payment, index) => (
                <TouchableOpacity 
                  key={payment.id}
                  className={`flex-row items-center justify-between p-3 ${
                    index < details.payments.length - 1 ? 'border-b border-border dark:border-dark-border' : ''
                  }`}
                  onPress={() => router.push(`/payment/${payment.id}`)}
                >
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-success/10 items-center justify-center mr-2">
                      <Ionicons name="card" size={16} color="#22c55e" />
                    </View>
                    <View>
                      <ThemedText variant="default" size="sm">
                        {formatCurrency(payment.amount)}
                      </ThemedText>
                      <ThemedText variant="muted" size="xs">
                        {payment.referenceNumber || 'No reference'}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText variant="muted" size="xs">
                    {formatShortDate(new Date(payment.paymentDate))}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Account Transactions */}
        {details.accountTransactions.length > 0 && (
          <Card variant="elevated" className="mt-4">
            <CardHeader title="Account Transactions" />
            <CardContent className="p-2">
              {details.accountTransactions.map((at, index) => (
                <View 
                  key={at.id}
                  className={`flex-row items-center justify-between p-3 ${
                    index < details.accountTransactions.length - 1 ? 'border-b border-border dark:border-dark-border' : ''
                  }`}
                >
                  <View>
                    <ThemedText variant="default" size="sm">
                      {at.description.length > 25 ? `${at.description.slice(0, 25)}...` : at.description}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs">
                      {at.type}
                    </ThemedText>
                  </View>
                  <View className="items-end">
                    <ThemedText variant="default" size="sm">
                      {formatCurrency(at.amount)}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs">
                      Balance: {formatCurrency(at.balanceAfter)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        

        {/* Notes */}
        {details.notes && (
          <Card variant="elevated" className="mt-4">
            <CardHeader title="Notes" />
            <CardContent className="p-4">
              <ThemedText variant="default">{details.notes}</ThemedText>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card variant="elevated" className="mt-4 mb-24">
          <CardHeader title="Information" />
          <CardContent className="p-4">
            <View className="flex-row justify-between mb-2">
              <ThemedText variant="muted">Recorded By</ThemedText>
              <ThemedText variant="default">{details.recordedBy}</ThemedText>
            </View>
            <View className="flex-row justify-between mb-2">
              <ThemedText variant="muted">Created</ThemedText>
              <ThemedText variant="default">{formatShortDate(details.createdAt)}</ThemedText>
            </View>
            <View className="flex-row justify-between">
              <ThemedText variant="muted">Last Updated</ThemedText>
              <ThemedText variant="default">{formatShortDate(details.updatedAt)}</ThemedText>
            </View>
          </CardContent>
        </Card>
      </ScrollView>

      {/* Action Buttons */}
      <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-surface border-t border-border dark:border-dark-border px-4 py-3">
        <View className="flex-row gap-3">
          {hasBalanceDue && (
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              icon="card-outline"
              onPress={handleAddPayment}
            >
              Pay
            </Button>
          )}
        </View>
      </View>
    </View>
  );
};

// Loading wrapper component
const TransactionDetailsWithLoading = ({ 
  transaction,
  payments,
  accountTransactions,
  users
}: {
  transaction?: Transaction;
  payments?: Payment[];
  accountTransactions?: AccountTransaction[];
  users?: User[];
}) => {
  const isLoading = !transaction || !payments || !accountTransactions || !users;
  
  return (
    <TransactionDetailsInner
      transaction={transaction}
      payments={payments}
      accountTransactions={accountTransactions}
      users={users}
      isLoading={isLoading}
    />
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['id'],
  ({ id }: { id: string }) => ({
    transaction: database
      .get<Transaction>('transactions')
      .findAndObserve(id),
    payments: database
      .get<Payment>('payments')
      .query(
        Q.where('transaction_id', id)
      )
      .observe(),
    accountTransactions: database
      .get<AccountTransaction>('account_transactions')
      .query(
        Q.where('transaction_id', id)
      )
      .observe(),
    users: database
      .get<User>('users')
      .query()
      .observe(),
  })
);

const TransactionDetailsWithObservables = enhance(TransactionDetailsWithLoading);

// Main exported component
export default function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams();
  
  if (!id || typeof id !== 'string') {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Transaction Details" showBackButton />
        <EmptyState
          icon="alert-circle-outline"
          title="Invalid Transaction"
          description="No transaction ID provided"
        />
      </View>
    );
  }

  return <TransactionDetailsWithObservables id={id} />;
}