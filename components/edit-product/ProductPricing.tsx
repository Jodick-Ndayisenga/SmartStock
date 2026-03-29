// components/edit-product/ProductPricing.tsx
import React from 'react';
import { View, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProductFormData, ProfitAnalysis } from '@/hooks/useProductForm';
import { PriceConversionResult } from '@/utils/productUnitConversions';
import { useProductMovementInfo } from '@/hooks/useProductMovementInfo';

interface ProductPricingProps {
  formData: ProductFormData;
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  purchaseQuantity: number;
  handlePurchaseQuantityChange: (quantity: number) => void;
  priceMetrics: PriceConversionResult;
  profitAnalysis: ProfitAnalysis;
  formatCurrency: (value: number) => string;
  showPriceCalculator: boolean;
  setShowPriceCalculator: (show: boolean) => void;
  productId?: string; // Add this prop
}

export function ProductPricing({
  formData,
  updateField,
  purchaseQuantity,
  handlePurchaseQuantityChange,
  priceMetrics,
  profitAnalysis,
  formatCurrency,
  showPriceCalculator,
  setShowPriceCalculator,
  productId,
}: ProductPricingProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { hasMovement, movementCount, loading } = useProductMovementInfo(productId);

  return (
    <>
      <Card>
        <CardContent className="p-4 gap-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-8 h-8 rounded-full bg-info-soft dark:bg-dark-info-soft items-center justify-center">
              <Ionicons name="cash-outline" size={18} color="#0ea5e9" />
            </View>
            <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
              Prix et achats
            </ThemedText>
          </View>

          <View className="h-px bg-border dark:bg-dark-border my-2" />

          {/* Purchase Calculator */}
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Input
                readOnly={hasMovement}
                label={`Prix total pour ${purchaseQuantity.toFixed(2)} ${formData.purchaseUnit}${purchaseQuantity > 1 ? 's' : ''}`}
                placeholder="0"
                value={String(formData.totalPurchaseCost)}
                onChangeText={(v) => updateField('totalPurchaseCost', parseFloat(v) || 0)}
                keyboardType="numeric"
                leftIcon="cash-outline"
              />
            </View>
          </View>

          {/* Purchase Quantity Controls */}
          <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg">
            <ThemedText variant="muted" size="sm" className="mb-2">
              Quantité achetée ({formData.purchaseUnit})
            </ThemedText>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => handlePurchaseQuantityChange(purchaseQuantity - 1)}
                disabled={purchaseQuantity <= 0.001 || hasMovement} // Disable if quantity is too low or if there are movements
                className="w-10 h-10 rounded-lg bg-surface dark:bg-dark-surface items-center justify-center"
                style={{ opacity: purchaseQuantity <= 0.001 ? 0.5 : 1 }}
              >
                <Ionicons name="remove" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>

              <View className="flex-1">
                <Input
                  value={purchaseQuantity.toFixed(2)}
                  readOnly={hasMovement}
                  onChangeText={(v) => {
                    const val = parseInt(v);
                    if (!isNaN(val)) {
                      handlePurchaseQuantityChange(val);
                    }
                  }}
                  keyboardType="numeric"
                  className="text-center"
                />
              </View>

              <TouchableOpacity
                disabled={hasMovement}
                onPress={() => handlePurchaseQuantityChange(purchaseQuantity + 1)}
                className="w-10 h-10 rounded-lg bg-surface dark:bg-dark-surface items-center justify-center"
              >
                <Ionicons name="add" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Price per unit summary */}
          <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg">
            <View className="flex-row justify-between items-center mb-1">
              <ThemedText variant="muted" size="xs">Prix par {formData.purchaseUnit}:</ThemedText>
              <ThemedText variant="default" size="sm" className="font-semibold">
                {formatCurrency(purchaseQuantity > 0 ? formData.totalPurchaseCost / purchaseQuantity : 0)}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center mb-1">
              <ThemedText variant="muted" size="xs">Prix par {formData.baseUnit}:</ThemedText>
              <ThemedText variant="default" size="sm">
                {priceMetrics.success ? formatCurrency(priceMetrics.pricePerBaseUnit) : '0 FBU'}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center pt-1 border-t border-border dark:border-dark-border">
              <ThemedText variant="muted" size="xs">Prix de vente par {formData.sellingUnit}:</ThemedText>
              <ThemedText variant="brand" size="sm" className="font-bold">
                {formatCurrency(formData.sellingPrice)}
              </ThemedText>
            </View>
          </View>

          {/* Selling Price */}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                readOnly={hasMovement}
                label={`Prix de vente / ${formData.sellingUnit}`}
                placeholder="0"
                value={String(formData.sellingPrice)}
                onChangeText={(v) => updateField('sellingPrice', parseFloat(v) || 0)}
                keyboardType="numeric"
                leftIcon="arrow-up-circle-outline"
              />
            </View>
            <View className="flex-1">
              <Input
                readOnly={hasMovement}
                label="Marge bénéficiaire"
                value={`${profitAnalysis.perSellingUnit.margin.toFixed(1)}%`}
                editable={false}
                leftIcon="trending-up-outline"
              />
            </View>
          </View>

          {/* Price Calculator Button */}
          <Button
            disabled={hasMovement}
            variant="outline"
            size="sm"
            onPress={() => setShowPriceCalculator(true)}
            icon="calculator-outline"
          >
            Calculateur de prix
          </Button>
        </CardContent>
      </Card>

      {/* Wholesale Section */}
      <Card>
        <CardContent className="p-4 gap-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-8 h-8 rounded-full bg-accent-soft dark:bg-dark-accent-soft items-center justify-center">
              <Ionicons name="people-outline" size={18} color="#dc2626" />
            </View>
            <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
              Prix de gros
            </ThemedText>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                readOnly={hasMovement}
                label={`Prix de gros / ${formData.sellingUnit}`}
                placeholder="0"
                value={String(formData.wholesalePrice)}
                onChangeText={(v) => updateField('wholesalePrice', parseFloat(v) || 0)}
                keyboardType="numeric"
                leftIcon="people-outline"
              />
            </View>
            <View className="flex-1">
              <Input
                readOnly={hasMovement}
                label="Remise"
                value={formData.sellingPrice > 0
                  ? `${((1 - formData.wholesalePrice / formData.sellingPrice) * 100).toFixed(1)}%`
                  : '0%'}
                editable={false}
                leftIcon="pricetag-outline"
              />
            </View>
          </View>

          <View className="flex-row gap-2">
            {[5, 10, 15, 20].map((discount) => (
              <TouchableOpacity
                disabled={hasMovement}
                key={discount}
                onPress={() => {
                  const wholesale = formData.sellingPrice * (1 - discount / 100);
                  updateField('wholesalePrice', Math.round(wholesale * 100) / 100);
                }}
                className="flex-1 py-2 bg-surface-muted dark:bg-dark-surface-muted rounded-lg items-center"
              >
                <ThemedText variant="default" size="sm">{discount}%</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* PRICE CALCULATOR MODAL */}
      <Modal
        visible={showPriceCalculator}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPriceCalculator(false)}
      >
        <View className="flex-1 bg-overlay">
          <View className="flex-1 mt-20 bg-surface dark:bg-dark-surface rounded-t-3xl">
            <View className="p-4 border-b border-border dark:border-dark-border">
              <View className="flex-row justify-between items-center">
                <ThemedText variant="heading" size="lg" className="text-text dark:text-dark-text">
                  Calculateur de prix
                </ThemedText>
                <TouchableOpacity
                  onPress={() => setShowPriceCalculator(false)}
                  className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
                >
                  <Ionicons name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="p-4">
              <Card>
                <CardContent className="p-4">
                  <ThemedText variant="subheading" size="sm" className="mb-4">
                    Calculer le prix de vente à partir de la marge souhaitée
                  </ThemedText>

                  <View className="mb-4">
                    <ThemedText variant="muted" size="sm" className="mb-2">
                      Coût par {formData.sellingUnit}
                    </ThemedText>
                    <Input
                      value={formatCurrency(profitAnalysis.perSellingUnit.cost)}
                      editable={false}
                      leftIcon="cash-outline"
                    />
                  </View>

                  <View className="mb-4">
                    <ThemedText variant="muted" size="sm" className="mb-2">
                      Marge souhaitée (%)
                    </ThemedText>
                    <View className="flex-row gap-3">
                      {[20, 30, 50, 100].map((margin) => (
                        <TouchableOpacity
                          key={margin}
                          onPress={() => {
                            const cost = profitAnalysis.perSellingUnit.cost;
                            const price = cost * (1 + margin / 100);
                            updateField('sellingPrice', price);
                          }}
                          className="flex-1 py-2 bg-surface-muted dark:bg-dark-surface-muted rounded-lg items-center"
                        >
                          <ThemedText variant="default" size="sm">{margin}%</ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View className="mb-4">
                    <ThemedText variant="muted" size="sm" className="mb-2">
                      Prix recommandés
                    </ThemedText>
                    {[20, 30, 50, 100].map((margin) => {
                      const cost = profitAnalysis.perSellingUnit.cost;
                      const price = cost * (1 + margin / 100);
                      return (
                        <TouchableOpacity
                          key={margin}
                          onPress={() => updateField('sellingPrice', price)}
                          className="flex-row justify-between items-center p-3 border-b border-border dark:border-dark-border"
                        >
                          <ThemedText variant="default">Marge {margin}%</ThemedText>
                          <ThemedText variant="brand" className="font-semibold">
                            {formatCurrency(price)}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Button onPress={() => setShowPriceCalculator(false)}>
                    Fermer
                  </Button>
                </CardContent>
              </Card>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}