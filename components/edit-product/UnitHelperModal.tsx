// components/edit-product/UnitHelperModal.tsx
import React from 'react';
import { View, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProductFormData} from '@/hooks/useProductForm';
import { unitConverter, getUnitInfo, getUnitsByType } from '@/utils/unitConversions';
import { ProductConversionMatrix } from '@/utils/productUnitConversions';

interface UnitHelperModalProps {
  visible: boolean;
  onClose: () => void;
  formData: ProductFormData;
  conversionMatrix: ProductConversionMatrix;
  stockInPurchaseUnits: number;
  stockInSellingUnits: number;
  activeUnitTab: 'purchase' | 'selling' | 'base';
  setActiveUnitTab: (tab: 'purchase' | 'selling' | 'base') => void;
  formatCurrency: (value: number) => string;
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
}

export function UnitHelperModal({
  visible,
  onClose,
  formData,
  conversionMatrix,
  stockInPurchaseUnits,
  stockInSellingUnits,
  activeUnitTab,
  setActiveUnitTab,
  formatCurrency,
  updateField,
}: UnitHelperModalProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-overlay">
        <View className="flex-1 mt-20 bg-surface dark:bg-dark-surface rounded-t-3xl">
          <View className="p-4 border-b border-border dark:border-dark-border">
            <View className="flex-row justify-between items-center">
              <ThemedText variant="heading" size="lg" className="text-text dark:text-dark-text">
                Convertisseur d'unités
              </ThemedText>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-surface-muted dark:bg-dark-surface-muted items-center justify-center"
              >
                <Ionicons name="close" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="p-4">
            {/* Unit Tabs */}
            <View className="flex-row gap-2 mb-6">
              {[
                { key: 'purchase' as const, label: 'Achat', icon: 'arrow-down-circle' },
                { key: 'selling' as const, label: 'Vente', icon: 'arrow-up-circle' },
                { key: 'base' as const, label: 'Base', icon: 'cube' }
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveUnitTab(tab.key)}
                  className={`flex-1 py-3 rounded-lg flex-row items-center justify-center gap-2 ${
                    activeUnitTab === tab.key
                      ? 'bg-brand'
                      : 'bg-surface-muted dark:bg-dark-surface-muted'
                  }`}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={activeUnitTab === tab.key ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')}
                  />
                  <ThemedText
                    variant={activeUnitTab === tab.key ? 'label' : 'muted'}
                    size="sm"
                  >
                    {tab.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Conversion Matrix */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <ThemedText variant="subheading" size="sm" className="text-text dark:text-dark-text mb-4">
                  Facteurs de conversion
                </ThemedText>

                <View className="gap-3">
                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                      1 {formData.purchaseUnit} (achat) =
                    </ThemedText>
                    <ThemedText variant="default" className="text-text dark:text-dark-text font-semibold">
                      {formData.purchaseUnitSize} {formData.baseUnit}
                    </ThemedText>
                  </View>

                  <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                    <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                      1 {formData.sellingUnit} (vente) =
                    </ThemedText>
                    <ThemedText variant="default" className="text-text dark:text-dark-text font-semibold">
                      {getUnitInfo(formData.sellingUnit)?.base || 1} {formData.baseUnit}
                    </ThemedText>
                  </View>

                  <View className="flex-row justify-between items-center py-2 bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg mt-2">
                    <ThemedText variant="default" className="text-text dark:text-dark-text font-medium">
                      1 {formData.purchaseUnit} =
                    </ThemedText>
                    <ThemedText variant="brand" size="lg" className="font-bold">
                      {conversionMatrix.purchaseToSelling.value.toFixed(2)} {formData.sellingUnit}
                    </ThemedText>
                  </View>
                </View>
              </CardContent>
            </Card>

            {/* Stock in different units */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <ThemedText variant="subheading" size="sm" className="text-text dark:text-dark-text mb-4">
                  Stock dans différentes unités
                </ThemedText>

                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                    En {formData.baseUnit} (base):
                  </ThemedText>
                  <ThemedText variant="default" className="text-text dark:text-dark-text">
                    {formData.stockQuantity.toFixed(2)} {formData.baseUnit}
                  </ThemedText>
                </View>

                <View className="flex-row justify-between items-center py-2 border-b border-border dark:border-dark-border">
                  <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                    En {formData.purchaseUnit}:
                  </ThemedText>
                  <ThemedText variant="default" className="text-text dark:text-dark-text">
                    {stockInPurchaseUnits.toFixed(2)} {formData.purchaseUnit}
                  </ThemedText>
                </View>

                <View className="flex-row justify-between items-center py-2">
                  <ThemedText variant="muted" className="text-text-muted dark:text-dark-text-muted">
                    En {formData.sellingUnit}:
                  </ThemedText>
                  <ThemedText variant="default" className="text-text dark:text-dark-text">
                    {stockInSellingUnits.toFixed(2)} {formData.sellingUnit}
                  </ThemedText>
                </View>
              </CardContent>
            </Card>

            {/* Unit suggestions */}
            <Card>
              <CardContent className="p-4">
                <ThemedText variant="subheading" size="sm" className="text-text dark:text-dark-text mb-4">
                  Unités recommandées
                </ThemedText>

                {getUnitsByType(formData.unitType).map((unit) => {
                  if (unit.value === formData.sellingUnit) return null;

                  const conversion = unitConverter.convert(formData.sellingUnit, unit.value, formData.sellingPrice);
                  const priceInUnit = conversion.success ? conversion.value : 0;

                  return (
                    <TouchableOpacity
                      key={unit.value}
                      onPress={() => {
                        updateField('sellingUnit', unit.value);
                        onClose();
                      }}
                      className="flex-row justify-between items-center p-3 rounded-lg mb-2 bg-surface-muted dark:bg-dark-surface-muted"
                    >
                      <View>
                        <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                          {unit.label}
                        </ThemedText>
                        <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                          1 {unit.value} = {unit.base} {formData.baseUnit}
                        </ThemedText>
                      </View>
                      <View className="items-end">
                        <ThemedText variant="brand" size="sm" className="font-semibold">
                          {formatCurrency(priceInUnit)}
                        </ThemedText>
                        <ThemedText variant="muted" size="xs">
                          par unité
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </CardContent>
            </Card>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}