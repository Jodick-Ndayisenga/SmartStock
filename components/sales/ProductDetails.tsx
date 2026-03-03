// components/sales/ProductDetails.tsx
import React from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StockStatusBadge } from '@/components/ui/StockStatusBadge';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Product } from '@/database/models/Product';
import { QuickAmount } from '@/hooks/useCart';

interface ProductDetailsProps {
  product: Product;
  quantity: string;
  setQuantity: (value: string) => void;
  selectedUnit: string;
  setSelectedUnit: (unit: string) => void;
  quickAmounts: QuickAmount[];
  addingToCart: string | null;
  onQuickAdd: (amount: QuickAmount) => void;
  onAddToCart: () => void;
  onClose: () => void;
  calculatePrice: (product: Product, qty: number, unit: string) => number;
  formatUnitWithQuantity: (product: Product, quantity: number, unit: string) => string;
  getProductStockStatus: (product: Product) => 'in-stock' | 'low-stock' | 'out-of-stock';
}

export default function ProductDetails({
  product,
  quantity,
  setQuantity,
  selectedUnit,
  setSelectedUnit,
  quickAmounts,
  addingToCart,
  onQuickAdd,
  onAddToCart,
  onClose,
  calculatePrice,
  formatUnitWithQuantity,
  getProductStockStatus,
}: ProductDetailsProps) {
  return (
    <Card variant="elevated" className="mb-4">
      <CardHeader
        title={product.name}
        subtitle={`Add quantity to cart`}
        action={
          <Button
            variant="destructive"
            size="sm"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
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
            {product.imageUrl ? (
              <Image
                source={{ uri: product.imageUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                <Ionicons name="cube-outline" size={24} color="#64748b" />
              </View>
            )}
          </View>
          <View className="flex-1">
            <ThemedText variant="heading" size="lg" className="mb-1">
              {product.name}
            </ThemedText>
            <ThemedText variant="muted" size="sm" className="mb-1">
              ₣{product.sellingPricePerBase} per {product.baseUnit}
            </ThemedText>
            <StockStatusBadge
              status={getProductStockStatus(product)}
              size="sm"
              quantity={product.stockQuantity ?? 0}
            />
          </View>
        </View>

        {/* Quick Add */}
        <View className="mb-6">
          <ThemedText variant="label" className="mb-3 font-semibold">
            Quick Add
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {quickAmounts.map((amount, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => onQuickAdd(amount)}
                disabled={!amount.isAvailable || addingToCart === product.id}
                className={`px-4 py-3 bg-surface dark:bg-dark-surface rounded-lg border border-border dark:border-dark-border 
                  ${!amount.isAvailable ? 'opacity-40' : 'active:bg-surface-soft dark:active:bg-dark-surface-soft'}
                  ${addingToCart === product.id ? 'opacity-50' : ''}`}
              >
                {addingToCart === product.id ? (
                  <ActivityIndicator size="small" color="#64748b" />
                ) : (
                  <>
                    <ThemedText variant="default" size="base" className="font-medium text-center">
                      {amount.label}
                    </ThemedText>
                    <ThemedText variant="muted" size="xs" className="text-center mt-1">
                      ₣{calculatePrice(product, amount.value, selectedUnit).toLocaleString()}
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
              <ThemedText variant="label" className="mb-3 font-semibold">
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
              <ThemedText variant="muted" size="sm" className="text-center mb-1">
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

        {/* Quantity Adjuster */}
        <View className="mb-6">
          <ThemedText variant="label" className="mb-3 font-semibold">
            Adjust Quantity
          </ThemedText>
          <View className="flex-row items-center justify-between bg-surface dark:bg-dark-surface rounded-xl p-1 border border-border dark:border-dark-border">
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const current = parseFloat(quantity) || 0;
                setQuantity((current + 1).toString());
              }}
              className="w-12 h-12 items-center justify-center rounded-lg active:bg-surface-soft dark:active:bg-dark-surface-soft"
            >
              <Ionicons name="add" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Preview */}
        {quantity && parseFloat(quantity) > 0 && (
          <View className="mb-4 p-3 bg-surface-soft dark:bg-dark-surface-soft rounded-lg">
            <View className="flex-row justify-between items-center">
              <ThemedText variant="muted">Total Price:</ThemedText>
              <ThemedText variant="heading" size="lg" className="text-success font-bold">
                ₣{calculatePrice(product, parseFloat(quantity), selectedUnit).toLocaleString()}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <ThemedText variant="muted" size="sm">
                {formatUnitWithQuantity(product, parseFloat(quantity), selectedUnit)}
              </ThemedText>
              <ThemedText variant="muted" size="sm">
                @ ₣{product.sellingPricePerBase}/{product.baseUnit}
              </ThemedText>
            </View>
          </View>
        )}

        <Button
          variant="default"
          size="lg"
          onPress={onAddToCart}
          disabled={!quantity || parseFloat(quantity) <= 0}
          icon="cart"
          className="w-full"
        >
          Add to Cart - ₣
          {quantity
            ? calculatePrice(product, parseFloat(quantity), selectedUnit).toLocaleString()
            : '0'}
        </Button>
      </CardContent>
    </Card>
  );
}