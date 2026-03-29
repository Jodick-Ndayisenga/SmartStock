// components/edit-product/ProductAdvanced.tsx
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProductFormData } from '@/hooks/useProductForm';

interface ProductAdvancedProps {
  formData: ProductFormData;
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  isNewProduct: boolean;
  onDelete: () => void;
}

export function ProductAdvanced({
  formData,
  updateField,
  isNewProduct,
  onDelete,
}: ProductAdvancedProps) {
  return (
    <>
      <Card>
        <CardContent className="p-4 gap-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-8 h-8 rounded-full bg-accent-soft dark:bg-dark-accent-soft items-center justify-center">
              <Ionicons name="settings-outline" size={18} color="#dc2626" />
            </View>
            <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
              Paramètres avancés
            </ThemedText>
          </View>

          <View className="flex-row items-center justify-between py-2">
            <View>
              <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                Produit actif
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                Visible dans les ventes
              </ThemedText>
            </View>
            <Switch
              checked={formData.isActive}
              onChange={(v: boolean) => updateField('isActive', v)}
            />
          </View>

          <View className="flex-row items-center justify-between py-2">
            <View>
              <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                Produit périssable
              </ThemedText>
              <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                A une date d'expiration
              </ThemedText>
            </View>
            <Switch
              checked={formData.isPerishable}
              onChange={(v: boolean) => updateField('isPerishable', v)}
            />
          </View>

          {formData.isPerishable && (
            <Input
              label="Durée de conservation (jours)"
              placeholder="30"
              value={String(formData.defaultExpiryDays)}
              onChangeText={(v) => updateField('defaultExpiryDays', parseInt(v) || 0)}
              keyboardType="numeric"
              leftIcon="calendar-outline"
            />
          )}

          <Input
            label="Description"
            placeholder="Description optionnelle du produit"
            value={formData.description}
            onChangeText={(v) => updateField('description', v)}
            multiline
            numberOfLines={3}
            leftIcon="document-text-outline"
          />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {!isNewProduct && (
        <Card className="border-2 border-error/20">
          <CardContent className="p-4">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="w-8 h-8 rounded-full bg-error-soft dark:bg-dark-error-soft items-center justify-center">
                <Ionicons name="warning-outline" size={18} color="#ef4444" />
              </View>
              <ThemedText variant="error" size="base" className="font-semibold">
                Zone dangereuse
              </ThemedText>
            </View>

            <Button
              variant="destructive"
              onPress={onDelete}
              icon="trash-outline"
            >
              Supprimer le produit
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}