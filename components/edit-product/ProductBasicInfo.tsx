// components/edit-product/ProductBasicInfo.tsx
import React from 'react';
import { View, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useColorScheme } from 'nativewind';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProductFormData } from '@/hooks/useProductForm';
import { useProductMovementInfo } from '@/hooks/useProductMovementInfo';

const CATEGORIES = [
  { value: 'food', label: '🍚 Aliments' },
  { value: 'drinks', label: '🧃 Boissons' },
  { value: 'clothing', label: '👕 Vêtements' },
  { value: 'electronics', label: '📱 Électronique' },
  { value: 'household', label: '🏠 Ménager' },
  { value: 'health', label: '💊 Santé' },
  { value: 'construction', label: '🔨 Construction' },
  { value: 'agriculture', label: '🌾 Agriculture' },
  { value: 'other', label: '📦 Autre' },
];

interface ProductBasicInfoProps {
  formData: ProductFormData;
  updateField: <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) => void;
  imageUploading: boolean;
  generateSku: () => string;
  productId?: string; // Add this prop
}

export function ProductBasicInfo({ 
  formData, 
  updateField, 
  imageUploading,
  generateSku,
  productId,
}: ProductBasicInfoProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { hasMovement, movementCount, loading } = useProductMovementInfo(productId);

  const handleImagePick = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à vos photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateField('imageUrl', result.assets[0].uri);
        updateField('imageThumbnailUrl', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Erreur', 'Impossible de choisir l\'image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        updateField('imageUrl', result.assets[0].uri);
        updateField('imageThumbnailUrl', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  return (
    <>
      {/* Image Section */}
      <Card>
        <CardContent className="p-4">
          <View className="items-center">
            <View className="w-32 h-32 rounded-xl bg-surface-muted dark:bg-dark-surface-muted items-center justify-center mb-4 overflow-hidden border-2 border-dashed border-border-strong dark:border-dark-border-strong">
              {imageUploading ? (
                <ActivityIndicator size="large" color="#0ea5e9" />
              ) : formData.imageUrl ? (
                <Image
                  source={{ uri: formData.imageUrl }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="items-center">
                  <Ionicons name="camera-outline" size={40} color={isDark ? '#475569' : '#94a3b8'} />
                  <ThemedText variant="muted" size="xs" className="mt-2">Ajouter une photo</ThemedText>
                </View>
              )}
            </View>

            <View className="flex-row items-center justify-center gap-3 mt-2">
              <TouchableOpacity
                onPress={handleImagePick}
                disabled={imageUploading}
                className="px-4 py-2 rounded-lg flex-row items-center bg-surface-muted dark:bg-dark-surface-muted border border-border dark:border-dark-border"
                style={{ opacity: imageUploading ? 0.5 : 1 }}
              >
                <Ionicons name="image-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                <ThemedText variant="muted" size="sm" className="ml-2">Galerie</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTakePhoto}
                disabled={imageUploading}
                className="px-4 py-2 rounded-lg flex-row items-center bg-surface-muted dark:bg-dark-surface-muted border border-border dark:border-dark-border"
                style={{ opacity: imageUploading ? 0.5 : 1 }}
              >
                <Ionicons name="camera-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                <ThemedText variant="muted" size="sm" className="ml-2">Photo</ThemedText>
              </TouchableOpacity>

              {formData.imageUrl && (
                <TouchableOpacity
                  onPress={() => {
                    updateField('imageUrl', '');
                    updateField('imageThumbnailUrl', '');
                  }}
                  className="px-4 py-2 rounded-lg flex-row items-center bg-error/10 border border-error/30"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <ThemedText variant="error" size="sm" className="ml-2">Supprimer</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </CardContent>
      </Card>

      {/* Basic Info Form */}
      <Card>
        <CardContent className="p-4 gap-4">
          <View className="flex-row items-center gap-2 mb-2">
            <View className="w-8 h-8 rounded-full bg-brand-soft dark:bg-dark-brand-soft items-center justify-center">
              <Ionicons name="information-circle" size={18} color="#0ea5e9" />
            </View>
            <ThemedText variant="subheading" size="base" className="text-text dark:text-dark-text">
              Informations de base
            </ThemedText>
          </View>

          <Input
            label="Nom du produit *"
            placeholder="Ex: Sucre, Riz, T-shirt..."
            value={formData.name}
            onChangeText={(v) => updateField('name', v)}
            leftIcon="cube-outline"
            autoFocus
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Code (SKU)"
                placeholder="Généré automatiquement"
                value={formData.sku}
                onChangeText={(v) => updateField('sku', v)}
                leftIcon="barcode-outline"
                rightIcon={!formData.sku ? "refresh-outline" : undefined}
                onRightIconPress={() => {
                  if (formData.name) {
                    updateField('sku', generateSku());
                  } else {
                    Alert.alert('Info', 'Entrez d\'abord le nom du produit');
                  }
                }}
              />
            </View>
            <View className="flex-1">
              <Select
                label="Catégorie"
                placeholder="Choisir"
                value={formData.category}
                onValueChange={(v) => updateField('category', v)}
                options={CATEGORIES}
                disabled={hasMovement} // Disable if there are movements
              />
            </View>
          </View>

          <Input
            label="Code-barres (optionnel)"
            placeholder="Scanner ou saisir"
            value={formData.barcode}
            onChangeText={(v) => updateField('barcode', v)}
            leftIcon="scan-outline"
          />
        </CardContent>
      </Card>
    </>
  );
}