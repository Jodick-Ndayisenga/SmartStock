// components/edit-product/UnitSetupProgress.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemedText } from '@/components/ui/ThemedText';

interface UnitSetupProgressProps {
  setupProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  getUnitSetupProgress: () => Array<{
    id: string;
    label: string;
    completed: boolean;
    current: string;
    icon: string;
    color?: string;
  }>;
  unitValidation: {
    valid: boolean;
    errors: string[];
  };
  formData: {
    unitType: string;
    baseUnit: string;
    purchaseUnit: string;
    sellingUnit: string;
    purchaseUnitSize: number;
  };
  onShowBaseUnitSelector: () => void;
}

export function UnitSetupProgress({
  setupProgress,
  getUnitSetupProgress,
  unitValidation,
  formData,
  onShowBaseUnitSelector,
}: UnitSetupProgressProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Card className="mt-4 border-2 border-brand/20">
      <CardContent className="p-4">
        {/* Header with progress */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center gap-2">
            <View className="w-8 h-8 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
              <Ionicons name="checkmark-done-circle" size={18} color="#0ea5e9" />
            </View>
            <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
              Configuration
            </ThemedText>
          </View>
          
          <View className="flex-row items-center gap-2">
            <View className="px-3 py-1.5 bg-surface-muted dark:bg-dark-surface-muted rounded-full">
              <ThemedText variant="brand" size="xs" className="font-semibold">
                {setupProgress.completed}/{setupProgress.total} complété
              </ThemedText>
            </View>
            <View className="w-16 h-2 bg-surface-muted dark:bg-dark-surface-muted rounded-full overflow-hidden">
              <View 
                className="h-full bg-brand rounded-full"
                style={{ width: `${setupProgress.percentage}%` }}
              />
            </View>
          </View>
        </View>

        {/* Step-by-step guide */}
        <View className="gap-3">
          {getUnitSetupProgress().map((step, index) => {
            const hasError = unitValidation.errors.some(e => 
              e.toLowerCase().includes(step.id.toLowerCase()) ||
              e.toLowerCase().includes(step.label.toLowerCase())
            );
            const stepsArray = getUnitSetupProgress();
            
            return (
              <View key={step.id} className="flex-row items-start gap-3">
                <View className="items-center">
                  <View className={`
                    w-8 h-8 rounded-full items-center justify-center
                    ${step.completed ? 'bg-success/20' : hasError ? 'bg-error/20' : 'bg-surface-muted dark:bg-dark-surface-muted'}
                  `}>
                    <Ionicons 
                      name={step.completed ? 'checkmark' : hasError ? 'alert' : step.icon as any}
                      size={16}
                      color={
                        step.completed ? '#22c55e' : 
                        hasError ? '#ef4444' : 
                        isDark ? '#94a3b8' : '#64748b'
                      }
                    />
                  </View>
                  {index < stepsArray.length - 1 && (
                    <View className={`
                      w-0.5 h-8 mt-1
                      ${step.completed ? 'bg-success/30' : 'bg-surface-muted dark:bg-dark-surface-muted'}
                    `} />
                  )}
                </View>

                <View className="flex-1 pb-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <ThemedText 
                        variant="default" 
                        size="sm" 
                        className={`
                          font-medium
                          ${step.completed ? 'text-success' : 
                            hasError ? 'text-error' : 'text-text dark:text-dark-text'}
                        `}
                      >
                        {step.label}
                      </ThemedText>
                      {step.completed && (
                        <View className="px-2 py-0.5 bg-success/10 rounded-full">
                          <ThemedText variant="success" size="xs" className="font-medium">
                            Complété
                          </ThemedText>
                        </View>
                      )}
                      {hasError && !step.completed && (
                        <View className="px-2 py-0.5 bg-error/10 rounded-full">
                          <ThemedText variant="error" size="xs" className="font-medium">
                            À corriger
                          </ThemedText>
                        </View>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center gap-2 mt-1">
                    <Ionicons 
                      name="information-circle-outline" 
                      size={14} 
                      color={isDark ? '#475569' : '#94a3b8'} 
                    />
                    <ThemedText variant="muted" size="xs" className="flex-1">
                      {step.current}
                    </ThemedText>
                  </View>

                  {hasError && !step.completed && (
                    <View className="mt-2 p-2 bg-error/10 rounded-lg">
                      <ThemedText variant="error" size="xs" className="font-medium">
                        {unitValidation.errors.find(e => 
                          e.toLowerCase().includes(step.id.toLowerCase()) ||
                          e.toLowerCase().includes(step.label.toLowerCase())
                        )}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Validation summary */}
        {!unitValidation.valid && (
          <View className="mt-4 p-4 bg-error/10 border border-error/20 rounded-lg">
            <View className="flex-row items-center gap-2 mb-2">
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <ThemedText variant="error" size="sm" className="font-semibold">
                Problèmes à résoudre
              </ThemedText>
            </View>
            
            {unitValidation.errors.map((error, index) => (
              <View key={index} className="flex-row items-start gap-2 mb-2">
                <Ionicons name="close-circle" size={16} color="#ef4444" style={{ marginTop: 2 }} />
                <ThemedText variant="error" size="xs" className="flex-1">
                  {error}
                </ThemedText>
              </View>
            ))}

            <View className="mt-3 p-3 bg-info-soft dark:bg-dark-info-soft rounded-lg">
              {unitValidation.errors.length > 0 && (
                <View className="flex-row items-center gap-2 mb-2">
                  <Ionicons name="bulb-outline" size={16} color="#0ea5e9" />
                  <ThemedText variant="brand" size="xs" className="font-medium">
                    Suggestions
                  </ThemedText>
                </View>
              )}
              
              {unitValidation.errors.map((error, index) => {
                if (error.includes('type') && !formData.unitType) {
                  return (
                    <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                      • Sélectionnez d'abord le type d'unité (pièce, poids, volume, etc.)
                    </ThemedText>
                  );
                }
                if (error.includes('base') && !formData.baseUnit) {
                  return (
                    <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                      • Choisissez l'unité de base (kg pour poids, L pour volume, etc.)
                    </ThemedText>
                  );
                }
                if (error.includes('purchase') && !formData.purchaseUnit) {
                  return (
                    <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                      • Sélectionnez l'unité d'achat (comment vous achetez le produit)
                    </ThemedText>
                  );
                }
                if (error.includes('selling') && !formData.sellingUnit) {
                  return (
                    <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                      • Sélectionnez l'unité de vente (comment vous vendez le produit)
                    </ThemedText>
                  );
                }
                if (error.includes('size') && formData.purchaseUnitSize <= 0) {
                  return (
                    <ThemedText key={index} variant="muted" size="xs" className="mb-1 ml-2">
                      • Vérifiez la taille de l'unité d'achat (nombre de {formData.baseUnit} par {formData.purchaseUnit})
                    </ThemedText>
                  );
                }
                return null;
              })}
            </View>
          </View>
        )}

        {/* Success message */}
        {unitValidation.valid && (
          <View className="mt-4 p-4 bg-success/10 border border-success/20 rounded-lg">
            <View className="flex-row items-center gap-2">
              <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
              <View className="flex-1">
                <ThemedText variant="success" size="sm" className="font-semibold">
                  Configuration complète !
                </ThemedText>
                <ThemedText variant="success" size="xs" className="opacity-80">
                  Toutes les unités sont correctement configurées. Vous pouvez enregistrer le produit.
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Quick actions */}
        <View className="flex-row gap-2 mt-4">
          {!formData.unitType && (
            <Button
              variant="outline"
              size="sm"
              icon="arrow-up-outline"
              className="flex-1"
            >
              Commencer par le type d'unité
            </Button>
          )}
          
          {formData.unitType && !formData.baseUnit && (
            <Button
              variant="outline"
              size="sm"
              onPress={onShowBaseUnitSelector}
              icon="cube-outline"
              className="flex-1"
            >
              Choisir l'unité de base
            </Button>
          )}
          
          {formData.baseUnit && !formData.purchaseUnit && (
            <Button
              variant="outline"
              size="sm"
              icon="arrow-down-circle-outline"
              className="flex-1"
            >
              Sélectionner unité d'achat
            </Button>
          )}
          
          {formData.purchaseUnit && !formData.sellingUnit && (
            <Button
              variant="outline"
              size="sm"
              icon="arrow-up-circle-outline"
              className="flex-1"
            >
              Sélectionner unité de vente
            </Button>
          )}
        </View>
      </CardContent>
    </Card>
  );
}