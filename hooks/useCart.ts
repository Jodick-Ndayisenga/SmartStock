// hooks/useCart.ts
import { useState, useCallback, useRef, useMemo } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { Product } from '@/database/models/Product';

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

export interface QuickAmount {
  label: string;
  value: number;
  unit?: string;
  baseQuantity: number;
  isAvailable: boolean;
}

export function useCart(products: Product[]) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [quickAmounts, setQuickAmounts] = useState<QuickAmount[]>([]);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  
  const cartAnimation = useRef(new Animated.Value(0)).current;

  const totalAmount = useMemo(() => 
    cart.reduce((sum, item) => sum + item.totalPrice, 0),
    [cart]
  );

  const totalItems = useMemo(() => 
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const generateQuickAmounts = useCallback((product: Product) => {
    const amounts: QuickAmount[] = [];
    const stockInBaseUnits = product.stockQuantity || 0;

    switch (product.unitType) {
      case 'weight':
        const weightAmounts = [0.25, 0.5, 1, 2, 5];
        amounts.push(
          ...weightAmounts.map(amt => {
            const baseQuantity = product.convertToBaseUnit(amt, 'kg');
            return {
              label: amt >= 1 ? `${amt}kg` : `${amt * 1000}g`,
              value: amt,
              unit: 'kg',
              baseQuantity,
              isAvailable: baseQuantity <= stockInBaseUnits
            };
          })
        );
        break;
      case 'volume':
        const volumeAmounts = [0.25, 0.5, 1, 2, 5];
        amounts.push(
          ...volumeAmounts.map(amt => {
            const baseQuantity = product.convertToBaseUnit(amt, 'l');
            return {
              label: amt >= 1 ? `${amt}L` : `${amt * 1000}ml`,
              value: amt,
              unit: 'l',
              baseQuantity,
              isAvailable: baseQuantity <= stockInBaseUnits
            };
          })
        );
        break;
      case 'length':
        const lengthAmounts = [1, 2, 5, 10, 20];
        amounts.push(
          ...lengthAmounts.map(amt => {
            const baseQuantity = product.convertToBaseUnit(amt, 'm');
            return {
              label: `${amt}m`,
              value: amt,
              unit: 'm',
              baseQuantity,
              isAvailable: baseQuantity <= stockInBaseUnits
            };
          })
        );
        break;
      case 'piece':
      default:
        const pieceAmounts = [1, 2, 5, 10, 20];
        amounts.push(
          ...pieceAmounts.map(amt => ({
            label: amt.toString(),
            value: amt,
            unit: 'piece',
            baseQuantity: amt,
            isAvailable: amt <= stockInBaseUnits
          }))
        );
        break;
    }

    setQuickAmounts(amounts);
  }, []);

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

  const calculatePrice = useCallback((
    product: Product,
    qty: number,
    unit: string
  ): number => {
    if (unit === product.baseUnit) {
      return qty * product.sellingPricePerBase;
    }

    if (product.baseUnit === 'piece' || product.baseUnit === 'unite') {
      return qty * product.sellingPricePerBase;
    }

    const baseQuantity = product.convertToBaseUnit(qty, unit);
    return baseQuantity * product.sellingPricePerBase;
  }, []);

  const addToCart = useCallback(async () => {
    if (!selectedProduct || !quantity) return;

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
  }, [selectedProduct, quantity, selectedUnit, validateQuantity, calculatePrice]);

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
  }, [calculatePrice]);

  const removeFromCart = useCallback((itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCart(prev => prev.filter(item => item.id !== itemId));
  }, []);

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
            baseQuantity = product.stockQuantity || 0;
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

  const clearCart = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from the cart?',
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

  const resetProductSelection = useCallback(() => {
    setSelectedProduct(null);
    setQuantity('');
    setSelectedUnit('');
    setQuickAmounts([]);
  }, []);

  const formatUnitWithQuantity = useCallback((
    product: Product,
    quantity: number,
    unit: string
  ): string => {
    if (unit === product.baseUnit) return `${quantity} ${unit}`;
    if (product.baseUnit === 'piece' || product.baseUnit === 'unite') {
      return `${quantity} ${unit}`;
    }
    const baseQuantity = product.convertToBaseUnit(quantity, unit);
    return `${quantity} ${unit} (${baseQuantity.toFixed(2)} ${product.baseUnit})`;
  }, []);

  return {
    cart,
    setCart,
    selectedProduct,
    setSelectedProduct,
    quantity,
    setQuantity,
    selectedUnit,
    setSelectedUnit,
    quickAmounts,
    setQuickAmounts,
    addingToCart,
    cartAnimation,
    totalAmount,
    totalItems,
    generateQuickAmounts,
    validateQuantity,
    calculatePrice,
    addToCart,
    quickAddToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    resetProductSelection,
    formatUnitWithQuantity,
  };
}