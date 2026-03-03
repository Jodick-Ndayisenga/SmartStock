// components/sales/CartItems.tsx
import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Product } from '@/database/models/Product';
import { CartItem } from '@/hooks/useCart';

interface CartItemsProps {
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  formatUnitWithQuantity: (product: Product, quantity: number, unit: string) => string;
  getProductStockStatus: (product: Product) => 'in-stock' | 'low-stock' | 'out-of-stock';
}

export default function CartItems({
  cart,
  products,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  formatUnitWithQuantity,
  getProductStockStatus,
}: CartItemsProps) {
  const totalAmount = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartTax = 0;
  const cartDiscount = 0;
  const finalTotal = totalAmount + cartTax - cartDiscount;

  return (
    <Card variant="elevated" className="mt-4">
      <CardHeader
        title="Current Sale Items"
        subtitle={`${cart.length} product${cart.length > 1 ? 's' : ''} in cart • Total: ₣${totalAmount.toLocaleString()}`}
        action={
          <Button
            variant="destructive"
            size="sm"
            onPress={onClearCart}
            icon="trash"
          >
            Clear
          </Button>
        }
      />
      <CardContent className="p-0">
        {cart.map((item, index) => {
          const product = products.find(p => p.id === item.productId);
          if (!product) return null;

          return (
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
                  <View className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                    <Ionicons name="cube-outline" size={20} color="#94a3b8" />
                  </View>
                )}
              </View>

              <View className="flex-1">
                <ThemedText variant="default" size="base" className="font-medium mb-1">
                  {item.productName}
                </ThemedText>
                <ThemedText variant="muted" size="sm">
                  {formatUnitWithQuantity(product, item.quantity, item.unit)}
                </ThemedText>
                {product && (
                  <StockStatusBadge
                    status={getProductStockStatus(product)}
                    size="sm"
                    className="mt-1"
                  />
                )}
              </View>

              <View className="items-end">
                <ThemedText variant="heading" size="base" className="font-bold">
                  ₣{item.totalPrice.toLocaleString()}
                </ThemedText>

                <View className="flex-row items-center space-x-2 mt-2">
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onUpdateQuantity(item.id, item.quantity - 1);
                    }}
                    className="w-8 h-8 items-center justify-center rounded-full bg-surface-soft dark:bg-dark-surface-soft"
                  >
                    <Ionicons name="remove" size={16} color="#64748b" />
                  </TouchableOpacity>

                  <View className="w-10 items-center">
                    <ThemedText variant="default" size="base" className="font-medium">
                      {item.quantity}
                    </ThemedText>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onUpdateQuantity(item.id, item.quantity + 1);
                    }}
                    className="w-8 h-8 items-center justify-center rounded-full bg-surface-soft dark:bg-dark-surface-soft"
                  >
                    <Ionicons name="add" size={16} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onRemoveItem(item.id);
                }}
                className="ml-3 p-2"
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Cart Summary */}
        <View className="p-4 border-t border-border dark:border-dark-border">
          <View className="flex-row justify-between mb-2">
            <ThemedText variant="muted" size="base">
              Subtotal
            </ThemedText>
            <ThemedText variant="default" size="base">
              ₣{totalAmount.toLocaleString()}
            </ThemedText>
          </View>
          <View className="flex-row justify-between mb-2">
            <ThemedText variant="muted" size="base">
              Tax
            </ThemedText>
            <ThemedText variant="default" size="base">
              ₣{cartTax.toLocaleString()}
            </ThemedText>
          </View>
          <View className="flex-row justify-between mb-4">
            <ThemedText variant="muted" size="base">
              Discount
            </ThemedText>
            <ThemedText variant="default" size="base" className="text-success">
              -₣{cartDiscount.toLocaleString()}
            </ThemedText>
          </View>
          <View className="flex-row justify-between pt-4 border-t border-border dark:border-dark-border">
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
  );
}