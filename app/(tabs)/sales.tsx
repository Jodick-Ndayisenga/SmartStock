// app/(tabs)/sales.tsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  AppState,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'nativewind';
import { withObservables } from '@nozbe/watermelondb/react';
import { Q } from '@nozbe/watermelondb';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
// Database
import database from '@/database';
// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import CustomDialog from '@/components/ui/CustomDialog';
import CartSummary from '@/components/sales/CartSummary';
import ProductSelection from '@/components/sales/ProductSelection';
import ProductDetails from '@/components/sales/ProductDetails';
import CartItems from '@/components/sales/CartItems';
import CreditSaleForm from '@/components/sales/CreditSaleForm';
import DatePickerModal from '@/components/sales/DatePickerModal';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useSaleProcessor } from '@/hooks/useSaleProcessor';

// Services
import { SaleQueueService } from '@/services/saleQueueService';

// Models
import { Contact } from '@/database/models/Contact';
import { Product } from '@/database/models/Product';

// Types
import { ViewMode, StockStatus } from '@/types/sales';


interface SalesScreenProps {
  products: Product[];
  customers: Contact[];
}

function SalesScreen({ products, customers }: SalesScreenProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { colorScheme } = useColorScheme();
  const { currentShop, user, tempSelectedContact, setTempSelectedContact } = useAuth();
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isOffline, setIsOffline] = useState(false);
  const [queuedSales, setQueuedSales] = useState<any[]>([]);
  const [successDialogData, setSuccessDialogData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom hooks
  const {
    cart,
    setCart,
    selectedProduct,
    setSelectedProduct,
    quantity,
    setQuantity,
    selectedUnit,
    setSelectedUnit,
    quickAmounts,
    addingToCart,
    cartAnimation,
    totalAmount,
    totalItems,
    addToCart,
    quickAddToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    resetProductSelection,
    generateQuickAmounts,
    formatUnitWithQuantity,
    validateQuantity,
    calculatePrice,
  } = useCart(products);

  const handleSuccessfulSale = useCallback((data: any) => {
    setSuccessDialogData(data);
    // Reset form fields
    setSelectedCustomer(null);
    setDueDate(null);
    setCreditTerms('');
    setCreditPaymentAmount(0);
  }, []);

  const handleSaleError = useCallback((error: any) => {
    setSuccessDialogData({
      title: t('common.error'),
      description: error.message || t('sales.error_generic'),
      variant: 'error',
      icon: 'alert-circle-outline',
    });
  }, [t]);

  const {
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
    finalTotal,
  } = useSaleProcessor({
    cart,
    products,
    customers,
    currentShop,
    user,
    isOffline,
    clearCart,
    onSuccess: handleSuccessfulSale,
    onError: handleSaleError,
    setCart,
  });

  // Derived values
  const productIdFromParams = params.productId as string;
  const filteredProducts = useMemo(() => {
    if (!products.length) return [];
    
    return products.filter(product => {
      const matchesSearch = searchQuery.trim() === '' ? true :
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, products]);

  const categories = useMemo(() => 
    Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[],
    [products]
  );

 const getProductStockStatus = useCallback((product: Product): StockStatus => {
    const stock = product.stockQuantity || 0;
    if (stock <= 0) return 'out-of-stock';
    if (stock <= product.lowStockThreshold) return 'low-stock';
    return 'in-stock';
  }, []);

  // Effects
  useEffect(() => {
    if (tempSelectedContact) {
      setSelectedCustomer(tempSelectedContact);
      setTempSelectedContact(null);
    }
  }, [tempSelectedContact, setSelectedCustomer, setTempSelectedContact]);

  useEffect(() => {
    if (productIdFromParams && products.length > 0) {
      const product = products.find(p => p.id === productIdFromParams);
      if (product) {
        setSelectedProduct(product);
        setSelectedUnit(product.sellingUnit || product.baseUnit);
        generateQuickAmounts(product);
      }
    }
  }, [productIdFromParams, products, setSelectedProduct, setSelectedUnit, generateQuickAmounts]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
      if (state.isConnected) {
        processQueuedSales();
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadQueuedSales();
  }, []);

  useEffect(() => {
    // Set loading to false once products are loaded
    if (products.length > 0 || customers.length > 0) {
      setIsLoading(false);
    }
  }, [products, customers]);

  const loadQueuedSales = async () => {
    try {
      const sales = await SaleQueueService.getQueuedSales();
      setQueuedSales(sales);
    } catch (error) {
      console.error('Error loading queued sales:', error);
    }
  };

  const processQueuedSales = async () => {
    try {
      const sales = await SaleQueueService.getQueuedSales();
      for (const sale of sales) {
        // Process each queued sale
        // You'll need to implement this based on your business logic
        console.log('Processing queued sale: ', sale);
      }
    } catch (error) {
      console.error('Error processing queued sales:', error);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('sales.record_sale')} showBackButton />
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader
        title={t('sales.record_sale')}
        showBackButton
        searchable
        searchPlaceholder={t('sales.search_products')}
        onSearch={setSearchQuery}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View className="flex-1">
          {cart.length > 0 && (
            <CartSummary
              finalTotal={finalTotal}
              cartLength={cart.length}
              totalItems={totalItems}
              paymentMode={paymentMode}
              setPaymentMode={setPaymentMode}
              cartAnimation={cartAnimation}
            />
          )}

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            <View className="p-2">
              {!selectedProduct ? (
                <ProductSelection
                  products={filteredProducts}
                  categories={categories}
                  selectedCategory={selectedCategory}
                  setSelectedCategory={setSelectedCategory}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSelectProduct={(product) => {
                    setSelectedProduct(product);
                    setSelectedUnit(product.sellingUnit || product.baseUnit);
                    generateQuickAmounts(product);
                  }}
                  getProductStockStatus={getProductStockStatus}
                />
              ) : (
                <ProductDetails
                  product={selectedProduct}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  selectedUnit={selectedUnit}
                  setSelectedUnit={setSelectedUnit}
                  quickAmounts={quickAmounts}
                  addingToCart={addingToCart}
                  onQuickAdd={(amount) => quickAddToCart(selectedProduct, amount)}
                  onAddToCart={addToCart}
                  onClose={resetProductSelection}
                  calculatePrice={calculatePrice}
                  formatUnitWithQuantity={formatUnitWithQuantity}
                  getProductStockStatus={getProductStockStatus}
                />
              )}

              {cart.length > 0 && (
                <CartItems
                  cart={cart}
                  products={products}
                  onUpdateQuantity={updateCartQuantity}
                  onRemoveItem={removeFromCart}
                  onClearCart={clearCart }
                  formatUnitWithQuantity={formatUnitWithQuantity}
                  getProductStockStatus={getProductStockStatus}
                />
              )}

              {cart.length > 0 && paymentMode === 'credit' && (
                <CreditSaleForm
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  setSelectedCustomer={setSelectedCustomer}
                  dueDate={dueDate}
                  setDueDate={setDueDate}
                  creditTerms={creditTerms}
                  setCreditTerms={setCreditTerms}
                  creditPaymentAmount={creditPaymentAmount}
                  setCreditPaymentAmount={setCreditPaymentAmount}
                  finalTotal={finalTotal}
                  onSelectCustomer={() => {
                    router.push(`/shops/${currentShop?.id}/contacts?selectFor=sale`);
                  }}
                  onAddCustomer={() => router.push(`/shops/${currentShop?.id}/contacts/add?from=sale`)}
                  onOpenDatePicker={() => setShowDatePickerModal(true)}
                />
              )}

              {cart.length > 0 && (
                <View className="mt-6 px-2">
                  {isOffline && (
                    <View className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex-row items-center">
                      <Ionicons name="cloud-offline" size={20} color="#b45309" />
                      <ThemedText className="ml-2 text-yellow-700 dark:text-yellow-500 flex-1">
                        {t('sales.offline_message')}
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
                      ? t('common.processing') 
                      : isOffline 
                        ? t('sales.queue_sale') 
                        : t('sales.complete_sale')}
                  </Button>
                  <ThemedText variant="muted" size="sm" className="text-center mt-2">
                    {t('sales.total_amount', { amount: finalTotal.toLocaleString() })}
                  </ThemedText>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        <DatePickerModal
          visible={showDatePickerModal}
          onClose={() => setShowDatePickerModal(false)}
          onSelect={(date) => setDueDate(date)}
          selectedDate={dueDate}
          isDark={colorScheme === 'dark'}
        />
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
                if (successDialogData?.variant === 'success' || successDialogData?.variant === 'info') {
                  router.replace('/(tabs)/products');
                }
              },
            }
          ]}
          onClose={() => setSuccessDialogData(null)}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

// Enhance with observables for real-time data
const enhance = withObservables(
  ['currentShop'],
  ({ currentShop }) => {
    if (!currentShop) {
      return {
        products: [],
        customers: [],
      };
    }

    return {
      products: database.get<Product>('products')
        .query(
          Q.where('shop_id', currentShop.id),
          Q.where('is_active', true)
        )
        .observe(),
      customers: database.get<Contact>('contacts')
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

export default function RecordSaleScreen() {
  const { currentShop } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();
  
  if (!currentShop) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title={t('sales.record_sale')} showBackButton />
        <EmptyState
          icon="business-outline"
          title={t('shop.no_shop_found')}
          description={t('shop.create_shop_to_sell')}
          action={{
            label: t('shop.create_shop'),
            onPress: () => router.push('/(auth)/create-shop'),
          }}
        />
      </View>
    );
  }

  const SalesWithData = enhance(SalesScreen);
  return <SalesWithData currentShop={currentShop} />;
}