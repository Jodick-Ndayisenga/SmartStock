// components/SeedModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { Button } from '@/components/ui/Button';
import { defaultProducts } from '@/constants/Products';
import database from '@/database';
import { Product, UnitType } from '@/database/models/Product';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';

const productCollections = database.get<Product>('products');

interface SeedModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SeedModal({ visible, onClose }: SeedModalProps) {
  const [progress, setProgress] = useState<{ done: number; total: number; lastName?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const router = useRouter();

  const { hasSeedsForCurrentShop, currentShop, updateHasSeeds } = useAuth();
  const totalProducts = defaultProducts.length;
  const percent = progress ? Math.round((progress.done / Math.max(progress.total, 1)) * 100) : 0;

  // Helper: Create products in smaller batches to avoid long-running transactions
  // components/SeedModal.tsx
const createProductBatch = async (batch: typeof defaultProducts) => {
  if (!currentShop.id) return;
  try {
    await database.write(async () => {
      for (const productData of batch) {

        console.log(`Creating product: ${productData.name}`);
        const pd = await productCollections.create((product) => {
          product.name = productData.name;
          product.sku = productData.sku ?? '';
          product.category = productData.category ?? 'Uncategorized';
          product.unitType = (productData.unitType as UnitType) ?? 'piece';
          product.isWeighted = productData.isWeighted ?? false;
          product.baseUnit = productData.baseUnit ?? 'piece';
          product.purchaseUnit = productData.purchaseUnit ?? 'piece';
          product.sellingUnit = productData.sellingUnit ?? 'piece';
          product.purchaseUnitSize = productData.purchaseUnitSize ?? 1;
          product.unitConversionFactor = productData.unitConversionFactor ?? 1;
          product.costPricePerBase = 0;
          product.sellingPricePerBase = 0;
          product.shopId = currentShop.id;
          product.isActive = false;
          product.stockQuantity = 0; // Add this if missing
        });

        console.log(`Product created with ID: ${pd}`);
      }
    });
    console.log(`✅ Batch of ${batch.length} products created successfully`);
  } catch (error) {
    console.error('❌ Error creating product batch:', error);
    throw error;
  }
};

  const populateProducts = async () => {
    if (!currentShop?.id) {
      throw new Error('Cannot seed: current shop ID is missing');
    }

    setError(null);
    setProgress({ done: 0, total: totalProducts, lastName: 'Démarrage...' });

    try {
      // Optional: split into chunks of 20 to reduce transaction pressure
      const CHUNK_SIZE = 20;
      for (let i = 0; i < totalProducts; i += CHUNK_SIZE) {
        const chunk = defaultProducts.slice(i, i + CHUNK_SIZE);
        await createProductBatch(chunk);

        // Update progress after each chunk
        const done = Math.min(i + CHUNK_SIZE, totalProducts);
        setProgress({
          done,
          total: totalProducts,
          lastName: chunk[chunk.length - 1]?.name ?? '...',
        });
      }

      setIsComplete(true);
    } catch (err) {
      console.error('❌ Failed to seed products:', err);
      setError(err instanceof Error ? err.message : 'Échec de la création des produits');
      throw err;
    }
  };

  // Auto-trigger seeding only when conditions are met
  useEffect(() => {
  let isCancelled = false;

  const attemptSeeding = async () => {
    console.log('🔍 SeedModal conditions:', {
      visible,
      hasSeedsForCurrentShop,
      currentShopId: currentShop?.id,
      isComplete,
      error
    });

    if (
      visible &&
      hasSeedsForCurrentShop === false &&
      currentShop?.id &&
      !isComplete &&
      !error
    ) {
      console.log('🚀 Starting product seeding...');
      try {
        await populateProducts();
        if (!isCancelled) {
          console.log('✅ Seeding completed, updating hasSeeds...');
          await updateHasSeeds(currentShop.id, true);
          onClose();
          router.push('/(tabs)/products');
        }
      } catch (err) {
        console.error('💥 Seeding failed:', err);
      }
    } else {
      console.log('⏸️ Seeding skipped - conditions not met');
    }
  };

  attemptSeeding();

  return () => {
    isCancelled = true;
  };
}, [visible, hasSeedsForCurrentShop, currentShop?.id, isComplete, error, onClose, updateHasSeeds]);

  // If seeding is done but modal still open (e.g., after error recovery), allow manual close
  const handleClose = () => {
    if (isComplete || error) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 items-center justify-center bg-black/40 p-6">
        <View className="w-full max-w-md bg-surface dark:bg-dark-surface rounded-xl p-5">
          <View className="flex-row items-center mb-3">
            <ActivityIndicator size="small" />
            <ThemedText size="lg" className="ml-3 font-inter-semibold">
              Préparation du catalogue
            </ThemedText>
          </View>

          {error ? (
            <View className="mb-4">
              <ThemedText variant="error" className="text-sm">
                ❌ {error}
              </ThemedText>
              <ThemedText className="text-xs mt-2 text-text-muted dark:text-dark-text-muted">
                Veuillez réessayer ou contacter le support.
              </ThemedText>
            </View>
          ) : (
            <View className="mb-3">
              <Text className="text-sm text-text dark:text-dark-text">
                {progress
                  ? `Ajoutés ${progress.done} / ${progress.total}`
                  : 'Initialisation...'}
              </Text>
              {progress?.lastName ? (
                <Text className="text-xs text-text-muted dark:text-dark-text-muted mt-2">
                  Dernier produit: {progress.lastName}
                </Text>
              ) : null}

              <View className="h-3 bg-surface-soft dark:bg-dark-surface-soft rounded-full mt-3 overflow-hidden">
                <View style={{ width: `${percent}%` }} className="h-full bg-brand" />
              </View>
              <Text className="text-xs text-text-muted mt-2">{percent}%</Text>
            </View>
          )}

          <View className="flex-row justify-end gap-3 mt-4">
            {isComplete ? (
              <Button size="default" variant="default" onPress={onClose}>
                Aller aux produits
              </Button>
            ) : error ? (
              <Button size="default" variant="destructive" onPress={handleClose}>
                Fermer
              </Button>
            ) : (
              <Button size="default" variant="ghost" onPress={handleClose} disabled={!error && !isComplete}>
                Annuler
              </Button>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}