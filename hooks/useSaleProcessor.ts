// // hooks/useSaleProcessor.ts
// import { useState, useCallback } from 'react';
// import { Alert } from 'react-native';
// import { StockService } from '@/services/stockServices';
// import database from '@/database';
// import { Q } from '@nozbe/watermelondb';
// import { Product } from '@/database/models/Product';
// import { Contact } from '@/database/models/Contact';
// import { CashAccount } from '@/database/models/CashAccount';
// import { AccountTransaction } from '@/database/models/AccountTransaction';
// import { Payment } from '@/database/models/Payment';
// import Transaction from '@/database/models/Transaction';
// import { CartItem, PaymentMode } from '@/types/sales';

// interface UseSaleProcessorProps {
//   cart: CartItem[];
//   products: Product[];
//   customers: Contact[];
//   currentShop: any;
//   user: any;
//   clearCart: () => void;
//   onSuccess: (data: any) => void;
//   onError: (error: any) => void;
//   setCart?: (cart: CartItem[]) => void;
// }

// export function useSaleProcessor({
//   cart,
//   products,
//   customers,
//   currentShop,
//   user,
//   clearCart,
//   onSuccess,
//   onError,
//   setCart
// }: UseSaleProcessorProps) {
//   const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
//   const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
//   const [dueDate, setDueDate] = useState<number | null>(null);
//   const [creditTerms, setCreditTerms] = useState('');
//   const [creditPaymentAmount, setCreditPaymentAmount] = useState<number>(0);
//   const [showDatePickerModal, setShowDatePickerModal] = useState(false);
//   const [isProcessingSale, setIsProcessingSale] = useState(false);

//   const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
//   const finalTotal = totalAmount;

//   const validateSale = useCallback((): boolean => {
//     if (cart.length === 0) {
//       Alert.alert('Error', 'Cart is empty');
//       return false;
//     }
    
//     if (paymentMode === 'credit' && !selectedCustomer) {
//       Alert.alert('Error', 'Please select a customer for credit sale');
//       return false;
//     }
    
//     for (const item of cart) {
//       const product = products.find(p => p.id === item.productId);
//       if (!product) continue;
      
//       if (item.baseQuantity > (product.stockQuantity || 0)) {
//         Alert.alert(
//           'Insufficient Stock',
//           `${item.productName} only has ${product.formattedCurrentStock} available`
//         );
//         return false;
//       }
//     }
    
//     return true;
//   }, [cart, paymentMode, selectedCustomer, products]);

//   const generateTransactionNumber = (): string => {
//     const date = new Date();
//     const year = date.getFullYear().toString().slice(-2);
//     const month = (date.getMonth() + 1).toString().padStart(2, '0');
//     const day = date.getDate().toString().padStart(2, '0');
//     const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//     return `INV-${year}${month}${day}-${random}`;
//   };

//   const getDefaultCashAccount = async (shopId: string): Promise<CashAccount | null> => {
//     const accounts = await database.get<CashAccount>('cash_accounts')
//       .query(
//         Q.where('shop_id', shopId),
//         Q.where('is_default', true),
//         Q.where('is_active', true)
//       )
//       .fetch();
    
//     return accounts.length > 0 ? accounts[0] : null;
//   };

//   const getOrCreateReceivableAccount = async (shopId: string): Promise<CashAccount> => {
//     const existing = await database.get<CashAccount>('cash_accounts')
//       .query(
//         Q.where('shop_id', shopId),
//         Q.where('type', 'receivable'),
//         Q.where('is_active', true)
//       )
//       .fetch();

//     if (existing.length > 0) {
//       return existing[0];
//     }

//     return await database.write(async () => {
//       return await database.get<CashAccount>('cash_accounts').create(account => {
//         account.shopId = shopId;
//         account.name = user?.displayName 
//           ? `${user.displayName.split(' ')[0]} RECEIVABLES` 
//           : `${currentShop?.name.toUpperCase()} RECEIVABLES`;
//         account.type = 'receivable';
//         account.openingBalance = 0;
//         account.currentBalance = 0;
//         account.currency = 'BIF';
//         account.isDefault = false;
//         account.isActive = true;
//       });
//     });
//   };

//   // Helper function to create account transaction with automatic balance update
//   const createAccountTransaction = async (
//     cashAccountId: string,
//     transactionId: string,
//     paymentId: string | undefined,
//     type: string,
//     amount: number,
//     description: string,
//     category: string,
//     reference: string
//   ) => {
//     const cashAccount = await database.get<CashAccount>('cash_accounts').find(cashAccountId);
//     const balanceBefore = cashAccount.currentBalance || 0;
    
//     // Calculate new balance based on transaction type
//     let balanceAfter = balanceBefore;
//     if (type === 'income' || type === 'deposit' || type === 'receivable') {
//       balanceAfter = balanceBefore + amount;
//     } else if (type === 'expense' || type === 'withdrawal' || type === 'receivable_payment') {
//       balanceAfter = balanceBefore - amount;
//     }

//     // Create account transaction record
//     await database.get<AccountTransaction>('account_transactions').create(at => {
//       at.shopId = currentShop!.id;
//       at.cashAccountId = cashAccountId;
//       at.transactionId = transactionId;
//       at.paymentId = paymentId;
//       at.type = type;
//       at.amount = amount;
//       at.balanceBefore = balanceBefore;
//       at.balanceAfter = balanceAfter;
//       at.description = description;
//       at.category = category;
//       at.reference = reference;
//       at.transactionDate = Date.now();
//       at.recordedBy = user!.id;
//     });

//     // Update account balance
//     await cashAccount.update(account => {
//       account.currentBalance = balanceAfter;
//     });

//     return { balanceBefore, balanceAfter };
//   };

//   const processSaleTransaction = useCallback(async () => {
//     if (!currentShop || !user) throw new Error('Missing shop or user');

//     // Get default cash account for payments
//     const defaultCashAccount = await getDefaultCashAccount(currentShop.id);
//     if (!defaultCashAccount && paymentMode === 'cash') {
//       throw new Error('No default cash account found. Please set a default account in settings.');
//     }

//     // Get or create receivable account for credit sales
//     let receivableAccount: CashAccount | null = null;
//     if (paymentMode === 'credit') {
//       receivableAccount = await getOrCreateReceivableAccount(currentShop.id);
//     }

//     const amountPaid = paymentMode === 'cash' ? finalTotal : creditPaymentAmount;
//     const balanceDue = finalTotal - amountPaid;
//     const paymentStatus = balanceDue <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'due');

//     const transaction = await database.write(async () => {
//       // Create the main transaction
//       const newTransaction = await database.get<Transaction>('transactions').create(t => {
//         t.shopId = currentShop.id;
//         t.transactionType = 'sale';
//         t.transactionNumber = generateTransactionNumber();
//         t.contactId = paymentMode === 'credit' ? selectedCustomer ?? null : null;
//         t.subtotal = totalAmount;
//         t.taxAmount = 0;
//         t.discountAmount = 0;
//         t.totalAmount = finalTotal;
//         t.amountPaid = amountPaid;
//         t.balanceDue = balanceDue;
//         t.paymentStatus = paymentStatus;
//         t.transactionDate = Date.now();
//         t.dueDate = dueDate || undefined;
//         t.recordedBy = user.id;
//         t.notes = creditTerms || '';
        
//         // Set account references for easier querying
//         if (paymentMode === 'cash') {
//           t.destinationAccountId = defaultCashAccount!.id;
//         } else if (paymentMode === 'credit') {
//           t.sourceAccountId = receivableAccount!.id;
//         }
//       });

//       // ============================================
//       // CASE 1: CASH SALE
//       // ============================================
//       if (paymentMode === 'cash') {
//         // Create account transaction for the sale (income)
//         await createAccountTransaction(
//           defaultCashAccount!.id,
//           newTransaction.id,
//           undefined,
//           'income',
//           finalTotal,
//           `Sale - ${newTransaction.transactionNumber}`,
//           'sales',
//           newTransaction.transactionNumber
//         );
        
//         // Create payment record
//         await database.get<Payment>('payments').create(p => {
//           p.transactionId = newTransaction.id;
//           p.referenceNumber = `PAY-${newTransaction.id}`;
//           p.shopId = currentShop.id;
//           p.paymentMethodId = 'cash';
//           p.cashAccountId = defaultCashAccount!.id;
//           p.amount = finalTotal;
//           p.paymentDate = Date.now();
//           p.notes = 'Cash payment for sale';
//           p.recordedBy = user.id;
//         });

//         // Link payment to account transaction (optional, for reference)
//         // You could update the account transaction with paymentId if needed
//       }
      
//       // ============================================
//       // CASE 2: CREDIT SALE (Full credit, no payment)
//       // ============================================
//       else if (paymentMode === 'credit' && amountPaid === 0) {
//         // Record the full credit sale as receivable
//         await createAccountTransaction(
//           receivableAccount!.id,
//           newTransaction.id,
//           undefined,
//           'receivable',
//           finalTotal,
//           `Credit sale to ${customers.find(c => c.id === selectedCustomer)?.name || 'customer'} - ${newTransaction.transactionNumber}`,
//           'sales',
//           newTransaction.transactionNumber
//         );
//       }
      
//       // ============================================
//       // CASE 3: CREDIT SALE WITH PARTIAL PAYMENT
//       // ============================================
//       else if (paymentMode === 'credit' && amountPaid > 0) {
//         // 3.1: Record the full credit sale as receivable
//         await createAccountTransaction(
//           receivableAccount!.id,
//           newTransaction.id,
//           undefined,
//           'receivable',
//           finalTotal,
//           `Credit sale to ${customers.find(c => c.id === selectedCustomer)?.name || 'customer'} - ${newTransaction.transactionNumber}`,
//           'sales',
//           newTransaction.transactionNumber
//         );
        
//         // 3.2: Create payment record for partial payment
//         const payment = await database.get<Payment>('payments').create(p => {
//           p.transactionId = newTransaction.id;
//           p.referenceNumber = `PAY-${newTransaction.id}`;
//           p.shopId = currentShop.id;
//           p.paymentMethodId = 'cash';
//           p.cashAccountId = defaultCashAccount!.id;
//           p.amount = amountPaid;
//           p.paymentDate = Date.now();
//           p.notes = `Partial payment for credit sale - ${newTransaction.transactionNumber}`;
//           p.recordedBy = user.id;
//         });
        
//         // 3.3: Record cash deposit for the payment
//         await createAccountTransaction(
//           defaultCashAccount!.id,
//           newTransaction.id,
//           payment.id,
//           'deposit',
//           amountPaid,
//           `Partial payment received for credit sale - ${newTransaction.transactionNumber}`,
//           'payment',
//           newTransaction.transactionNumber
//         );
        
//         // 3.4: Reduce receivable balance (negative amount to decrease)
//         await createAccountTransaction(
//           receivableAccount!.id,
//           newTransaction.id,
//           payment.id,
//           'receivable_payment',
//           amountPaid, // This will be subtracted in the helper
//           `Payment received for credit sale - ${newTransaction.transactionNumber}`,
//           'payment',
//           newTransaction.transactionNumber
//         );
//       }

//       // ============================================
//       // UPDATE STOCK MOVEMENTS
//       // ============================================
//       for (const item of cart) {
//         const product = products.find(p => p.id === item.productId)!;
//         const timestamp = Date.now();
//         const referenceId = `${timestamp}-${item.productId}`;

//         const productQuantity = (item.baseUnit === 'piece' || item.baseUnit === 'unite')
//           ? item.quantity
//           : product.convertToBaseUnit(item.quantity, item.unit);
        
//         await StockService.recordMovement({
//           productId: item.productId,
//           shopId: currentShop.id,
//           quantity: productQuantity,
//           movementType: 'SALE',
//           customerId: paymentMode === 'credit' ? selectedCustomer : undefined,
//           referenceId: referenceId,
//           notes: `Sale - ${item.quantity} ${product.sellingUnit} of ${product.name}`,
//           recordedBy: user.id,
//           timestamp: timestamp
//         });
//       }

//       return newTransaction;
//     });

//     // Clear cart after successful transaction
//     if (setCart) {
//       setCart([]);
//     }
    
//     return transaction;
//   }, [currentShop, user, paymentMode, selectedCustomer, totalAmount, finalTotal, dueDate, creditTerms, cart, products, customers, creditPaymentAmount]);

//   const processSale = useCallback(async () => {
//     if (!validateSale()) return;

//     setIsProcessingSale(true);

//     try {
//       await processSaleTransaction();

//       const customerName = customers.find(c => c.id === selectedCustomer)?.name || 'Customer';

//       if (paymentMode === 'cash') {
//         onSuccess({
//           title: 'Sale Completed',
//           description: `Total amount: ${finalTotal.toLocaleString()} BIF`,
//           variant: 'success',
//           icon: 'cash-outline',
//         });
//       } else {
//         const balanceDue = finalTotal - creditPaymentAmount;
//         onSuccess({
//           title: 'Credit Sale Recorded',
//           description: `${customerName} owes ${balanceDue.toLocaleString()} BIF`,
//           variant: 'info',
//           icon: 'person-circle-outline',
//         });
//       }
//     } catch (error: any) {
//       console.error('Error recording sale:', error);
//       onError(error);
//     } finally {
//       setIsProcessingSale(false);
//     }
//   }, [validateSale, processSaleTransaction, paymentMode, finalTotal, customers, selectedCustomer, creditPaymentAmount, onSuccess, onError]);

//   return {
//     paymentMode,
//     setPaymentMode,
//     selectedCustomer,
//     setSelectedCustomer,
//     dueDate,
//     setDueDate,
//     creditTerms,
//     setCreditTerms,
//     creditPaymentAmount,
//     setCreditPaymentAmount,
//     showDatePickerModal,
//     setShowDatePickerModal,
//     isProcessingSale,
//     processSale,
//     validateSale,
//     totalAmount,
//     finalTotal,
//   };
// }


// hooks/useSaleProcessor.ts
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
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
  clearCart: () => void;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  setCart?: (cart: CartItem[]) => void;
}

export function useSaleProcessor({
  cart,
  products,
  customers,
  currentShop,
  user,
  clearCart,
  onSuccess,
  onError,
  setCart
}: UseSaleProcessorProps) {
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [creditTerms, setCreditTerms] = useState('');
  const [creditPaymentAmount, setCreditPaymentAmount] = useState<number>(0);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const finalTotal = totalAmount;

  const validateSale = useCallback((): boolean => {
    console.log('🔍 Validating sale...');
    
    if (cart.length === 0) {
      console.log('❌ Cart is empty');
      Alert.alert('Error', 'Cart is empty');
      return false;
    }
    
    if (paymentMode === 'credit' && !selectedCustomer) {
      console.log('❌ No customer selected for credit sale');
      Alert.alert('Error', 'Please select a customer for credit sale');
      return false;
    }
    
    for (const item of cart) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        console.log(`❌ Product not found for item: ${item.productId}`);
        continue;
      }
      
      if (item.baseQuantity > (product.stockQuantity || 0)) {
        console.log(`❌ Insufficient stock for ${product.name}: ${item.baseQuantity} > ${product.stockQuantity}`);
        Alert.alert(
          'Insufficient Stock',
          `${item.productName} only has ${product.formattedCurrentStock} available`
        );
        return false;
      }
    }
    
    console.log('✅ Validation passed');
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

  const getDefaultCashAccount = async (shopId: string): Promise<CashAccount | null> => {
    console.log('🔍 Getting default cash account for shop:', shopId);
    try {
      const accounts = await database.get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', shopId),
          Q.where('is_default', true),
          Q.where('is_active', true)
        )
        .fetch();
      
      console.log(`Found ${accounts.length} default cash accounts`);
      return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Error getting default cash account:', error);
      throw error;
    }
  };

  const getOrCreateReceivableAccount = async (shopId: string): Promise<CashAccount> => {
    console.log('🔍 Getting or creating receivable account for shop:', shopId);
    try {
      const existing = await database.get<CashAccount>('cash_accounts')
        .query(
          Q.where('shop_id', shopId),
          Q.where('type', 'receivable'),
          Q.where('is_active', true)
        )
        .fetch();

      if (existing.length > 0) {
        console.log('✅ Found existing receivable account:', existing[0].id);
        return existing[0];
      }

      console.log('📝 Creating new receivable account...');
      return await database.write(async () => {
        return await database.get<CashAccount>('cash_accounts').create(account => {
          account.shopId = shopId;
          account.name = user?.displayName 
            ? `${user.displayName.split(' ')[0]} RECEIVABLES` 
            : `${currentShop?.name.toUpperCase()} RECEIVABLES`;
          account.type = 'receivable';
          account.openingBalance = 0;
          account.currentBalance = 0;
          account.currency = 'BIF';
          account.isDefault = false;
          account.isActive = true;
        });
      });
    } catch (error) {
      console.error('Error getting/creating receivable account:', error);
      throw error;
    }
  };

  // Helper function to create account transaction with automatic balance update
  const createAccountTransaction = async (
    cashAccountId: string,
    transactionId: string,
    paymentId: string | undefined,
    type: string,
    amount: number,
    description: string,
    category: string,
    reference: string
  ) => {
    console.log(`📝 Creating account transaction: ${type} for ${amount}`);
    try {
      const cashAccount = await database.get<CashAccount>('cash_accounts').find(cashAccountId);
      const balanceBefore = cashAccount.currentBalance || 0;
      
      // Calculate new balance based on transaction type
      let balanceAfter = balanceBefore;
      if (type === 'income' || type === 'deposit' || type === 'receivable') {
        balanceAfter = balanceBefore + amount;
      } else if (type === 'expense' || type === 'withdrawal' || type === 'receivable_payment') {
        balanceAfter = balanceBefore - amount;
      }

      // Create account transaction record
      await database.get<AccountTransaction>('account_transactions').create(at => {
        at.shopId = currentShop!.id;
        at.cashAccountId = cashAccountId;
        at.transactionId = transactionId;
        at.paymentId = paymentId;
        at.type = type;
        at.amount = amount;
        at.balanceBefore = balanceBefore;
        at.balanceAfter = balanceAfter;
        at.description = description;
        at.category = category;
        at.reference = reference;
        at.transactionDate = Date.now();
        at.recordedBy = user!.id;
      });

      // Update account balance
      await cashAccount.update(account => {
        account.currentBalance = balanceAfter;
      });

      console.log(`✅ Account transaction created. Balance: ${balanceBefore} -> ${balanceAfter}`);
      return { balanceBefore, balanceAfter };
    } catch (error) {
      console.error('Error creating account transaction:', error);
      throw error;
    }
  };

  const processSaleTransaction = useCallback(async () => {
    console.log('🟢 === STARTING SALE TRANSACTION ===');
    
    if (!currentShop) {
      console.error('❌ No current shop found');
      throw new Error('Missing shop');
    }
    
    if (!user) {
      console.error('❌ No user found');
      throw new Error('Missing user');
    }

    console.log('📊 Transaction details:', {
      shopId: currentShop.id,
      userId: user.id,
      cartItems: cart.length,
      paymentMode,
      finalTotal
    });

    try {
      // Get default cash account for payments
      console.log('🔍 Getting default cash account...');
      const defaultCashAccount = await getDefaultCashAccount(currentShop.id);
      if (!defaultCashAccount && paymentMode === 'cash') {
        console.error('❌ No default cash account found');
        throw new Error('No default cash account found. Please set a default account in settings.');
      }
      console.log('✅ Default cash account found:', defaultCashAccount?.id);

      // Get or create receivable account for credit sales
      let receivableAccount: CashAccount | null = null;
      if (paymentMode === 'credit') {
        console.log('🔍 Getting receivable account for credit sale...');
        receivableAccount = await getOrCreateReceivableAccount(currentShop.id);
        console.log('✅ Receivable account:', receivableAccount.id);
      }

      const amountPaid = paymentMode === 'cash' ? finalTotal : creditPaymentAmount;
      const balanceDue = finalTotal - amountPaid;
      const paymentStatus = balanceDue <= 0 ? 'paid' : (amountPaid > 0 ? 'partial' : 'due');
      
      console.log('💰 Payment details:', {
        amountPaid,
        balanceDue,
        paymentStatus
      });

      console.log('📝 Creating transaction in database...');
      const transaction = await database.write(async () => {
        console.log('🔵 Inside database.write...');
        
        // Create the main transaction
        const transactionNumber = generateTransactionNumber();
        console.log('📄 Transaction number:', transactionNumber);
        
        const newTransaction = await database.get<Transaction>('transactions').create(t => {
          t.shopId = currentShop.id;
          t.transactionType = 'sale';
          t.transactionNumber = transactionNumber;
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
          
          // Set account references for easier querying
          if (paymentMode === 'cash') {
            t.destinationAccountId = defaultCashAccount!.id;
          } else if (paymentMode === 'credit') {
            t.sourceAccountId = receivableAccount!.id;
          }
        });
        
        console.log('✅ Transaction created:', newTransaction.id);

        // ============================================
        // CASE 1: CASH SALE
        // ============================================
        if (paymentMode === 'cash') {
          console.log('💰 Processing cash sale...');
          // Create account transaction for the sale (income)
          await createAccountTransaction(
            defaultCashAccount!.id,
            newTransaction.id,
            undefined,
            'income',
            finalTotal,
            `Sale - ${newTransaction.transactionNumber}`,
            'sales',
            newTransaction.transactionNumber
          );
          
          // Create payment record
          console.log('📝 Creating payment record...');
          await database.get<Payment>('payments').create(p => {
            p.transactionId = newTransaction.id;
            p.referenceNumber = `PAY-${newTransaction.id}`;
            p.shopId = currentShop.id;
            p.paymentMethodId = 'cash';
            p.cashAccountId = defaultCashAccount!.id;
            p.amount = finalTotal;
            p.paymentDate = Date.now();
            p.notes = 'Cash payment for sale';
            p.recordedBy = user.id;
          });
          console.log('✅ Payment record created');
        }
        
        // ============================================
        // CASE 2: CREDIT SALE (Full credit, no payment)
        // ============================================
        else if (paymentMode === 'credit' && amountPaid === 0) {
          console.log('📝 Processing full credit sale...');
          // Record the full credit sale as receivable
          await createAccountTransaction(
            receivableAccount!.id,
            newTransaction.id,
            undefined,
            'receivable',
            finalTotal,
            `Credit sale to ${customers.find(c => c.id === selectedCustomer)?.name || 'customer'} - ${newTransaction.transactionNumber}`,
            'sales',
            newTransaction.transactionNumber
          );
          console.log('✅ Credit sale recorded');
        }
        
        // ============================================
        // CASE 3: CREDIT SALE WITH PARTIAL PAYMENT
        // ============================================
        else if (paymentMode === 'credit' && amountPaid > 0) {
          console.log('📝 Processing credit sale with partial payment...');
          // 3.1: Record the full credit sale as receivable
          await createAccountTransaction(
            receivableAccount!.id,
            newTransaction.id,
            undefined,
            'receivable',
            finalTotal,
            `Credit sale to ${customers.find(c => c.id === selectedCustomer)?.name || 'customer'} - ${newTransaction.transactionNumber}`,
            'sales',
            newTransaction.transactionNumber
          );
          
          // 3.2: Create payment record for partial payment
          console.log('📝 Creating partial payment record...');
          const payment = await database.get<Payment>('payments').create(p => {
            p.transactionId = newTransaction.id;
            p.referenceNumber = `PAY-${newTransaction.id}`;
            p.shopId = currentShop.id;
            p.paymentMethodId = 'cash';
            p.cashAccountId = defaultCashAccount!.id;
            p.amount = amountPaid;
            p.paymentDate = Date.now();
            p.notes = `Partial payment for credit sale - ${newTransaction.transactionNumber}`;
            p.recordedBy = user.id;
          });
          console.log('✅ Payment record created:', payment.id);
          
          // 3.3: Record cash deposit for the payment
          await createAccountTransaction(
            defaultCashAccount!.id,
            newTransaction.id,
            payment.id,
            'deposit',
            amountPaid,
            `Partial payment received for credit sale - ${newTransaction.transactionNumber}`,
            'payment',
            newTransaction.transactionNumber
          );
          
          // 3.4: Reduce receivable balance (negative amount to decrease)
          await createAccountTransaction(
            receivableAccount!.id,
            newTransaction.id,
            payment.id,
            'receivable_payment',
            amountPaid,
            `Payment received for credit sale - ${newTransaction.transactionNumber}`,
            'payment',
            newTransaction.transactionNumber
          );
          console.log('✅ Partial payment processed');
        }

        // ============================================
        // UPDATE STOCK MOVEMENTS
        // ============================================
        console.log('📦 Updating stock movements...');
        for (const item of cart) {
          const product = products.find(p => p.id === item.productId)!;
          const timestamp = Date.now();
          const referenceId = `${timestamp}-${item.productId}`;

          const productQuantity = (item.baseUnit === 'piece' || item.baseUnit === 'unite')
            ? item.quantity
            : product.convertToBaseUnit(item.quantity, item.unit);
          
          console.log(`📦 Recording stock movement for ${product.name}: -${productQuantity}`);
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
        console.log('✅ Stock movements updated');

        return newTransaction;
      });

      console.log('✅ Transaction completed successfully');
      return transaction;
      
    } catch (error) {
      console.error('❌ Error in processSaleTransaction:', error);
      throw error;
    }
  }, [currentShop, user, paymentMode, selectedCustomer, totalAmount, finalTotal, dueDate, creditTerms, cart, products, customers, creditPaymentAmount]);

  const processSale = useCallback(async () => {
    console.log('🟢 === PROCESS SALE STARTED ===');
    console.log('📊 Current state:', {
      cartLength: cart.length,
      paymentMode,
      selectedCustomer,
      finalTotal,
      creditPaymentAmount,
      isProcessingSale
    });
    
    // Set processing state at the beginning
    setIsProcessingSale(true);
    console.log('🔵 isProcessingSale set to true');
    
    try {
      // Step 1: Validate the sale
      console.log('🟡 Validating sale...');
      const isValid = validateSale();
      console.log('Validation result:', isValid);
      
      if (!isValid) {
        console.log('🔴 Validation failed - exiting');
        setIsProcessingSale(false);
        return;
      }
      console.log('✅ Validation passed');

      // Step 2: Process the transaction
      console.log('🟢 Starting transaction processing...');
      const transactionResult = await processSaleTransaction();
      console.log('✅ Transaction completed successfully:', transactionResult?.id);

      // Step 3: Clear cart after successful transaction
      if (setCart) {
        console.log('🧹 Clearing cart...');
        setCart([]);
      }
      
      // Step 4: Prepare success response
      const customerName = customers.find(c => c.id === selectedCustomer)?.name || 'Customer';
      console.log('👤 Customer:', customerName);

      if (paymentMode === 'cash') {
        console.log('💰 Cash sale completed');
        onSuccess({
          title: 'Sale Completed',
          description: `Total amount: ${finalTotal.toLocaleString()} BIF`,
          variant: 'success',
          icon: 'cash-outline',
        });
      } else {
        const balanceDue = finalTotal - creditPaymentAmount;
        console.log('📝 Credit sale recorded, balance due:', balanceDue);
        onSuccess({
          title: 'Credit Sale Recorded',
          description: `${customerName} owes ${balanceDue.toLocaleString()} BIF`,
          variant: 'info',
          icon: 'person-circle-outline',
        });
      }
      
      console.log('🎉 Sale process completed successfully');
      
    } catch (error: any) {
      console.error('❌ === ERROR IN PROCESS SALE ===');
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Call onError with the error
      onError(error);
      
    } finally {
      // Always reset processing state
      console.log('🔴 Resetting isProcessingSale to false');
      setIsProcessingSale(false);
      console.log('🏁 === PROCESS SALE ENDED ===');
    }
  }, [
    validateSale, 
    processSaleTransaction, 
    paymentMode, 
    finalTotal, 
    customers, 
    selectedCustomer, 
    creditPaymentAmount, 
    onSuccess, 
    onError,
    setCart,
    cart.length
  ]);

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