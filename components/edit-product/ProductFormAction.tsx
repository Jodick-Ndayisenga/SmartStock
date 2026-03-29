// components/edit-product/ProductFormActions.tsx
import React from 'react';
import { View, Alert } from 'react-native';
import { Button } from '@/components/ui/Button';

interface ProductFormActionsProps {
  saving: boolean;
  isNewProduct: boolean;
  hasUnsavedChanges: boolean;
  unitValidationValid: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export function ProductFormActions({
  saving,
  isNewProduct,
  hasUnsavedChanges,
  unitValidationValid,
  onCancel,
  onSave,
}: ProductFormActionsProps) {
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        'Annuler',
        'Voulez-vous vraiment annuler ? Les modifications seront perdues.',
        [
          { text: 'Continuer', style: 'cancel' },
          { text: 'Annuler', onPress: onCancel }
        ]
      );
    } else {
      onCancel();
    }
  };

  return (
    <View className="flex-row gap-3 pt-4">
      <Button
        variant="outline"
        onPress={handleCancel}
        className="flex-1"
      >
        Annuler
      </Button>

      <Button
        variant="default"
        onPress={onSave}
        loading={saving}
        className="flex-1"
        disabled={!unitValidationValid}
      >
        {saving ? 'Sauvegarde...' : (isNewProduct ? 'Créer' : 'Enregistrer')}
      </Button>
    </View>
  );
}