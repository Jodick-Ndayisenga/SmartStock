// hooks/useSaleProcessor.ts
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { SaleQueueService } from '@/services/saleQueueService';
import { getDefaultCashAccount } from '@/services/cashAccountService';
import { StockService } from '@/services/stockServices';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { Product } from '@/database/models/Product';
import { Contact } from '@/database/models/Contact';
import { CashAccount } from '@/database/models/CashAccount';
import { AccountTransaction } from '@/database/models/AccountTransaction';
import { Payment } from '@/database/models/Payment';
import Transaction from '@/database/models/Transaction';
import { CartItem, PaymentMode } from '@/types/sales';

interface UseSaleProcessorProps {
  cart: CartItem[];
  products: Product[];
  customers: Contact[];
  currentShop: any;
  user: any;
  isOffline: boolean;
  clearCart: () => void; // Add this
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
}

export function useSaleProcessor({
  cart,
  products,
  customers,
  currentShop,
  user,
  isOffline,
  clearCart, // Add this
  onSuccess,
  onError,
}: UseSaleProcessorProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [creditTerms, setCreditTerms] = useState('');
  const [creditPaymentAmount, setCreditPaymentAmount] = useState<number>(0);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const finalTotal = totalAmount; // Add tax/discount calculations if needed

  const validateSale = useCallback((): boolean => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return false;
    }
    
    if (paymentMode === 'credit' && !selectedCustomer) {
      Alert.alert('Error', 'Please select a customer for credit sale');
      return false;
    }
    
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;
      
      if (item.baseQuantity > (product.stockQuantity || 0)) {
        Alert.alert(
          'Insufficient Stock',
          `${item.productName} only has ${product.formattedCurrentStock} available`
        );
        return false;
      }
    }
    
    return true;
  }, [cart, paymentMode, selectedCustomer, products]);

  const generateTransactionNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}${day}-${random}`;
  };

  const getOrCreateReceivableAccount = async (shopId: string): Promise<CashAccount> => {
    const existing = await database.get<CashAccount>('cash_accounts')
      .query(
        Q.where('shop_id', shopId),
        Q.where('type', 'receivable'),
        Q.where('is_active', true)
      )
      .fetch();

    if (existing.length > 0) {
      return existing[0];
    }

    return await database.write(async () => {
      return await database.get<CashAccount>('cash_accounts').create(account => {
        account.shopId = shopId;
        account.name = user?.displayName 
          ? `${user.displayName.split(' ')[0]} LUMICASH` 
          : `${currentShop?.name.toUpperCase()} RECEIVABLES`;
        account.type = 'receivable';
        account.openingBalance = 0;
        account.currency = 'BIF';
        account.isDefault = false;
        account.isActive = true;
      });
    });
  };

  const saveSaleToQueue = useCallback(async () => {
    const queuedSale = {
      id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cart,
      paymentMode,
      selectedCustomer,
      dueDate,
      creditTerms,
      totalAmount: finalTotal,
      timestamp: Date.now(),
      shopId: currentShop!.id,
      userId: user!.id,
    };

    await SaleQueueService.saveQueuedSale(queuedSale);
    
    clearCart(); // Clear cart after queuing
    
    onSuccess({
      title: 'Sale Queued',
      description: 'Your sale has been saved and will be processed when you\'re back online.',
      variant: 'info',
      icon: 'cloud-upload-outline',
    });
  }, [cart, paymentMode, selectedCustomer, dueDate, creditTerms, finalTotal, currentShop, user, clearCart, onSuccess]);

  const processSaleTransaction = useCallback(async () => {
    if (!currentShop || !user) throw new Error('Missing shop or user');

    let defaultAccountId;
    if (paymentMode === 'cash') {
      const defaultAccount = await getDefaultCashAccount(currentShop.id);
      if (!defaultAccount) {
        throw new Error('No default cash account found. Please set a default account in settings.');
      }
      defaultAccountId = defaultAccount.id;
    }

    let receivableAccountId;
    if (paymentMode === 'credit') {
      const receivableAccount = await getOrCreateReceivableAccount(currentShop.id);
      receivableAccountId = receivableAccount.id;
    }

    const amountPaid = paymentMode === 'cash' ? finalTotal : creditPaymentAmount;
    const balanceDue = finalTotal - amountPaid;
    const paymentStatus = balanceDue <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'due');

    const transaction = await database.write(async () => {
      const newTransaction = await database.get<Transaction>('transactions').create(t => {
        t.shopId = currentShop.id;
        t.transactionType = 'sale';
        t.transactionNumber = generateTransactionNumber();
        t.contactId = paymentMode === 'credit' ? selectedCustomer ?? null : null;
        t.subtotal = totalAmount;
        t.taxAmount = 0;
        t.discountAmount = 0;
        t.totalAmount = finalTotal;
        t.amountPaid = amountPaid;
        t.balanceDue = balanceDue;
        t.paymentStatus = paymentStatus;
        t.transactionDate = Date.now();
        t.dueDate = dueDate || undefined;
        t.recordedBy = user.id;
        t.notes = creditTerms || '';
      });

      if (paymentMode === 'cash' || (paymentMode === 'credit' && amountPaid > 0)) {
        const cashAccountId = paymentMode === 'cash' 
          ? defaultAccountId! 
          : await getDefaultCashAccount(currentShop.id).then(a => a?.id);
        
        if (cashAccountId) {
          const payment = await database.get<Payment>('payments').create(p => {
            p.transactionId = newTransaction.id;
            p.referenceNumber= `REF-${newTransaction.id}`
            p.shopId = currentShop.id;
            p.paymentMethodId = 'cash';
            p.cashAccountId = cashAccountId;
            p.amount = amountPaid;
            p.paymentDate = Date.now();
            p.notes = paymentMode === 'credit' ? 'Partial payment for credit sale' : 'Cash payment for sale';
            p.recordedBy = user.id;
          });

          const cashAccount = await database.get<CashAccount>('cash_accounts').find(cashAccountId);
          await cashAccount.update(account => {
            account.currentBalance = (account.currentBalance || 0) + amountPaid;
          });

          await database.get<AccountTransaction>('account_transactions').create(at => {
            at.shopId = currentShop.id;
            at.cashAccountId = cashAccountId;
            at.transactionId = newTransaction.id;
            at.paymentId = payment.id;
            at.type = 'deposit';
            at.amount = amountPaid;
            at.balanceBefore = cashAccount.currentBalance - amountPaid;
            at.balanceAfter = cashAccount.currentBalance;
            at.description = `Sale payment - ${newTransaction.transactionNumber}`;
            at.transactionDate = Date.now();
            at.recordedBy = user.id;
          });
        }
      }

      if (balanceDue > 0) {
        const receivableAccount = await database.get<CashAccount>('cash_accounts').find(receivableAccountId!);
        
        await database.get<AccountTransaction>('account_transactions').create(at => {
          at.shopId = currentShop.id;
          at.cashAccountId = receivableAccountId!;
          at.transactionId = newTransaction.id;
          at.type = 'receivable';
          at.amount = balanceDue;
          at.balanceBefore = receivableAccount.currentBalance;
          at.balanceAfter = receivableAccount.currentBalance + balanceDue;
          at.description = `Credit portion for sale to ${customers.find(c => c.id === selectedCustomer)?.name || 'customer'}`;
          at.transactionDate = Date.now();
          at.recordedBy = user.id;
        });

        await receivableAccount.update(account => {
          account.currentBalance = (account.currentBalance || 0) + balanceDue;
        });
      }

      return newTransaction;
    });

    for (const item of cart) {
      const product = products.find(p => p.id === item.productId)!;
      const timestamp = Date.now();
      const referenceId = `${timestamp}-${item.productId}`;

      const productQuantity = (item.baseUnit === 'piece' || item.baseUnit === 'unite')
        ? item.quantity
        : product.convertToBaseUnit(item.quantity, item.unit);
      
      await StockService.recordMovement({
        productId: item.productId,
        shopId: currentShop.id,
        quantity: productQuantity,
        movementType: 'SALE',
        customerId: paymentMode === 'credit' ? selectedCustomer : undefined,
        referenceId: referenceId,
        notes: `Sale - ${item.quantity} ${product.sellingUnit} of ${product.name}`,
        recordedBy: user.id,
        timestamp: timestamp
      });
    }

    clearCart(); // Clear cart after successful transaction
    return transaction;
  }, [currentShop, user, paymentMode, selectedCustomer, totalAmount, finalTotal, dueDate, creditTerms, cart, products, customers, creditPaymentAmount, clearCart]);

  const processSale = useCallback(async () => {
    if (!validateSale()) return;

    setIsProcessingSale(true);

    try {
      if (isOffline) {
        await saveSaleToQueue();
      } else {
        await processSaleTransaction();

        const customerName = customers.find(c => c.id === selectedCustomer)?.name || 'Customer';

        if (paymentMode === 'cash') {
          onSuccess({
            title: 'Sale Completed',
            description: `Total amount: ₣${(finalTotal - creditPaymentAmount).toLocaleString('fr-FR')}`,
            variant: 'success',
            icon: 'cash-outline',
          });
        } else {
          onSuccess({
            title: 'Credit Sale Recorded',
            description: `${customerName} owes ₣${(finalTotal - creditPaymentAmount).toLocaleString('fr-FR')}`,
            variant: 'info',
            icon: 'person-circle-outline',
          });
        }
      }
    } catch (error: any) {
      console.error('Error recording sale:', error);
      onError(error);
    } finally {
      setIsProcessingSale(false);
    }
  }, [validateSale, isOffline, saveSaleToQueue, processSaleTransaction, paymentMode, finalTotal, customers, selectedCustomer, creditPaymentAmount, onSuccess, onError]);

  return {
    paymentMode,
    setPaymentMode,
    selectedCustomer,
    setSelectedCustomer,
    dueDate,
    setDueDate,
    creditTerms,
    setCreditTerms,
    creditPaymentAmount,
    setCreditPaymentAmount,
    showDatePickerModal,
    setShowDatePickerModal,
    isProcessingSale,
    processSale,
    validateSale,
    totalAmount,
    finalTotal,
  };
}