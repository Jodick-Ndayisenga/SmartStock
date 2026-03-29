// components/edit-product/ProductUnits.tsx
import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProductFormData} from '@/hooks/useProductForm';
import { getUnitInfo, getUnitsByType } from '@/utils/unitConversions';
import { ProductConversionMatrix } from '@/utils/productUnitConversions';
import { useProductMovementInfo } from '@/hooks/useProductMovementInfo';

const UNIT_TYPES = [
  { value: 'piece', label: '📦 Pièce', icon: 'cube-outline', description: 'Articles unitaires' },
  { value: 'weight', label: '⚖️ Poids', icon: 'scale-outline', description: 'kg, g, sacs...' },
  { value: 'volume', label: '🧴 Volume', icon: 'flask-outline', description: 'litres, bidons...' },
  { value: 'length', label: '📏 Longueur', icon: 'resize-outline', description: 'mètres, rouleaux...' },
  { value: 'pack', label: '📎 Paquet', icon: 'archive-outline', description: 'lots, cartons...' },
];

interface ProductUnitsProps {
  formData: ProductFormData;
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  conversionMatrix: ProductConversionMatrix;
  selectedUnitCategory: 'all' | 'piece' | 'pack' | 'weight' | 'volume' | 'length';
  setSelectedUnitCategory: (category: 'all' | 'piece' | 'pack' | 'weight' | 'volume' | 'length') => void;
  showBaseUnitSelector: boolean;
  setShowBaseUnitSelector: (show: boolean) => void;
  getAvailableBaseUnits: () => { value: string; label: string }[];
  handleBaseUnitChange: (unit: string) => void;
  getFilteredSellingUnits: () => { value: string; label: string }[];
  getCategoryCount: (category: string) => number;
  productId?: string;
}

export function ProductUnits({
  formData,
  updateField,
  conversionMatrix,
  selectedUnitCategory,
  setSelectedUnitCategory,
  showBaseUnitSelector,
  setShowBaseUnitSelector,
  getAvailableBaseUnits,
  handleBaseUnitChange,
  getFilteredSellingUnits,
  getCategoryCount,
  productId
}: ProductUnitsProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { hasMovement, movementCount, loading } = useProductMovementInfo(productId);

  const unitsForType = getUnitsByType(formData.unitType);

  return (
    <Card>
      <CardContent className="p-4 gap-4">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 rounded-full bg-success-soft dark:bg-dark-success-soft items-center justify-center">
            <Ionicons name="scale-outline" size={18} color="#22c55e" />
          </View>
          <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
            Unités et prix
          </ThemedText>
        </View>

        <Select
          label="Type d'unité"
          value={formData.unitType}
          onValueChange={(v) => updateField('unitType', v as any)}
          options={UNIT_TYPES}
          disabled={hasMovement} // Disable if there are movements
        />

        {/* Base Unit - Now Editable */}
        <View className="mt-2">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-6 h-6 rounded-full bg-accent-soft dark:bg-dark-accent-soft items-center justify-center">
                <Ionicons name="cube-outline" size={14} color="#dc2626" />
              </View>
              <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text font-medium">
                Unité de base
              </ThemedText>
            </View>
            
            <TouchableOpacity
              onPress={() => setShowBaseUnitSelector(!showBaseUnitSelector)}
              className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-surface-muted dark:bg-dark-surface-muted"
              disabled={hasMovement} // Disable if there are movements
            >
              <Ionicons 
                name={showBaseUnitSelector ? "checkmark" : "pencil"} 
                size={14} 
                color={isDark ? '#94a3b8' : '#64748b'} 
              />
              <ThemedText variant="muted" size="xs">
                {showBaseUnitSelector ? 'Confirmer' : 'Modifier'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {!showBaseUnitSelector ? (
            <TouchableOpacity
              onPress={() => setShowBaseUnitSelector(true)}
              disabled={hasMovement} // Disable if there are movements
              className="flex-row items-center justify-between p-2 bg-surface-muted dark:bg-dark-surface-muted rounded-md border border-border dark:border-dark-border"
            >
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
                  <Ionicons name="cube" size={20} color="#0ea5e9" />
                </View>
                <View>
                  <ThemedText variant="default" size="lg" className="font-semibold text-text dark:text-dark-text">
                    {getUnitInfo(formData.baseUnit)?.label || formData.baseUnit}
                  </ThemedText>
                  <ThemedText variant="muted" size="xs">
                    {formData.unitType === 'weight' ? 'Base: Kilogramme' :
                     formData.unitType === 'volume' ? 'Base: Litre' :
                     formData.unitType === 'length' ? 'Base: Mètre' :
                     formData.unitType === 'piece' ? 'Base: Pièce' :
                     'Base: Pièce (pour packs)'}
                  </ThemedText>
                </View>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="px-2 py-1 bg-surface dark:bg-dark-surface rounded-full">
                  <ThemedText variant="brand" size="xs" className="font-mono">
                    1 {formData.baseUnit}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#475569' : '#94a3b8'} />
              </View>
            </TouchableOpacity>
          ) : (
            <View className="p-4 bg-surface-muted dark:bg-dark-surface-muted rounded-xl border-2 border-brand/30">
              <View className="flex-row items-center gap-2 mb-4 p-3 bg-info-soft dark:bg-dark-info-soft rounded-lg">
                <Ionicons name="information-circle" size={20} color="#0ea5e9" />
                <ThemedText variant="muted" size="xs" className="flex-1">
                  L'unité de base est l'unité fondamentale dans laquelle le stock est stocké. 
                  Toutes les conversions sont basées sur cette unité.
                </ThemedText>
              </View>

              <View className="flex-row items-center gap-2 mb-3">
                <View className="px-3 py-1 rounded-full bg-surface dark:bg-dark-surface">
                  <ThemedText variant="brand" size="xs" className="font-semibold">
                    {formData.unitType === 'weight' ? '⚖️ Poids' :
                     formData.unitType === 'volume' ? '🧴 Volume' :
                     formData.unitType === 'length' ? '📏 Longueur' :
                     formData.unitType === 'piece' ? '📦 Pièce' : '📎 Pack'}
                  </ThemedText>
                </View>
                <ThemedText variant="muted" size="xs">
                  {formData.unitType === 'pack' 
                    ? 'Les packs utilisent la pièce comme base' 
                    : 'Choisissez l\'unité fondamentale'}
                </ThemedText>
              </View>

              <View className="gap-2">
                {getAvailableBaseUnits().map((unit) => {
                  const unitInfo = getUnitInfo(unit.value);
                  const isSelected = formData.baseUnit === unit.value;
                  const isRecommended = unit.value === (
                    formData.unitType === 'weight' ? 'kg' :
                    formData.unitType === 'volume' ? 'l' :
                    formData.unitType === 'length' ? 'm' :
                    formData.unitType === 'piece' ? 'piece' : 'piece'
                  );

                  return (
                    <TouchableOpacity
                      key={unit.value}
                      disabled={hasMovement} // Disable if there are movements
                      onPress={() => handleBaseUnitChange(unit.value)}
                      className={`flex-row items-center p-3 rounded-lg border ${
                        isSelected 
                          ? 'bg-brand/10 border-brand' 
                          : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                      }`}
                    >
                      <View className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                        isSelected 
                          ? 'border-brand' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && (
                          <View className="w-3 h-3 rounded-full bg-brand" />
                        )}
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <ThemedText 
                            variant={isSelected ? 'brand' : 'default'} 
                            size="sm"
                            className={isSelected ? 'font-semibold' : ''}
                          >
                            {unit.label}
                          </ThemedText>
                          {isRecommended && (
                            <View className="px-2 py-0.5 bg-success/10 rounded-full">
                              <ThemedText variant="success" size="xs" className="font-medium">
                                Recommandé
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <ThemedText variant="muted" size="xs" className="mt-1">
                          {unitInfo?.description || `1 ${unit.value} = 1 ${formData.baseUnit}`}
                        </ThemedText>
                      </View>

                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={20} color="#0ea5e9" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {formData.unitType === 'pack' && (
                <View className="mt-4 p-3 bg-warning-soft dark:bg-dark-warning-soft rounded-lg">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="warning-outline" size={18} color="#f59e0b" />
                    <ThemedText variant="warning" size="xs" className="flex-1">
                      Les packs utilisent toujours la pièce comme unité de base. 
                      La taille du pack est définie par le nombre de pièces qu'il contient.
                    </ThemedText>
                  </View>
                </View>
              )}

              <View className="flex-row gap-3 mt-4">
                <TouchableOpacity
                  disabled={hasMovement} // Disable if there are movements
                  onPress={() => setShowBaseUnitSelector(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border dark:border-dark-border items-center"
                >
                  <ThemedText variant="muted" size="sm">Annuler</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={hasMovement} // Disable if there are movements
                  onPress={() => setShowBaseUnitSelector(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-brand items-center"
                >
                  <ThemedText variant="label" size="sm" className="text-white">Confirmer</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Purchase Unit */}
        <View className="flex-row gap-3 mt-2">
          <View className="flex-1">
            <Select
              label="Unité d'achat"
              disabled={hasMovement} // Disable if there are movements
              value={formData.purchaseUnit}
              onValueChange={(v) => updateField('purchaseUnit', v)}
              options={unitsForType.map(u => ({ value: u.value, label: u.label }))}
            />
          </View>
          <View className="flex-1">
            <Input
              label={`Quantité en ${formData.baseUnit}`}
              value={`${formData.purchaseUnitSize} ${formData.baseUnit}${formData.purchaseUnitSize > 1 ? 's' : ''}`}
              editable={false}
              leftIcon="swap-horizontal-outline"
              className="bg-surface-muted dark:bg-dark-surface-muted"
              readOnly
              disabled
            />
          </View>
        </View>

        {/* Purchase Unit Size (Manual override) */}
        <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-lg">
          <ThemedText variant="muted" size="xs" className="mb-2">
            Ajustement manuel (si différent de la valeur par défaut)
          </ThemedText>
          <View className="flex-row items-center gap-3">
            <View className="flex-1">
              <Input
                readOnly={hasMovement} // Disable if there are movements
                label={`Nombre de ${formData.baseUnit}${formData.purchaseUnitSize > 1 ? 's' : ''} par ${formData.purchaseUnit}`}
                placeholder={String(getUnitInfo(formData.purchaseUnit)?.base || 1)}
                value={String(formData.purchaseUnitSize)}
                onChangeText={(v) => {
                  const newSize = parseFloat(v) || 0.001;
                  updateField('purchaseUnitSize', newSize);
                }}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
            disabled={hasMovement} // Disable if there are movements
              onPress={() => {
                const defaultSize = getUnitInfo(formData.purchaseUnit)?.base || 1;
                updateField('purchaseUnitSize', defaultSize);
              }}
              className="p-2"
            >
              <Ionicons name="refresh" size={20} color={isDark ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Selling Unit Section */}
        <View className="mt-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
                <Ionicons name="pricetag-outline" size={16} color="#0ea5e9" />
              </View>
              <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
                Unité de vente
              </ThemedText>
            </View>
            
            <TouchableOpacity
            disabled={hasMovement} // Disable if there are movements
              onPress={() => setSelectedUnitCategory('all')}
              className={`px-4 py-2 rounded-full flex-row items-center gap-2 ${
                selectedUnitCategory === 'all' 
                  ? 'bg-brand' 
                  : 'bg-surface-muted dark:bg-dark-surface-muted'
              }`}
            >
              <Ionicons 
                name="apps-outline" 
                size={16} 
                color={selectedUnitCategory === 'all' ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
              />
              <ThemedText 
                variant={selectedUnitCategory === 'all' ? 'label' : 'default'} 
                size="sm"
                className={selectedUnitCategory === 'all' ? 'text-white' : ''}
              >
                Tous ({getCategoryCount('all')})
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            className="pb-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {['pack', 'piece', 'weight', 'volume', 'length'].map((category) => (
              <TouchableOpacity
                key={category}
                disabled={hasMovement} // Disable if there are movements
                onPress={() => setSelectedUnitCategory(category as any)}
                className={`flex-row items-center px-4 py-2.5 rounded-full border ${
                  selectedUnitCategory === category
                    ? 'bg-brand border-brand'
                    : 'bg-surface dark:bg-dark-surface border-border dark:border-dark-border'
                }`}
              >
                <Ionicons 
                  name={category === 'pack' ? 'archive-outline' : 
                        category === 'piece' ? 'cube-outline' :
                        category === 'weight' ? 'scale-outline' :
                        category === 'volume' ? 'flask-outline' : 'resize-outline'} 
                  size={16} 
                  color={selectedUnitCategory === category ? '#ffffff' : (isDark ? '#94a3b8' : '#64748b')} 
                  style={{ marginRight: 6 }}
                />
                <ThemedText 
                  variant={selectedUnitCategory === category ? 'label' : 'default'} 
                  size="sm"
                  className={selectedUnitCategory === category ? 'text-white' : ''}
                >
                  {category === 'pack' ? 'Packs / Lots' :
                   category === 'piece' ? 'Pièces' :
                   category === 'weight' ? 'Poids' :
                   category === 'volume' ? 'Volume' : 'Longueur'} ({getCategoryCount(category)})
                </ThemedText>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Select
                label="Choisir une unité"
                value={formData.sellingUnit}
                onValueChange={(v) => updateField('sellingUnit', v)}
                options={getFilteredSellingUnits()}
                disabled={hasMovement} // Disable if there are movements
                placeholder={selectedUnitCategory === 'all' 
                  ? "Toutes les unités..." 
                  : `Unités de ${selectedUnitCategory === 'piece' ? 'pièces' : 
                                selectedUnitCategory === 'pack' ? 'packs' :
                                selectedUnitCategory === 'weight' ? 'poids' :
                                selectedUnitCategory === 'volume' ? 'volume' : 'longueur'}...`}
                leftIcon="arrow-up-circle-outline"
              />
              <ThemedText variant="muted" size="xs" className="mt-1 ml-1">
                {getFilteredSellingUnits().length} unité(s) disponible(s)
              </ThemedText>
            </View>
            
            <View className="flex-1">
              <Input
                readOnly={hasMovement} // Disable if there are movements
                label={`Équivalent en ${formData.baseUnit}`}
                value={`1 ${formData.sellingUnit} = ${getUnitInfo(formData.sellingUnit)?.base || 1} ${formData.baseUnit}`}
                editable={false}
                leftIcon="swap-horizontal-outline"
                className="bg-surface-muted dark:bg-dark-surface-muted"
              />
            </View>
          </View>

          {selectedUnitCategory !== 'all' && (
            <View className="mt-3">
              <ThemedText variant="muted" size="xs" className="mb-2">
                Suggestions rapides:
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {getFilteredSellingUnits().slice(0, 5).map((unit) => (
                  <TouchableOpacity
                    key={unit.value}
                    disabled={hasMovement} // Disable if there are movements
                    onPress={() => updateField('sellingUnit', unit.value)}
                    className={`px-3 py-1.5 rounded-full border ${
                      formData.sellingUnit === unit.value
                        ? 'bg-brand border-brand'
                        : 'bg-surface-muted dark:bg-dark-surface-muted border-border dark:border-dark-border'
                    }`}
                  >
                    <ThemedText 
                      variant={formData.sellingUnit === unit.value ? 'label' : 'default'} 
                      size="xs"
                      className={formData.sellingUnit === unit.value ? 'text-white' : ''}
                    >
                      {unit.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Show conversion between purchase and selling units if different */}
        {formData.sellingUnit !== formData.purchaseUnit && (
          <View className="bg-surface-muted dark:bg-dark-surface-muted p-3 rounded-sm">
            <View className="flex-row justify-between items-center">
              <ThemedText variant="muted" size="xs">Conversion achat → vente:</ThemedText>
              <ThemedText variant="default" size="sm" className="font-semibold">
                1 {formData.purchaseUnit} = {conversionMatrix.purchaseToSelling.value.toFixed(2)} {formData.sellingUnit}
              </ThemedText>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <ThemedText variant="muted" size="xs">Conversion vente → achat:</ThemedText>
              <ThemedText variant="default" size="sm" className="font-semibold">
                1 {formData.sellingUnit} = {conversionMatrix.sellingToPurchase.value.toFixed(2)} {formData.purchaseUnit}
              </ThemedText>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );
}