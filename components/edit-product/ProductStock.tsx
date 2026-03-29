// components/edit-product/ProductStock.tsx - MODIFIED VERSION

import React from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProductFormData, ProfitAnalysis } from '@/hooks/useProductForm';

interface ProductStockProps {
  formData: ProductFormData;
  stockInPurchaseUnits: number;
  stockInSellingUnits: number;
  profitAnalysis: ProfitAnalysis;
  formatCurrency: (value: number) => string;
  productId: string;  // Add this prop
}

export function ProductStock({
  formData,
  stockInPurchaseUnits,
  stockInSellingUnits,
  profitAnalysis,
  formatCurrency,
  productId,
}: ProductStockProps) {
  const router = useRouter();

  const getStockStatus = () => {
    if (formData.stockQuantity === 0) {
      return { text: 'Rupture', variant: 'error' as const };
    }
    if (formData.stockQuantity <= formData.lowStockThreshold) {
      return { text: 'Stock bas', variant: 'warning' as const };
    }
    return { text: 'En stock', variant: 'success' as const };
  };

  const stockStatus = getStockStatus();

  return (
    <Card>
      <CardContent className="p-4 gap-4">
        {/* Header with Adjust button */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-info-soft dark:bg-dark-info-soft items-center justify-center">
              <Ionicons name="cube-outline" size={18} color="#0ea5e9" />
            </View>
            <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
              Gestion de stock
            </ThemedText>
          </View>
          
          {/* Adjust Stock Button */}
          <TouchableOpacity
            onPress={() => router.push(`/adjust-stock/${productId}`)}
            className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/30"
          >
            <Ionicons name="create-outline" size={14} color="#0ea5e9" />
            <ThemedText variant="brand" size="xs" className="font-medium">
              Ajuster
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stock display - READ ONLY */}
        <View className="bg-surface-muted dark:bg-dark-surface-muted p-4 rounded-lg">
          <View className="flex-row justify-between items-center mb-3">
            <ThemedText variant="default" size="sm" className="font-medium">
              Stock actuel
            </ThemedText>
            <View className={`px-2 py-1 rounded-full bg-${stockStatus.variant}/10`}>
              <ThemedText variant={stockStatus.variant} size="xs">
                {stockStatus.text}
              </ThemedText>
            </View>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <ThemedText variant="muted" size="xs">En {formData.purchaseUnit}s:</ThemedText>
            <ThemedText variant="default" size="sm">
              {stockInPurchaseUnits.toFixed(2)} {formData.purchaseUnit}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center mb-2">
            <ThemedText variant="muted" size="xs">En {formData.baseUnit}:</ThemedText>
            <ThemedText variant="default" size="lg" className="font-bold text-brand">
              {formData.stockQuantity.toFixed(2)} {formData.baseUnit}
            </ThemedText>
          </View>

          <View className="flex-row justify-between items-center">
            <ThemedText variant="muted" size="xs">En {formData.sellingUnit}s:</ThemedText>
            <ThemedText variant="default" size="sm">
              {stockInSellingUnits.toFixed(2)} {formData.sellingUnit}
            </ThemedText>
          </View>
        </View>

        {/* Stock Value Summary */}
        <View className="bg-surface-muted dark:bg-dark-surface-muted p-4 rounded-lg">
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText variant="muted" size="xs">Valeur du stock (coût):</ThemedText>
            <ThemedText variant="default" size="sm" className="font-semibold">
              {formatCurrency(profitAnalysis.stockValue)}
            </ThemedText>
          </View>
          <View className="flex-row justify-between items-center">
            <ThemedText variant="muted" size="xs">Revenu potentiel:</ThemedText>
            <ThemedText variant="success" size="sm" className="font-semibold">
              {formatCurrency(profitAnalysis.potentialRevenue)}
            </ThemedText>
          </View>
        </View>

        {/* Low Stock Threshold - Still editable */}
        <View className="flex-row items-center justify-between py-2">
          <View>
            <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
              Seuil d'alerte stock bas
            </ThemedText>
            <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
              {formData.lowStockThreshold} {formData.baseUnit}
            </ThemedText>
          </View>
          <TouchableOpacity
            onPress={() => {
              // You can still edit threshold if needed
              Alert.alert('Modifier seuil', 'Enter new threshold', [
                { text: 'Annuler' },
                { 
                  text: 'Modifier',
                  onPress: () => {
                    // Add logic to edit threshold
                  }
                }
              ]);
            }}
          >
            <Ionicons name="create-outline" size={20} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
      </CardContent>
    </Card>
  );
}