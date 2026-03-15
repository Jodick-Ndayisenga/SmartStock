// app/payment/[id].tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomDialog from '@/components/ui/CustomDialog';

// Models
import { Payment } from '@/database/models/Payment';
import Transaction from '@/database/models/Transaction';
import { CashAccount } from '@/database/models/CashAccount';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';

// Types
interface PaymentDetails {
  id: string;
  transactionId: string;
  transactionNumber: string;
  shopId: string;
  paymentMethodId: string;
  cashAccountId: string;
  cashAccountName: string;
  cashAccountType: string;
  amount: number;
  paymentDate: Date;
  referenceNumber?: string;
  notes?: string;
  recordedBy: string;
  transaction?: Transaction;
  accountTransactions?: AccountTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

// Inner component that receives observable data
const PaymentDetailsInner = ({
  payment,
  transaction,
  cashAccount,
  accountTransactions = [],
}: {
  payment?: Payment;
  transaction?: Transaction;
  cashAccount?: CashAccount;
  accountTransactions?: AccountTransaction[];
}) => {
  const router = useRouter();
  const { currentShop } = useAuth();
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Process payment details
  const details = useMemo((): PaymentDetails | null => {
    if (!payment) return null;

    return {
      id: payment.id,
      transactionId: payment.transactionId,
      transactionNumber: transaction?.transactionNumber || 'N/A',
      shopId: payment.shopId,
      paymentMethodId: payment.paymentMethodId,
      cashAccountId: payment.cashAccountId,
      cashAccountName: cashAccount?.name || 'Unknown Account',
      cashAccountType: cashAccount?.type || 'unknown',
      amount: payment.amount,
      paymentDate: new Date(payment.paymentDate),
      referenceNumber: payment.referenceNumber,
      notes: payment.notes,
      recordedBy: payment.recordedBy,
      transaction,
      accountTransactions,
      createdAt: new Date(payment.createdAt),
      updatedAt: new Date(payment.updatedAt),
    };
  }, [payment, transaction, cashAccount, accountTransactions]);

  const getPaymentMethodIcon = (methodId: string) => {
    switch (methodId?.toLowerCase()) {
      case 'cash': return 'cash';
      case 'card': return 'card';
      case 'mobile': return 'phone-portrait';
      case 'bank': return 'business';
      case 'credit': return 'card';
      default: return 'wallet';
    }
  };

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'cash': return 'cash';
      case 'bank_account': return 'business';
      case 'mobile_money': return 'phone-portrait';
      case 'credit_card': return 'card';
      case 'petty_cash': return 'wallet';
      default: return 'wallet';
    }
  };

  const handlePrint = () => {
    setShowOptionsDialog(false);
    Alert.alert('Print', 'Printing payment receipt...');
  };

  const handleShare = async () => {
    setShowOptionsDialog(false);
    try {
      await Share.share({
        message: `Payment Receipt\n\nTransaction: ${details?.transactionNumber}\nAmount: ${formatCurrency(details?.amount || 0)}\nDate: ${formatDate(details?.paymentDate || new Date())}\nAccount: ${details?.cashAccountName}\nReference: ${details?.referenceNumber || 'N/A'}`,
        title: 'Payment Receipt',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleEmail = () => {
    setShowOptionsDialog(false);
    // You'd need customer email from the transaction
    Alert.alert('Email', 'Email receipt feature coming soon');
  };

  const handleVoidPayment = async () => {
    setIsProcessing(true);
    try {
      await database.write(async () => {
        // Void the payment
        await payment?.update(p => {
          p.notes = `VOIDED - ${p.notes || ''}`.trim();
        });
        
        // Update transaction balance if needed
        if (transaction) {
          await transaction.update(t => {
            t.amountPaid = t.amountPaid - (payment?.amount || 0);
            t.balanceDue = t.totalAmount - t.amountPaid;
            t.paymentStatus = t.balanceDue === 0 ? 'paid' : t.amountPaid > 0 ? 'partial' : 'unpaid';
          });
        }
        
        // Void related account transactions
        for (const at of accountTransactions) {
          await at.update(a => {
            a.notes = `VOIDED - ${a.notes || ''}`.trim();
          });
        }
      });
      
      setShowVoidDialog(false);
      Alert.alert('Success', 'Payment voided successfully');
      router.back();
    } catch (error) {
      console.error('Error voiding payment:', error);
      Alert.alert('Error', 'Failed to void payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleViewTransaction = () => {
    router.push(`/shops/${currentShop?.id}/transaction/${details?.transactionId}`);
  };

  if (!details) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Payment Details" showBackButton />
        <EmptyState
          icon="card-outline"
          title="Payment Not Found"
          description="This payment may have been deleted"
          action={{
            label: "Go Back",
            onPress: () => router.back()
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title="Payment Details"
        showBackButton
      />

      {/* Options Dialog */}
      <CustomDialog
        visible={showOptionsDialog}
        title="Payment Options"
        variant="neutral"
        icon="ellipsis-horizontal"
        showCancel={true}
        cancelLabel="Close"
        onCancel={() => setShowOptionsDialog(false)}
        onClose={() => setShowOptionsDialog(false)}
        actions={[
          {
            label: 'Print Receipt',
            onPress: handlePrint,
            variant: 'default',
          },
          {
            label: 'Share',
            onPress: handleShare,
            variant: 'default',
          },
          {
            label: 'Email Receipt',
            onPress: handleEmail,
            variant: 'default',
          },
        ]}
      />

      {/* Void Confirmation Dialog */}
      <CustomDialog
        visible={showVoidDialog}
        title="Void Payment"
        description={`Are you sure you want to void this payment of ${formatCurrency(details.amount)}? This action cannot be undone.`}
        variant="error"
        icon="alert-circle"
        showCancel={true}
        cancelLabel="No, Keep It"
        onCancel={() => setShowVoidDialog(false)}
        onClose={() => setShowVoidDialog(false)}
        actions={[
          {
            label: 'Yes, Void Payment',
            onPress: handleVoidPayment,
            variant: 'destructive',
            disabled: isProcessing,
          },
        ]}
        loading={isProcessing}
      />

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-2">
        {/* Header with Amount */}
        <Card variant="elevated" className="mt-4">
          <CardContent className="p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-success/10 items-center justify-center mb-3">
              <Ionicons name="card" size={32} color="#22c55e" />
            </View>
            <ThemedText variant="muted" size="sm" className="mb-2">
              Payment Amount
            </ThemedText>
            <ThemedText variant="success" size="4xl" className="font-bold">
              {formatCurrency(details.amount)}
            </ThemedText>
            <View className="flex-row items-center mt-2">
              <Ionicons name="time" size={14} color="#64748b" />
              <ThemedText variant="muted" size="xs" className="ml-1">
                {formatDate(details.paymentDate)}
              </ThemedText>
            </View>
          </CardContent>
        </Card>

        {/* Transaction Info */}
        <TouchableOpacity onPress={handleViewTransaction}>
          <Card variant="elevated" className="mt-4">
            <CardHeader 
              title="Transaction"
              subtitle="View related transaction"
              action={
                <Ionicons name="chevron-forward" size={20} color="#64748b" />
              }
            />
            <CardContent className="p-4">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-brand/10 items-center justify-center mr-3">
                  <Ionicons name="document-text" size={20} color="#0ea5e9" />
                </View>
                <View className="flex-1">
                  <ThemedText variant="heading" size="base">
                    {details.transactionNumber}
                  </ThemedText>
                  <ThemedText variant="muted" size="sm">
                    {transaction?.transactionType || 'Unknown'} • 
                    {transaction ? formatCurrency(transaction.totalAmount) : 'N/A'}
                  </ThemedText>
                </View>
              </View>
            </CardContent>
          </Card>
        </TouchableOpacity>

        {/* Account Details */}
        <Card variant="elevated" className="mt-4">
          <CardHeader title="Account Details" />
          <CardContent className="p-4">
            <View className="flex-row items-center mb-3">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: 
                  details.cashAccountType === 'cash' ? '#22c55e20' :
                  details.cashAccountType === 'bank_account' ? '#0ea5e920' :
                  details.cashAccountType === 'mobile_money' ? '#f59e0b20' : '#64748b20'
                }}
              >
                <Ionicons 
                  name={getAccountTypeIcon(details.cashAccountType)} 
                  size={20} 
                  color={
                    details.cashAccountType === 'cash' ? '#22c55e' :
                    details.cashAccountType === 'bank_account' ? '#0ea5e9' :
                    details.cashAccountType === 'mobile_money' ? '#f59e0b' : '#64748b'
                  } 
                />
              </View>
              <View className="flex-1">
                <ThemedText variant="heading" size="base">
                  {details.cashAccountName}
                </ThemedText>
                <ThemedText variant="muted" size="sm" className="capitalize">
                  {details.cashAccountType.replace('_', ' ')}
                </ThemedText>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 items-center justify-center mr-3">
                <Ionicons name={getPaymentMethodIcon(details.paymentMethodId)} size={20} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <ThemedText variant="heading" size="base">
                  Payment Method
                </ThemedText>
                <ThemedText variant="muted" size="sm" className="capitalize">
                  {details.paymentMethodId || 'Unknown'}
                </ThemedText>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Reference & Notes */}
        {(details.referenceNumber || details.notes) && (
          <Card variant="elevated" className="mt-4">
            <CardHeader title="Additional Information" />
            <CardContent className="p-4">
              {details.referenceNumber && (
                <View className="flex-row justify-between mb-2">
                  <ThemedText variant="muted">Reference</ThemedText>
                  <ThemedText variant="default">{details.referenceNumber}</ThemedText>
                </View>
              )}
              
              {details.notes && (
                <View>
                  <ThemedText variant="muted" size="sm" className="mb-1">Notes</ThemedText>
                  <ThemedText variant="default">{details.notes}</ThemedText>
                </View>
              )}
            </CardContent>
          </Card>
        )}

        {/* Account Transactions */}
        {accountTransactions.length > 0 && (
          <Card variant="elevated" className="mt-4">
            <CardHeader 
              title="Account Transactions" 
              subtitle={`${accountTransactions.length} entry`}
            />
            <CardContent className="p-2">
              {accountTransactions.map((at, index) => (
                <View 
                  key={at.id}
                  className={`flex-row items-center justify-between p-3 ${
                    index < accountTransactions.length - 1 ? 'border-b border-border dark:border-dark-border' : ''
                  }`}
                >
                  <View>
                    <ThemedText variant="default" size="sm">
                      {at.description}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs" className="capitalize">
                      {at.type}
                    </ThemedText>
                  </View>
                  <View className="items-end">
                    <ThemedText 
                      variant="default" 
                      size="sm"
                      className={at.amount > 0 ? 'text-success' : 'text-error'}
                    >
                      {at.amount > 0 ? '+' : ''}{formatShortCurrency(at.amount)}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs">
                      Balance: {formatShortCurrency(at.balanceAfter)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card variant="elevated" className="mt-4 mb-8">
          <CardHeader title="Information" />
          <CardContent className="p-4">
            <View className="flex-row justify-between mb-2">
              <ThemedText variant="muted">Payment ID</ThemedText>
              <ThemedText variant="default" className="font-mono">
                {details.id.slice(-8)}
              </ThemedText>
            </View>
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
    </View>
  );
};

// Enhance with observables for real-time updates
const enhance = withObservables(
  ['id'],
  ({ id }: { id: string }) => ({
    payment: database.get<Payment>('payments').findAndObserve(id),
    accountTransactions: database
      .get<AccountTransaction>('account_transactions')
      .query(
        Q.where('payment_id', id)
      )
      .observe(),
    // We need to fetch transaction and cashAccount separately
    // This will be handled in the component with additional queries
  })
);

const PaymentDetailsWithObservables = enhance(({ 
  payment,
  accountTransactions 
}: { 
  payment?: Payment;
  accountTransactions?: AccountTransaction[];
}) => {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [cashAccount, setCashAccount] = useState<CashAccount | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch related data
  React.useEffect(() => {
    const fetchRelatedData = async () => {
      if (payment) {
        try {
          // Fetch transaction
          if (payment.transactionId) {
            const tx = await database.get<Transaction>('transactions').find(payment.transactionId);
            setTransaction(tx);
          }
          
          // Fetch cash account
          if (payment.cashAccountId) {
            const account = await database.get<CashAccount>('cash_accounts').find(payment.cashAccountId);
            setCashAccount(account);
          }
        } catch (error) {
          console.error('Error fetching related data:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    fetchRelatedData();
  }, [payment]);

  if (loading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Payment Details" showBackButton />
        <View className="flex-1 items-center justify-center">
          <ThemedText variant="muted">Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <PaymentDetailsInner 
      payment={payment} 
      transaction={transaction || undefined}
      cashAccount={cashAccount || undefined}
      accountTransactions={accountTransactions}
    />
  );
});

// Main exported component
export default function PaymentDetailsScreen() {
  const { id } = useLocalSearchParams();
  if (!id || typeof id !== 'string') {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Payment Details" showBackButton />
        <EmptyState
          icon="alert-circle-outline"
          title="Invalid Payment"
          description="No payment ID provided"
        />
      </View>
    );
  }

  return <PaymentDetailsWithObservables id={id} />;
}