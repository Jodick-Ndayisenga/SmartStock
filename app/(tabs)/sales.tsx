// app/(tabs)/sales.tsx
import database from '@/database';
import { Ionicons } from '@expo/vector-icons';
import { Q } from '@nozbe/watermelondb';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker'; // 👈 ADD THIS

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { ThemedText } from '@/components/ui/ThemedText';

// Models
import { Contact } from '@/database/models/Contact';
import { Product } from '@/database/models/Product';
import { StockMovement } from '@/database/models/StockMovement';

// Services
import { createTransactionWithPayments, TransactionData } from '@/services/transactionService';
import { getDefaultCashAccount } from '@/services/cashAccountService';
import { StockService } from '@/services/stockServices';

// Hooks
import { useAuth } from '@/context/AuthContext';

interface CartItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  currentStock: number;
  imageUrl?: string;
  baseUnit: string;
  unitType: string;
}

interface QuickAmount {
  label: string;
  value: number;
  unit?: string;
}

export default function RecordSaleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { currentShop, user, tempSelectedContact, setTempSelectedContact } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [quickAmounts, setQuickAmounts] = useState<QuickAmount[]>([]);
  const [cartAnimation] = useState(new Animated.Value(0));

  // 💳 Payment & Credit State
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<number | null>(null); // Unix timestamp
  const [showDatePicker, setShowDatePicker] = useState(false); // 👈 NEW

  const productIdFromParams = params.productId as string;

  // Listen for contact selection
  useEffect(() => {
    if (tempSelectedContact) {
      setSelectedCustomer(tempSelectedContact);
      setTempSelectedContact(null);
    }
  }, [tempSelectedContact]);

  useEffect(() => {
    loadData();
  }, []);

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

  const loadData = async () => {
    try {
      setLoading(true);
      if (currentShop) {
        const [productsData, contactsData] = await Promise.all([
          database.get<Product>('products')
            .query(Q.where('shop_id', currentShop.id), Q.where('is_active', true))
            .fetch(),
          database.get<Contact>('contacts')
            .query(
              Q.where('shop_id', currentShop.id),
              Q.or(Q.where('role', 'customer'), Q.where('role', 'client'))
            )
            .fetch(),
        ]);
        setProducts(productsData);
        setCustomers(contactsData);
      }
    } catch (error) {
      console.error('Error loading ', error);
      Alert.alert('Error', 'Failed to load products or customers');
    } finally {
      setLoading(false);
    }
  };

  const generateQuickAmounts = (product: Product) => {
    const amounts: QuickAmount[] = [];

    switch (product.unitType) {
      case 'weight':
        amounts.push(
          { label: '250g', value: 0.25, unit: 'kg' },
          { label: '500g', value: 0.5, unit: 'kg' },
          { label: '1kg', value: 1, unit: 'kg' },
          { label: '2kg', value: 2, unit: 'kg' },
          { label: '5kg', value: 5, unit: 'kg' }
        );
        break;
      case 'volume':
        amounts.push(
          { label: '250ml', value: 0.25, unit: 'l' },
          { label: '500ml', value: 0.5, unit: 'l' },
          { label: '1L', value: 1, unit: 'l' },
          { label: '2L', value: 2, unit: 'l' },
          { label: '5L', value: 5, unit: 'l' }
        );
        break;
      case 'piece':
      default:
        amounts.push(
          { label: '1', value: 1 },
          { label: '2', value: 2 },
          { label: '5', value: 5 },
          { label: '10', value: 10 },
          { label: '20', value: 20 }
        );
        break;
    }

    setQuickAmounts(amounts);
  };

  const getProductStock = async (productId: string): Promise<number> => {
    const movements = await database.get<StockMovement>('stock_movements')
      .query(Q.where('product_id', productId))
      .fetch();

    let stock = 0;
    movements.forEach(movement => {
      if (movement.movementType === 'IN') {
        stock += movement.quantity;
      } else if (movement.movementType === 'SALE') {
        stock -= movement.quantity;
      }
    });

    return stock;
  };

  const calculatePrice = (product: Product, qty: number, unit: string): number => {
    if (unit === product.baseUnit) {
      return qty * product.sellingPricePerBase;
    }

    const baseQuantity = product.convertToBaseUnit(qty, unit);
    return baseQuantity * product.sellingPricePerBase;
  };

  const addToCart = async () => {
    if (!selectedProduct || !quantity || !currentShop) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const currentStock = await getProductStock(selectedProduct.id);
    const quantityInBaseUnit = selectedProduct.convertToBaseUnit(qty, selectedUnit);

    if (quantityInBaseUnit > currentStock) {
      Alert.alert('Error', `Only ${currentStock} ${selectedProduct.baseUnit} available in stock`);
      return;
    }

    const totalPrice = calculatePrice(selectedProduct, qty, selectedUnit);
    const cartItem: CartItem = {
      id: `${selectedProduct.id}-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: qty,
      unit: selectedUnit,
      pricePerUnit: selectedProduct.sellingPricePerBase,
      totalPrice,
      currentStock: currentStock - quantityInBaseUnit,
      imageUrl: selectedProduct.imageUrl,
      baseUnit: selectedProduct.baseUnit,
      unitType: selectedProduct.unitType,
    };

    setCart(prev => [...prev, cartItem]);

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
  };

  const resetProductSelection = () => {
    setSelectedProduct(null);
    setQuantity('');
    setSelectedUnit('');
    setQuickAmounts([]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const totalPrice = calculatePrice(
            products.find(p => p.id === item.productId)!,
            newQuantity,
            item.unit
          );
          return { ...item, quantity: newQuantity, totalPrice };
        }
        return item;
      })
    );
  };

  const quickAddToCart = async (product: Product, quickAmount: QuickAmount) => {
    const currentStock = await getProductStock(product.id);
    const quantityInBaseUnit = product.convertToBaseUnit(
      quickAmount.value,
      quickAmount.unit || product.sellingUnit || product.baseUnit
    );

    if (quantityInBaseUnit > currentStock) {
      Alert.alert('Error', `Only ${currentStock} ${product.baseUnit} available in stock`);
      return;
    }

    const totalPrice = calculatePrice(
      product,
      quickAmount.value,
      quickAmount.unit || product.sellingUnit || product.baseUnit
    );
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: quickAmount.value,
      unit: quickAmount.unit || product.sellingUnit || product.baseUnit,
      pricePerUnit: product.sellingPricePerBase,
      totalPrice,
      currentStock: currentStock - quantityInBaseUnit,
      imageUrl: product.imageUrl,
      baseUnit: product.baseUnit,
      unitType: product.unitType,
    };

    setCart(prev => [...prev, cartItem]);

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
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const processSale = async () => {
    if (!currentShop || cart.length === 0 || !user) return;

    if (paymentMode === 'credit' && !selectedCustomer) {
      Alert.alert('Missing Customer', 'Please select a customer for credit sale.');
      return;
    }

    try {
      setLoading(true);
      const txnData: TransactionData = {
        shopId: currentShop.id,
        transactionType: 'sale',
        contactId: paymentMode === 'credit' ? selectedCustomer : undefined,
        subtotal: totalAmount,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount,
        amountPaid: paymentMode === 'cash' ? totalAmount : 0,
        paymentStatus: paymentMode === 'cash' ? 'paid' : 'due',
        transactionDate: Date.now(),
        dueDate: dueDate || undefined,
        recordedBy: user.id,
        notes: '',
        isBusinessExpense: false,
      };
      //console.log(currentShop.id, txnData);

      const paymentInputs = [];
      if (paymentMode === 'cash') {
        const defaultAccount = await getDefaultCashAccount(currentShop.id);
        if (!defaultAccount) throw new Error('No default cash account found');
        paymentInputs.push({
          cashAccountId: defaultAccount.id,
          paymentMethodId: 'cash',
          amount: totalAmount,
          notes: 'Cash received at time of sale',
        });
      }

      await createTransactionWithPayments(txnData, paymentInputs);



            // Record stock movements
      for (const item of cart) {
        const product = products.find((p:Product) => p.id === item.productId)!;
        
        // Get current timestamp
        const timestamp = Date.now();
        
        // Create a unique reference ID
        const referenceId = `sale-${txnData.transactionNumber}-${timestamp}-${item.productId}`;
        
        await StockService.recordMovement({
          productId: item.productId,
          shopId: currentShop.id,
          quantity: product.convertToBaseUnit(item.quantity, product.sellingUnit),
          movementType: 'SALE',
          //batchNumber: product.batchNumber, // From product if available
          //expiryDate: product.expiryDate ? new Date(product.expiryDate).getTime() : undefined,
          supplierId: undefined, // Not applicable for sales
          customerId: paymentMode === 'credit' ? selectedCustomer : undefined,
          referenceId: referenceId,
          notes: `Sale ${txnData.transactionNumber} - ${item.quantity} ${product.sellingUnit} of ${product.name}`,
          recordedBy: user.id,
          timestamp: timestamp
        });
      }

      setCart([]);
      Alert.alert(
        paymentMode === 'cash' ? '✅ Sale Completed!' : '✅ Credit Sale Recorded!',
        paymentMode === 'cash'
          ? `Total: ₣${totalAmount.toLocaleString()}`
          : `${customers.find(c => c.id === selectedCustomer)?.name || 'Customer'} now owes you ₣${totalAmount.toLocaleString()}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/products') }]
      );
    } catch (error: any) {
      console.error('Error recording sale:', error);
      Alert.alert('❌ Error', error.message || 'Failed to record sale. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    product =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading && cart.length === 0) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Record Sale" showBackButton />
        <Loading />
      </View>
    );
  }

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
        searchPlaceholder="Search products by name or SKU..."
        onSearchChange={setSearchQuery}
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
                        ₣{totalAmount.toLocaleString()}
                      </ThemedText>
                      <ThemedText variant="muted" size="sm">
                        {cart.length} item{cart.length > 1 ? 's' : ''} • {totalItems} units
                      </ThemedText>
                    </View>

                    {/* 💳 Payment Mode Toggle - ENHANCED */}
                    <View className="mb-3 ">
                      <View className="flex-row justify-center gap-2">
                        <TouchableOpacity
                          onPress={() => setPaymentMode('cash')}
                          className={`px-4 py-2 rounded-full ${
                            paymentMode === 'cash'
                              ? 'bg-green-500 text-white'
                              : 'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border'
                          }`}
                        >
                          <ThemedText
                            variant={paymentMode === 'cash' ? 'label' : 'default'}
                            size="sm"
                            className="font-medium"
                          >
                            Cash
                          </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => setPaymentMode('credit')}
                          className={`px-4 py-2 rounded-full ${
                            paymentMode === 'credit'
                              ? 'bg-blue-500 text-white'
                              : 'bg-surface dark:bg-dark-surface border border-border dark:border-dark-border'
                          }`}
                        >
                          <ThemedText
                            variant={paymentMode === 'credit' ? 'label' : 'default'}
                            size="sm"
                            className="font-medium"
                          >
                            Credit
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Button variant="default" onPress={processSale} icon="checkmark-circle" className='p-[2px]'>
                      Complete
                    </Button>
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
            <View className="p-4">
              {!selectedProduct ? (
                /* Product Selection */
                <Card variant="elevated" className="mb-4 bg-surface dark:bg-dark-surface">
                  <CardContent className="p-4">
                    <View className="mt-6">
                      <ThemedText variant="label" className="mb-3">
                        All Products
                      </ThemedText>
                      <View className="gap-2">
                        {filteredProducts.map(product => (
                          <TouchableOpacity
                            key={product.id}
                            onPress={() => {
                              setSelectedProduct(product);
                              setSelectedUnit(product.sellingUnit || product.baseUnit);
                              generateQuickAmounts(product);
                            }}
                            className="flex-row items-center p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border"
                          >
                            <View className="w-12 h-12 rounded-lg bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3 overflow-hidden">
                              {product.imageUrl ? (
                                <Image
                                  source={{ uri: product.imageUrl }}
                                  className="w-full h-full"
                                  resizeMode="cover"
                                />
                              ) : (
                                <Ionicons name="cube-outline" size={20} color="#94a3b8" />
                              )}
                            </View>
                            <View className="flex-1">
                              <ThemedText variant="default" size="base" className="font-medium">
                                {product.name}
                              </ThemedText>
                              <ThemedText variant="muted" size="sm">
                                FBU {product.stockQuantity} / {product.sellingUnit || product.baseUnit}
                              </ThemedText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#64748b" />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ) : (
                /* Product Details */
                <Card variant="elevated" className="mb-4">
                  <CardHeader
                    title={selectedProduct.name}
                    subtitle={`Add quantity to cart`}
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
                    {/* Product Info */}
                    <View className="flex-row items-center mb-6 p-4 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
                      <View className="w-16 h-16 rounded-lg bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-4 overflow-hidden">
                        {selectedProduct.imageUrl ? (
                          <Image
                            source={{ uri: selectedProduct.imageUrl }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <Ionicons name="cube-outline" size={24} color="#94a3b8" />
                        )}
                      </View>
                      <View className="flex-1">
                        <ThemedText variant="heading" size="lg" className="mb-1">
                          {selectedProduct.name}
                        </ThemedText>
                        <ThemedText variant="muted" size="sm" className="mb-1">
                          FBU {selectedProduct.sellingPricePerBase} per {selectedProduct.baseUnit}
                        </ThemedText>
                        <StockStatusBadge
                          status={getStockStatus(selectedProduct?.stockQuantity)}
                          size="sm"
                          quantity={selectedProduct.stockQuantity}
                        />
                      </View>
                    </View>

                    {/* Quick Add */}
                    <View className="mb-6">
                      <ThemedText variant="label" className="mb-3">
                        Quick Add
                      </ThemedText>
                      <View className="flex-row flex-wrap gap-2">
                        {quickAmounts.map((amount, index) => (
                          <TouchableOpacity
                            key={index}
                            onPress={() => quickAddToCart(selectedProduct, amount)}
                            className="px-4 py-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border active:bg-surface-soft dark:active:bg-dark-surface-soft"
                          >
                            <ThemedText variant="default" size="base" className="font-medium">
                              {amount.label}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Custom Quantity */}
                    <View className="mb-6">
                      <View className="flex-row items-center gap-3">
                        <View className="flex-1">
                          <ThemedText variant="label" className="mb-3">
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
                          <ThemedText variant="muted" size="sm" className="text-center">
                            Unit
                          </ThemedText>
                          <View className="flex-row items-center justify-center px-3 py-3 bg-surface dark:bg-dark-surface rounded-base border border-border dark:border-dark-border">
                            <ThemedText variant="default" size="base">
                              {selectedUnit}
                            </ThemedText>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Adjuster */}
                    <View className="mb-6">
                      <ThemedText variant="label" className="mb-3">
                        Adjust Quantity
                      </ThemedText>
                      <View className="flex-row items-center justify-between bg-surface dark:bg-dark-surface rounded-xl p-1 border border-border dark:border-dark-border">
                        <TouchableOpacity
                          onPress={() => {
                            const current = parseFloat(quantity) || 0;
                            setQuantity(Math.max(0, current - 1).toString());
                          }}
                          className="w-12 h-12 items-center justify-center rounded-lg active:bg-surface-soft dark:active:bg-dark-surface-soft"
                        >
                          <Ionicons name="remove" size={24} color="#64748b" />
                        </TouchableOpacity>

                        <View className="flex-1 items-center">
                          <ThemedText variant="heading" size="xl">
                            {quantity || '0'}
                          </ThemedText>
                          <ThemedText variant="muted" size="sm">
                            {selectedUnit}
                          </ThemedText>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            const current = parseFloat(quantity) || 0;
                            setQuantity((current + 1).toString());
                          }}
                          className="w-12 h-12 items-center justify-center rounded-lg active:bg-surface-soft dark:active:bg-dark-surface-soft"
                        >
                          <Ionicons name="add" size={24} color="#64748b" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Button
                      variant="default"
                      size="lg"
                      onPress={addToCart}
                      disabled={!quantity || parseFloat(quantity) <= 0}
                      icon="cart"
                    >
                      Add to Cart - ₣
                      {quantity
                        ? calculatePrice(selectedProduct, parseFloat(quantity), selectedUnit).toLocaleString()
                        : '0'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Cart Items */}
              {cart.length > 0 && (
                <Card variant="elevated">
                  <CardHeader
                    title="Current Sale Items"
                    subtitle={`${cart.length} product${cart.length > 1 ? 's' : ''} in cart`}
                  />
                  <CardContent className="p-0">
                    {cart.map((item, index) => (
                      <View
                        key={item.id}
                        className={`flex-row items-center p-4 ${
                          index < cart.length - 1 ? 'border-b border-border dark:border-dark-border' : ''
                        }`}
                      >
                        <View className="w-12 h-12 rounded-lg bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mr-3 overflow-hidden">
                          {item.imageUrl ? (
                            <Image
                              source={{ uri: item.imageUrl }}
                              className="w-full h-full"
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="cube-outline" size={20} color="#94a3b8" />
                          )}
                        </View>

                        <View className="flex-1">
                          <ThemedText variant="default" size="base" className="font-medium">
                            {item.productName}
                          </ThemedText>
                          <ThemedText variant="muted" size="sm">
                            {item.quantity} {item.unit} × ₣{item.pricePerUnit}
                          </ThemedText>
                        </View>

                        <View className="items-end">
                          <ThemedText variant="heading" size="base">
                            ₣{item.totalPrice.toLocaleString()}
                          </ThemedText>

                          <View className="flex-row items-center space-x-2 mt-1">
                            <TouchableOpacity
                              onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 items-center justify-center rounded-sm bg-surface-soft dark:bg-dark-surface-soft"
                            >
                              <Ionicons name="remove" size={14} color="#64748b" />
                            </TouchableOpacity>

                            <ThemedText variant="muted" size="sm">
                              {item.quantity}
                            </ThemedText>

                            <TouchableOpacity
                              onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 items-center justify-center rounded-sm bg-surface-soft dark:bg-dark-surface-soft"
                            >
                              <Ionicons name="add" size={14} color="#64748b" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => removeFromCart(item.id)}
                          className="ml-3 p-2"
                        >
                          <Ionicons name="trash-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </CardContent>
                </Card>
              )}

              
            {/* 💳 Credit-Specific Fields - UPGRADED */}
            {cart.length > 0 && paymentMode === 'credit' && (
              <Card variant="elevated" className="mt-4">
                <CardContent className="p-4">
                  {/* Customer Selection */}
                  <View className="mb-4">
                    <ThemedText variant="label" className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                      Customer (Who owes you?)
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => {
                        router.push(`/shops/${currentShop.id}/contacts?selectFor=sale`);
                      }}
                      className="p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border flex-row justify-between items-center"
                    >
                      {selectedCustomer ? (
                        <ThemedText variant="default">
                          {customers.find(c => c.id === selectedCustomer)?.name || 'Unknown'}
                        </ThemedText>
                      ) : (
                        <ThemedText variant="muted">Select a customer</ThemedText>
                      )}
                      <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  {/* Due Date Picker */}
                  <View>
                    <ThemedText variant="label" className="mb-2 font-medium text-gray-700 dark:text-gray-300">
                      Due Date (Optional)
                    </ThemedText>
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="p-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border"
                    >
                      <ThemedText variant="default">
                        {dueDate 
                          ? new Date(dueDate).toLocaleDateString() 
                          : 'Tap to set due date'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </CardContent>
              </Card>
            )}
          

            </View>
          </ScrollView>
        </View>

        {/* 📅 Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                // Set to end of day (23:59:59) to avoid timezone issues
                const endOfDay = new Date(selectedDate);
                endOfDay.setHours(23, 59, 59, 999);
                setDueDate(endOfDay.getTime());
              }
            }}
          />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const getStockStatus = (stock: number, threshold: number = 10) => {
  if (stock === 0) return 'out-of-stock';
  if (stock <= threshold) return 'low-stock';
  return 'in-stock';
};