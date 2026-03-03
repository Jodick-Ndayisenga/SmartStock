// app/(tabs)/sales.tsx
import database from '@/database';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { withObservables } from '@nozbe/watermelondb/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { ThemedText } from '@/components/ui/ThemedText';
import CustomDialog from '@/components/ui/CustomDialog';

// Models
import { Contact } from '@/database/models/Contact';
import { Product } from '@/database/models/Product';
import { CashAccount } from '@/database/models/CashAccount';
import Transaction from '@/database/models/Transaction';
import { Payment } from '@/database/models/Payment';
import { AccountTransaction } from '@/database/models/AccountTransaction';

// Services
import { getDefaultCashAccount, getOrCreateReceivableAccount } from '@/services/cashAccountService';
import { StockService } from '@/services/stockServices';
import { SaleQueueService } from '@/services/saleQueueService';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from 'nativewind';

// Types
type StockStatus = 'in-stock' | 'low-stock' | 'out-of-stock';
type PaymentMode = 'cash' | 'credit';
type ViewMode = 'grid' | 'list';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  imageUrl?: string;
  baseUnit: string;
  unitType: string;
  baseQuantity: number;
}

interface QuickAmount {
  label: string;
  value: number;
  unit?: string;
  baseQuantity: number;
  isAvailable: boolean;
}

interface QueuedSale {
  id: string;
  cart: CartItem[];
  paymentMode: PaymentMode;
  selectedCustomer: string | null;
  dueDate: number | null;
  creditTerms: string;
  creditPaymentAmount: number;
  totalAmount: number;
  timestamp: number;
  shopId: string;
  userId: string;
}

interface SalesScreenProps {
  products?: Product[];
  customers?: Contact[];
}

// Enhanced with observables
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }: { currentShop: any }) => {
    if (!currentShop) {
      return {
        products: [],
        customers: [],
      };
    }

    return {
      products: database
        .get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      customers: database
        .get<Contact>('contacts')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.or(
            Q.where('role', 'customer'),
            Q.where('role', 'client'),
            Q.where('role', 'both')
          )
        )
        .observe(),
    };
  }
);

// Inner component with observable data
const SalesScreenInner = ({ 
  products = [],
  customers = []
}: SalesScreenProps) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { currentShop, user, tempSelectedContact, setTempSelectedContact } = useAuth();
  
  // State
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [quickAmounts, setQuickAmounts] = useState<QuickAmount[]>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  
  // Animation
  const cartAnimation = useRef(new Animated.Value(0)).current;
  
  // Processing states
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedSales, setQueuedSales] = useState<QueuedSale[]>([]);

  // Payment & Credit State
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<number | null>(null);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [creditTerms, setCreditTerms] = useState('');
  const [creditPaymentAmount, setCreditPaymentAmount] = useState<number>(0);
  
  // UI State
  const [successDialogData, setSuccessDialogData] = useState<{
    title: string;
    description: string;
    variant: 'success' | 'info' | 'warning' | 'error';
    icon: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Derived values
  const productIdFromParams = params.productId as string;
  const isDark = colorScheme === 'dark';

  // Listen for contact selection
  useEffect(() => {
    if (tempSelectedContact) {
      setSelectedCustomer(tempSelectedContact);
      setTempSelectedContact(null);
    }
  }, [tempSelectedContact, setTempSelectedContact]);

  // Setup network listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) {
        processQueuedSales();
      }
    });

    loadQueuedSales();

    return () => unsubscribe();
  }, []);

  // Handle product from params
  useEffect(() => {
    if (productIdFromParams && products.length > 0) {
      const product = products.find(p => p.id === productIdFromParams);
      if (product) {
        setSelectedProduct(product);
        setSelectedUnit(product.sellingUnit || product.baseUnit);
        generateQuickAmounts(product);
      }
    }
  }, [productIdFromParams, products]);

  // Search and filter effect
  useEffect(() => {
    if (!products.length) return;
    
    const filtered = products.filter(product => {
      const matchesSearch = searchQuery.trim() === '' ? true :
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
    
    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  // Memoized calculations
  const totalAmount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.totalPrice, 0),
    [cart]
  );

  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const categories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[],
    [products]
  );

  const cartTax = 0;
  const cartDiscount = 0;
  const finalTotal = totalAmount + cartTax - cartDiscount;

  // Generate transaction number
  const generateTransactionNumber = useCallback((): string => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `INV-${year}${month}${day}-${random}`;
  }, []);

  // Load queued sales
  const loadQueuedSales = useCallback(async () => {
    const sales = await SaleQueueService.getQueuedSales();
    setQueuedSales(sales);
  }, []);

  // Process queued sales
  const processQueuedSales = useCallback(async () => {
    const sales = await SaleQueueService.getQueuedSales();
    for (const sale of sales) {
      try {
        await processSaleTransaction(sale);
        await SaleQueueService.removeQueuedSale(sale.id);
      } catch (error) {
        console.error('Failed to process queued sale:', error);
      }
    }
    await loadQueuedSales();
  }, []);

  // Generate quick amounts
  const generateQuickAmounts = useCallback((product: Product) => {
    const amounts: QuickAmount[] = [];
    const stockInBaseUnits = product.stockQuantity || 0;

    switch (product.unitType) {
      case 'weight':
        [0.25, 0.5, 1, 2, 5].forEach(amt => {
          const baseQuantity = product.convertToBaseUnit(amt, 'kg');
          amounts.push({
            label: amt >= 1 ? `${amt}kg` : `${amt * 1000}g`,
            value: amt,
            unit: 'kg',
            baseQuantity,
            isAvailable: baseQuantity <= stockInBaseUnits
          });
        });
        break;
      case 'volume':
        [0.25, 0.5, 1, 2, 5].forEach(amt => {
          const baseQuantity = product.convertToBaseUnit(amt, 'l');
          amounts.push({
            label: amt >= 1 ? `${amt}L` : `${amt * 1000}ml`,
            value: amt,
            unit: 'l',
            baseQuantity,
            isAvailable: baseQuantity <= stockInBaseUnits
          });
        });
        break;
      case 'length':
        [1, 2, 5, 10, 20].forEach(amt => {
          const baseQuantity = product.convertToBaseUnit(amt, 'm');
          amounts.push({
            label: `${amt}m`,
            value: amt,
            unit: 'm',
            baseQuantity,
            isAvailable: baseQuantity <= stockInBaseUnits
          });
        });
        break;
      case 'piece':
      default:
        [1, 2, 5, 10, 20].forEach(amt => {
          amounts.push({
            label: amt.toString(),
            value: amt,
            unit: 'piece',
            baseQuantity: amt,
            isAvailable: amt <= stockInBaseUnits
          });
        });
        break;
    }

    setQuickAmounts(amounts);
  }, []);

  // Validate quantity
  const validateQuantity = useCallback((
    product: Product,
    qty: number,
    unit: string
  ): { isValid: boolean; baseQuantity: number; error?: string } => {
    if (isNaN(qty) || qty <= 0) {
      return { isValid: false, baseQuantity: 0, error: 'Please enter a valid quantity' };
    }

    if (product.baseUnit === 'piece' || product.baseUnit === 'unite') {
      if (qty > (product.stockQuantity || 0)) {
        return {
          isValid: false,
          baseQuantity: qty,
          error: `Only ${product.stockQuantity || 0} ${unit} available`
        };
      }
      return { isValid: true, baseQuantity: qty };
    }

    const baseQuantity = product.convertToBaseUnit(qty, unit);
    const currentStock = product.stockQuantity || 0;

    if (baseQuantity > currentStock) {
      const availableInSelectedUnit = product.convertBaseToSellingUnits(currentStock);
      return {
        isValid: false,
        baseQuantity,
        error: `Only ${availableInSelectedUnit.toFixed(2)} ${unit} available`
      };
    }

    return { isValid: true, baseQuantity };
  }, []);

  // Calculate price
  const calculatePrice = useCallback((
    product: Product,
    qty: number,
    unit: string
  ): number => {
    if (unit === product.baseUnit || product.baseUnit === 'piece' || product.baseUnit === 'unite') {
      return qty * product.sellingPricePerBase;
    }

    const baseQuantity = product.convertToBaseUnit(qty, unit);
    return baseQuantity * product.sellingPricePerBase;
  }, []);

  // Get product stock status
  const getProductStockStatus = useCallback((product: Product): StockStatus => {
    const stock = product.stockQuantity || 0;
    if (stock <= 0) return 'out-of-stock';
    if (stock <= (product.lowStockThreshold || 10)) return 'low-stock';
    return 'in-stock';
  }, []);

  // Format unit with quantity
  const formatUnitWithQuantity = useCallback((
    product: Product,
    quantity: number,
    unit: string
  ): string => {
    if (unit === product.baseUnit || product.baseUnit === 'piece' || product.baseUnit === 'unite') {
      return `${quantity} ${unit}`;
    }
    
    const baseQuantity = product.convertToBaseUnit(quantity, unit);
    return `${quantity} ${unit} (${baseQuantity.toFixed(2)} ${product.baseUnit})`;
  }, []);

  // Add to cart
  const addToCart = useCallback(async () => {
    if (!selectedProduct || !quantity || !currentShop) return;

    const qty = parseFloat(quantity);
    const validation = validateQuantity(selectedProduct, qty, selectedUnit);
    
    if (!validation.isValid) {
      Alert.alert('Error', validation.error);
      return;
    }

    const totalPrice = calculatePrice(selectedProduct, qty, selectedUnit);
    
    setCart(prev => {
      const itemId = `${selectedProduct.id}-${selectedUnit}`;
      const existingItem = prev.find(item => item.id === itemId);
      
      if (existingItem) {
        return prev.map(item =>
          item.id === itemId
            ? {
                ...item,
                quantity: item.quantity + qty,
                totalPrice: item.totalPrice + totalPrice,
                baseQuantity: item.baseQuantity + validation.baseQuantity
              }
            : item
        );
      } else {
        return [...prev, {
          id: itemId,
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: qty,
          unit: selectedUnit,
          pricePerUnit: selectedProduct.sellingPricePerBase,
          totalPrice,
          imageUrl: selectedProduct.imageUrl,
          baseUnit: selectedProduct.baseUnit,
          unitType: selectedProduct.unitType,
          baseQuantity: validation.baseQuantity
        }];
      }
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.sequence([
      Animated.timing(cartAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cartAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    resetProductSelection();
  }, [selectedProduct, quantity, selectedUnit, currentShop, validateQuantity, calculatePrice, cartAnimation]);

  // Quick add to cart
  const quickAddToCart = useCallback(async (product: Product, amount: QuickAmount) => {
    setAddingToCart(product.id);
    
    try {
      if (!amount.isAvailable) {
        Alert.alert('Error', `Only ${product.formattedCurrentStock} available`);
        return;
      }

      const totalPrice = calculatePrice(
        product,
        amount.value,
        amount.unit || product.sellingUnit || product.baseUnit
      );
      
      setCart(prev => {
        const itemId = `${product.id}-${amount.unit || product.sellingUnit}`;
        const existingItem = prev.find(item => item.id === itemId);
        
        if (existingItem) {
          return prev.map(item =>
            item.id === itemId
              ? {
                  ...item,
                  quantity: item.quantity + amount.value,
                  totalPrice: item.totalPrice + totalPrice,
                  baseQuantity: item.baseQuantity + amount.baseQuantity
                }
              : item
          );
        } else {
          return [...prev, {
            id: itemId,
            productId: product.id,
            productName: product.name,
            quantity: amount.value,
            unit: amount.unit || product.sellingUnit || product.baseUnit,
            pricePerUnit: product.sellingPricePerBase,
            totalPrice,
            imageUrl: product.imageUrl,
            baseUnit: product.baseUnit,
            unitType: product.unitType,
            baseQuantity: amount.baseQuantity
          }];
        }
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.sequence([
        Animated.timing(cartAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cartAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } finally {
      setAddingToCart(null);
    }
  }, [calculatePrice, cartAnimation]);

  // Reset product selection
  const resetProductSelection = useCallback(() => {
    setSelectedProduct(null);
    setQuantity('');
    setSelectedUnit('');
    setQuickAmounts([]);
  }, []);

  // Remove from cart
  const removeFromCart = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Update cart quantity
  const updateCartQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setCart(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const product = products.find(p => p.id === item.productId);
          if (!product) return item;

          let baseQuantity = 0;

          if (product.baseUnit === 'piece' || product.baseUnit === 'unite') {
            baseQuantity = newQuantity;
          } else {
            baseQuantity = product.convertToBaseUnit(newQuantity, item.unit);
          }
          
          const totalPrice = calculatePrice(product, newQuantity, item.unit);
          
          return {
            ...item,
            quantity: newQuantity,
            totalPrice,
            baseQuantity
          };
        }
        return item;
      })
    );
  }, [products, calculatePrice, removeFromCart]);

  // Clear cart
  const clearCart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => setCart([])
        },
      ]
    );
  }, []);

  // Validate sale
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

  // Save sale to queue
  const saveSaleToQueue = useCallback(async () => {
    if (!currentShop || !user) return;

    const queuedSale: QueuedSale = {
      id: `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      cart,
      paymentMode,
      selectedCustomer,
      dueDate,
      creditTerms,
      creditPaymentAmount,
      totalAmount: finalTotal,
      timestamp: Date.now(),
      shopId: currentShop.id,
      userId: user.id,
    };

    await SaleQueueService.saveQueuedSale(queuedSale);
    await loadQueuedSales();
    
    setCart([]);
    setSelectedCustomer(null);
    setDueDate(null);
    setCreditTerms('');
    setCreditPaymentAmount(0);
    
    Alert.alert(
      'Sale Queued',
      'Your sale has been saved and will be processed when online.',
      [{ text: 'OK' }]
    );
  }, [cart, paymentMode, selectedCustomer, dueDate, creditTerms, creditPaymentAmount, finalTotal, currentShop, user, loadQueuedSales]);

  // Process sale transaction
  const processSaleTransaction = useCallback(async (saleData?: QueuedSale) => {
    if (!currentShop || !user) throw new Error('Missing shop or user');

    const saleCart = saleData?.cart || cart;
    const salePaymentMode = saleData?.paymentMode || paymentMode;
    const saleSelectedCustomer = saleData?.selectedCustomer || selectedCustomer;
    const saleDueDate = saleData?.dueDate || dueDate;
    const saleCreditTerms = saleData?.creditTerms || creditTerms;
    const saleCreditPaymentAmount = saleData?.creditPaymentAmount || creditPaymentAmount;
    const saleTotalAmount = saleData?.totalAmount || finalTotal;
    const saleSubtotal = saleCart.reduce((sum, item) => sum + item.totalPrice, 0);

    // Get accounts
    let defaultAccountId;
    let receivableAccountId;

    if (salePaymentMode === 'cash') {
      const defaultAccount = await getDefaultCashAccount(currentShop.id);
      if (!defaultAccount) {
        throw new Error('No default cash account found');
      }
      defaultAccountId = defaultAccount.id;
    } else {
      const receivableAccount = await getOrCreateReceivableAccount(currentShop.id);
      receivableAccountId = receivableAccount.id;
    }

    // Calculate amounts
    const amountPaid = salePaymentMode === 'cash' 
      ? saleTotalAmount 
      : (saleCreditPaymentAmount || 0);
    
    const balanceDue = saleTotalAmount - amountPaid;
    const paymentStatus = balanceDue <= 0 
      ? 'paid' 
      : (amountPaid > 0 ? 'partial' : 'due');

    // Create transaction
    const transaction = await database.write(async () => {
      const newTransaction = await database.get<Transaction>('transactions').create(t => {
        t.shopId = currentShop.id;
        t.transactionType = 'sale';
        t.transactionNumber = generateTransactionNumber();
        t.contactId = salePaymentMode === 'credit' ? saleSelectedCustomer ?? null : null;
        t.subtotal = saleSubtotal;
        t.taxAmount = 0;
        t.discountAmount = 0;
        t.totalAmount = saleTotalAmount;
        t.amountPaid = amountPaid;
        t.balanceDue = balanceDue;
        t.paymentStatus = paymentStatus;
        t.transactionDate = Date.now();
        t.dueDate = saleDueDate || undefined;
        t.recordedBy = user.id;
        t.notes = saleCreditTerms || '';
      });

      // Handle payments
      if (salePaymentMode === 'cash' || (salePaymentMode === 'credit' && amountPaid > 0)) {
        const cashAccountId = salePaymentMode === 'cash' 
          ? defaultAccountId! 
          : await getDefaultCashAccount(currentShop.id).then(a => a?.id);
        
        if (cashAccountId) {
          const payment = await database.get<Payment>('payments').create(p => {
            p.transactionId = newTransaction.id;
            p.shopId = currentShop.id;
            p.paymentMethodId = 'cash';
            p.cashAccountId = cashAccountId;
            p.amount = amountPaid;
            p.paymentDate = Date.now();
            p.notes = salePaymentMode === 'credit' 
              ? 'Partial payment for credit sale' 
              : 'Cash payment for sale';
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

      // Handle receivable
      if (balanceDue > 0 && receivableAccountId) {
        const receivableAccount = await database.get<CashAccount>('cash_accounts').find(receivableAccountId);
        
        await database.get<AccountTransaction>('account_transactions').create(at => {
          at.shopId = currentShop.id;
          at.cashAccountId = receivableAccountId;
          at.transactionId = newTransaction.id;
          at.type = 'receivable';
          at.amount = balanceDue;
          at.balanceBefore = receivableAccount.currentBalance;
          at.balanceAfter = receivableAccount.currentBalance + balanceDue;
          at.description = `Credit portion for sale to ${customers.find(c => c.id === saleSelectedCustomer)?.name || 'customer'}`;
          at.transactionDate = Date.now();
          at.recordedBy = user.id;
        });

        await receivableAccount.update(account => {
          account.currentBalance = (account.currentBalance || 0) + balanceDue;
        });
      }

      return newTransaction;
    });

    // Record stock movements
    for (const item of saleCart) {
      const product = products.find(p => p.id === item.productId);
      if (!product) continue;
      
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
        customerId: salePaymentMode === 'credit' ? saleSelectedCustomer : undefined,
        referenceId,
        notes: `Sale - ${item.quantity} ${product.sellingUnit} of ${product.name}`,
        recordedBy: user.id,
        timestamp
      });
    }

    return transaction;
  }, [currentShop, user, products, customers, generateTransactionNumber]);

  // Process sale
  const processSale = useCallback(async () => {
    if (!validateSale()) return;

    setIsProcessingSale(true);

    try {
      if (isOffline) {
        await saveSaleToQueue();
      } else {
        await processSaleTransaction();

        const customerName = customers.find(c => c.id === selectedCustomer)?.name || t('common.customer');

        if (paymentMode === 'cash') {
          setSuccessDialogData({
            title: t('sales.sale_completed'),
            description: t('sales.total_amount', { amount: finalTotal.toLocaleString('fr-FR') }),
            variant: 'success',
            icon: 'cash-outline',
          });
        } else {
          setSuccessDialogData({
            title: t('sales.credit_sale_recorded'),
            description: t('sales.full_credit_owed', {
              customerName,
              amount: (finalTotal - creditPaymentAmount).toLocaleString('fr-FR'),
            }),
            variant: 'info',
            icon: 'person-circle-outline',
          });
        }

        setCart([]);
        setSelectedCustomer(null);
        setDueDate(null);
        setCreditTerms('');
        setCreditPaymentAmount(0);
      }
    } catch (error: any) {
      console.error('Error recording sale:', error);

      let errorMessage = error.message || t('sales.error_generic');
      
      if (error.message?.includes('insufficient stock')) {
        errorMessage = t('sales.error_insufficient_stock');
      }

      setSuccessDialogData({
        title: t('common.error'),
        description: errorMessage,
        variant: 'error',
        icon: 'alert-circle-outline',
      });
    } finally {
      setIsProcessingSale(false);
    }
  }, [validateSale, isOffline, saveSaleToQueue, processSaleTransaction, paymentMode, finalTotal, creditPaymentAmount, customers, selectedCustomer, t]);

  // If no shop
  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Record Sale" showBackButton />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Create a shop first to record sales"
          action={{
            label: 'Create Shop',
            onPress: () => router.push('/(auth)/create-shop'),
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader
        title="Record Sale"
        showBackButton
        searchable
        searchPlaceholder="Search products..."
        onSearch={setSearchQuery}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1">
          {/* Cart Summary */}
          {cart.length > 0 && (
            <Animated.View
              style={{
                transform: [
                  {
                    scale: cartAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.05],
                    }),
                  },
                ],
              }}
              className="bg-brand/10 border-b border-brand/20"
            >
              <Card variant="filled" className="m-0 border-0">
                <CardContent className="p-4">
                  <View className="flex-row justify-between items-center">
                    <View>
                      <ThemedText variant="brand" size="lg" className="font-semibold">
                        ₣{finalTotal.toLocaleString()}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm">
                        {cart.length} item{cart.length > 1 ? 's' : ''} • {totalItems} units
                      </ThemedText>
                    </View>

                    {/* Payment Mode Toggle */}
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPaymentMode('cash');
                        }}
                        className={`px-4 py-2 rounded-full ${
                          paymentMode === 'cash'
                            ? 'bg-success'
                            : 'bg-surface dark:bg-dark-surface border border-border'
                        }`}
                      >
                        <ThemedText
                          size="sm"
                          className={`font-medium ${paymentMode === 'cash' ? 'text-white' : ''}`}
                        >
                          Cash
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setPaymentMode('credit');
                        }}
                        className={`px-4 py-2 rounded-full ${
                          paymentMode === 'credit'
                            ? 'bg-info'
                            : 'bg-surface dark:bg-dark-surface border border-border'
                        }`}
                      >
                        <ThemedText
                          size="sm"
                          className={`font-medium ${paymentMode === 'credit' ? 'text-white' : ''}`}
                        >
                          Credit
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </Animated.View>
          )}

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="p-2">
              {!selectedProduct ? (
                /* Product Selection */
                <Card variant="elevated" className="mb-4">
                  <CardContent className="p-2">
                    {/* Categories Filter */}
                    {categories.length > 0 && (
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        className="mb-4 -ml-4 pl-4"
                      >
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedCategory(null);
                            }}
                            className={`px-4 py-2 rounded-full ${
                              !selectedCategory 
                                ? 'bg-brand' 
                                : 'bg-surface-soft'
                            }`}
                          >
                            <ThemedText 
                              size="sm" 
                              className={!selectedCategory ? 'text-white' : ''}
                            >
                              All
                            </ThemedText>
                          </TouchableOpacity>
                          {categories.map((category, index) => (
                            <TouchableOpacity
                              key={index}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedCategory(category);
                              }}
                              className={`px-4 py-2 rounded-full ${
                                selectedCategory === category
                                  ? 'bg-brand'
                                  : 'bg-surface-soft'
                              }`}
                            >
                              <ThemedText 
                                size="sm" 
                                className={selectedCategory === category ? 'text-white' : ''}
                              >
                                {category}
                              </ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    )}

                    {/* Product List */}
                    {filteredProducts.length === 0 ? (
                      <EmptyState
                        icon={searchQuery ? "search-outline" : "cube-outline"}
                        title={searchQuery ? "No Results Found" : "No Products Yet"}
                        description={searchQuery 
                          ? `No products matching "${searchQuery}"`
                          : 'Add products to start selling'}
                        action={
                          searchQuery
                            ? [
                                {
                                  label: "Clear Search",
                                  variant: "outline",
                                  onPress: () => setSearchQuery(''),
                                },
                                {
                                  label: `Create "${searchQuery}"`,
                                  variant: "default",
                                  onPress: () => router.push(`/add-product?name=${encodeURIComponent(searchQuery)}`),
                                },
                              ]
                            : [
                                {
                                  label: "Add Your First Product",
                                  variant: "default",
                                  onPress: () => router.push('/add-product'),
                                },
                              ]
                        }
                      />
                    ) : (
                      <View className="mt-2">
                        <View className="flex-row justify-between items-center mb-4">
                          <View>
                            <ThemedText variant="label" className="font-semibold">
                              Available Products
                            </ThemedText>
                            <ThemedText variant="muted" size="sm">
                              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
                              {selectedCategory ? ` in ${selectedCategory}` : ''}
                            </ThemedText>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <TouchableOpacity
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                              }}
                              className="p-2 rounded-lg bg-surface-soft"
                            >
                              <Ionicons 
                                name={viewMode === 'grid' ? 'list' : 'grid'} 
                                size={20} 
                                color="#64748b" 
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => router.push('/add-product')}
                              className="flex-row items-center gap-1 p-2 bg-brand/10 rounded-lg"
                            >
                              <Ionicons name="add" size={18} color={isDark ? '#38bdf8' : '#0ea5e9'} />
                              <ThemedText variant="brand" size="sm" className="font-medium">
                                New
                              </ThemedText>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Product Grid/List */}
                        {viewMode === 'grid' ? (
                          <View className="flex-row flex-wrap">
                            {filteredProducts.map((product, index) => (
                              <TouchableOpacity
                                key={product.id}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setSelectedProduct(product);
                                  setSelectedUnit(product.sellingUnit || product.baseUnit);
                                  generateQuickAmounts(product);
                                }}
                                className={`
                                  w-[48%] 
                                  ${index % 2 === 0 ? 'mr-[4%]' : ''} 
                                  mb-4
                                  bg-surface dark:bg-dark-surface 
                                  rounded-xl 
                                  border border-border 
                                  p-3 
                                  active:scale-[0.98]
                                `}
                              >
                                <View className="w-full h-32 rounded-lg bg-surface-muted items-center justify-center mb-3 overflow-hidden">
                                  {product.imageUrl ? (
                                    <Image
                                      source={{ uri: product.imageUrl }}
                                      className="w-full h-full"
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <View className="w-full h-full items-center justify-center">
                                      <Ionicons name="cube-outline" size={32} color="#64748b" />
                                    </View>
                                  )}
                                  <View className="absolute top-2 right-2 bg-surface-soft rounded-full">
                                    <StockStatusBadge
                                      status={getProductStockStatus(product)}
                                      size="sm"
                                    />
                                  </View>
                                </View>
                                <View>
                                  <ThemedText 
                                    variant="default" 
                                    size="base" 
                                    className="font-semibold mb-1"
                                    numberOfLines={1}
                                  >
                                    {product.name}
                                  </ThemedText>
                                  <ThemedText variant="muted" size="sm" className="mb-1">
                                    Stock: {product.formattedCurrentStock}
                                  </ThemedText>
                                  <ThemedText variant="heading" size="base" className="text-success font-bold">
                                    ₣{product.sellingPricePerBase}
                                    <ThemedText variant="muted" size="xs">
                                      /{product.sellingUnit || product.baseUnit}
                                    </ThemedText>
                                  </ThemedText>
                                </View>
                              </TouchableOpacity>
                            ))}
                          </View>
                        ) : (
                          <View className="gap-2">
                            {filteredProducts.map(product => (
                              <TouchableOpacity
                                key={product.id}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setSelectedProduct(product);
                                  setSelectedUnit(product.sellingUnit || product.baseUnit);
                                  generateQuickAmounts(product);
                                }}
                                className="flex-row items-center p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border active:scale-[0.98]"
                              >
                                <View className="w-12 h-12 rounded-lg bg-surface-muted items-center justify-center mr-3 overflow-hidden">
                                  {product.imageUrl ? (
                                    <Image
                                      source={{ uri: product.imageUrl }}
                                      className="w-full h-full"
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <Ionicons name="cube-outline" size={20} color="#64748b" />
                                  )}
                                </View>
                                <View className="flex-1">
                                  <ThemedText variant="default" size="base" className="font-medium mb-1">
                                    {product.name}
                                  </ThemedText>
                                  <View className="flex-row items-center gap-3">
                                    <ThemedText variant="muted" size="sm">
                                      Stock: {product.formattedCurrentStock}
                                    </ThemedText>
                                    <View className="w-1 h-1 rounded-full bg-border" />
                                    <ThemedText variant="muted" size="sm">
                                      ₣{product.sellingPricePerBase}/{product.sellingUnit || product.baseUnit}
                                    </ThemedText>
                                  </View>
                                </View>
                                <StockStatusBadge
                                  status={getProductStockStatus(product)}
                                  size="sm"
                                />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </CardContent>
                </Card>
              ) : (
                /* Product Details */
                <Card variant="elevated" className="mb-4">
                  <CardHeader
                    title={selectedProduct.name}
                    subtitle="Add quantity to cart"
                    action={
                      <Button
                        variant="destructive"
                        size="sm"
                        onPress={resetProductSelection}
                        icon="close"
                      >
                        Close
                      </Button>
                    }
                  />
                  <CardContent className="p-4">
                    {/* Quick Add */}
                    <View className="mb-6">
                      <ThemedText variant="label" className="mb-3 font-semibold">
                        Quick Add
                      </ThemedText>
                      <View className="flex-row flex-wrap gap-2">
                        {quickAmounts.map((amount, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => quickAddToCart(selectedProduct, amount)}
                            disabled={!amount.isAvailable || addingToCart === selectedProduct.id}
                            className={`px-4 py-3 bg-surface dark:bg-dark-surface rounded-lg border border-border 
                              ${!amount.isAvailable ? 'opacity-40' : ''}
                              ${addingToCart === selectedProduct.id ? 'opacity-50' : ''}`}
                          >
                            {addingToCart === selectedProduct.id ? (
                              <ActivityIndicator size="small" color="#64748b" />
                            ) : (
                              <>
                                <ThemedText variant="default" size="base" className="font-medium text-center">
                                  {amount.label}
                                </ThemedText>
                                <ThemedText variant="muted" size="xs" className="text-center mt-1">
                                  ₣{calculatePrice(selectedProduct, amount.value, selectedUnit).toLocaleString()}
                                </ThemedText>
                              </>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Custom Quantity */}
                    <View className="mb-6">
                      <View className="flex-row items-center gap-3">
                        <View className="flex-1">
                          <ThemedText variant="label" className="mb-2 font-semibold">
                            Custom Quantity
                          </ThemedText>
                          <Input
                            placeholder={`Enter quantity in ${selectedUnit}`}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                          />
                        </View>
                        <View className="w-24">
                          <ThemedText variant="muted" size="sm" className="text-center mb-2">
                            Unit
                          </ThemedText>
                          <View className="flex-row items-center justify-center px-3 py-3 bg-surface rounded-base border border-border">
                            <ThemedText variant="default" size="base">
                              {selectedUnit}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Price Preview */}
                    {quantity && parseFloat(quantity) > 0 && (
                      <View className="mb-4 p-3 bg-surface-soft rounded-lg">
                        <View className="flex-row justify-between items-center">
                          <ThemedText variant="muted">Total:</ThemedText>
                          <ThemedText variant="heading" size="lg" className="text-success font-bold">
                            ₣{calculatePrice(selectedProduct, parseFloat(quantity), selectedUnit).toLocaleString()}
                          </ThemedText>
                        </View>
                      </View>
                    )}

                    <Button
                      variant="default"
                      size="lg"
                      onPress={addToCart}
                      disabled={!quantity || parseFloat(quantity) <= 0}
                      icon="cart"
                      className="w-full"
                    >
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Cart Items */}
              {cart.length > 0 && (
                <Card variant="elevated" className="mt-4">
                  <CardHeader
                    title="Current Sale"
                    subtitle={`${cart.length} items • Total: ₣${totalAmount.toLocaleString()}`}
                    action={
                      <Button
                        variant="destructive"
                        size="sm"
                        onPress={clearCart}
                        icon="trash"
                      >
                        Clear
                      </Button>
                    }
                  />
                  <CardContent className="p-0">
                    {cart.map((item, index) => {
                      const product = products.find(p => p.id === item.productId);
                      return (
                        <View
                          key={item.id}
                          className={`flex-row items-center p-4 ${
                            index < cart.length - 1 ? 'border-b border-border' : ''
                          }`}
                        >
                          <View className="flex-1">
                            <ThemedText variant="default" size="base" className="font-medium mb-1">
                              {item.productName}
                            </ThemedText>
                            <ThemedText variant="muted" size="sm">
                              {product && formatUnitWithQuantity(product, item.quantity, item.unit)}
                            </ThemedText>
                          </View>

                          <View className="items-end mr-3">
                            <ThemedText variant="heading" size="base" className="font-bold">
                              ₣{item.totalPrice.toLocaleString()}
                            </ThemedText>
                            <View className="flex-row items-center mt-2">
                              <TouchableOpacity
                                onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 items-center justify-center rounded-full bg-surface-soft"
                              >
                                <Ionicons name="remove" size={16} color="#64748b" />
                              </TouchableOpacity>
                              <View className="w-10 items-center">
                                <ThemedText variant="default" size="base" className="font-medium">
                                  {item.quantity}
                                </ThemedText>
                              </View>
                              <TouchableOpacity
                                onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 items-center justify-center rounded-full bg-surface-soft"
                              >
                                <Ionicons name="add" size={16} color="#64748b" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          <TouchableOpacity
                            onPress={() => removeFromCart(item.id)}
                            className="p-2"
                          >
                            <Ionicons name="trash-outline" size={20} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* Cart Summary */}
                    <View className="p-4 border-t border-border">
                      <View className="flex-row justify-between pt-2">
                        <ThemedText variant="heading" size="lg" className="font-bold">
                          Total
                        </ThemedText>
                        <ThemedText variant="heading" size="lg" className="font-bold">
                          ₣{finalTotal.toLocaleString()}
                        </ThemedText>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              )}

              {/* Credit Fields */}
              {cart.length > 0 && paymentMode === 'credit' && (
                <Card variant="elevated" className="mt-4">
                  <CardContent className="p-4">
                    <View className="mb-4">
                      <ThemedText variant="label" className="mb-2 font-semibold">
                        Customer
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => {
                          router.push(`/shops/${currentShop.id}/contacts?selectFor=sale`);
                        }}
                        className="p-3 bg-surface rounded-lg border border-border flex-row justify-between"
                      >
                        {selectedCustomer ? (
                          <ThemedText>
                            {customers.find(c => c.id === selectedCustomer)?.name || 'Unknown'}
                          </ThemedText>
                        ) : (
                          <ThemedText variant="muted">Select a customer</ThemedText>
                        )}
                        <Ionicons name="chevron-forward" size={20} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    <View className="mb-4">
                      <ThemedText variant="label" className="mb-2 font-semibold">
                        Amount Paying Today
                      </ThemedText>
                      <View className="flex-row gap-2">
                        <View className="flex-1">
                          <Input
                            placeholder="Enter amount"
                            value={creditPaymentAmount.toString()}
                            onChangeText={(text) => setCreditPaymentAmount(parseFloat(text) || 0)}
                            keyboardType="numeric"
                          />
                        </View>
                        <TouchableOpacity
                          onPress={() => setCreditPaymentAmount(finalTotal)}
                          className="px-4 py-3 bg-surface-soft rounded-lg justify-center"
                        >
                          <ThemedText variant="brand" size="sm">Full</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View className="mb-4">
                      <ThemedText variant="label" className="mb-2 font-semibold">
                        Due Date
                      </ThemedText>
                      <TouchableOpacity
                        onPress={() => setShowDatePickerModal(true)}
                        className="p-3 bg-surface rounded-lg border border-border"
                      >
                        <ThemedText>
                          {dueDate ? new Date(dueDate).toLocaleDateString() : 'Tap to set due date'}
                        </ThemedText>
                      </TouchableOpacity>
                    </View>

                    <View>
                      <ThemedText variant="label" className="mb-2 font-semibold">
                        Credit Terms
                      </ThemedText>
                      <Input
                        placeholder="e.g., Net 30"
                        value={creditTerms}
                        onChangeText={setCreditTerms}
                      />
                    </View>
                  </CardContent>
                </Card>
              )}

              {/* Complete Sale Button */}
              {cart.length > 0 && (
                <View className="mt-6">
                  {isOffline && (
                    <View className="mb-3 p-3 bg-warning/10 rounded-lg flex-row items-center">
                      <Ionicons name="cloud-offline" size={20} color="#f59e0b" />
                      <ThemedText className="ml-2 text-warning flex-1">
                        You're offline. Sale will be queued.
                      </ThemedText>
                    </View>
                  )}
                  <Button
                    size="lg"
                    onPress={processSale}
                    disabled={isProcessingSale || (paymentMode === 'credit' && !selectedCustomer)}
                    icon={isOffline ? "cloud-upload" : "checkmark-circle"}
                    className="w-full"
                  >
                    {isProcessingSale 
                      ? 'Processing...' 
                      : isOffline 
                        ? 'Queue Sale' 
                        : 'Complete Sale'}
                  </Button>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Date Picker Modal */}
        <Modal
          transparent
          visible={showDatePickerModal}
          animationType="slide"
          onRequestClose={() => setShowDatePickerModal(false)}
        >
          <View className="flex-1 bg-black/50 justify-end">
            <View className={`rounded-t-3xl p-6 ${isDark ? 'bg-dark-surface' : 'bg-surface'}`}>
              <View className="flex-row justify-between items-center mb-6">
                <ThemedText variant="heading" size="xl" className="font-bold">
                  Select Due Date
                </ThemedText>
                <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dueDate ? new Date(dueDate) : new Date()}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const endOfDay = new Date(selectedDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    setDueDate(endOfDay.getTime());
                  }
                }}
                themeVariant={isDark ? 'dark' : 'light'}
              />
              <TouchableOpacity
                onPress={() => setShowDatePickerModal(false)}
                className="mt-6 py-3 bg-brand rounded-xl items-center"
              >
                <ThemedText className="text-white font-semibold">Done</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <CustomDialog
          visible={!!successDialogData}
          title={successDialogData?.title || ''}
          description={successDialogData?.description || ''}
          variant={successDialogData?.variant || 'info'}
          icon={successDialogData?.icon}
          actions={[
            {
              label: t('common.ok'),
              variant: 'default',
              onPress: () => {
                setSuccessDialogData(null);
                router.replace('/(tabs)/products');
              },
            }
          ]}
          onClose={() => setSuccessDialogData(null)}
        />
      </KeyboardAvoidingView>
    </View>
  );
};

// Export enhanced component
export default function SalesScreen() {
  const { currentShop } = useAuth();
  const EnhancedSalesScreen = enhance(SalesScreenInner);
  return <EnhancedSalesScreen currentShop={currentShop} />;
}