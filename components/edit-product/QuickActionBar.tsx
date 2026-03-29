// components/edit-product/QuickActionsBar.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '@/components/ui/ThemedText';

interface QuickActionsBarProps {
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
  isNewProduct: boolean;
  productId?: string;
  onViewMovements?: () => void;
}

export function QuickActionsBar({
  showAdvanced,
  setShowAdvanced,
  isNewProduct,
  productId,
  onViewMovements,
}: QuickActionsBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-row gap-2">
      <TouchableOpacity
        onPress={() => setShowAdvanced(!showAdvanced)}
        className="flex-1 px-4 py-2 rounded-sm flex-row items-center justify-center bg-surface-muted dark:bg-dark-surface-muted border border-border dark:border-dark-border"
      >
        <Ionicons 
          name={showAdvanced ? "chevron-up-outline" : "chevron-down-outline"} 
          size={18} 
          color={isDark ? '#94a3b8' : '#64748b'} 
        />
        <ThemedText variant="muted" size="sm" className="ml-2">
          {showAdvanced ? "Masquer avancé" : "Voir options avancées"}
        </ThemedText>
      </TouchableOpacity>
      
      {!isNewProduct && productId && (
        <TouchableOpacity
          onPress={onViewMovements}
          className="px-4 py-2 rounded-sm flex-row items-center justify-center bg-surface-muted dark:bg-dark-surface-muted border border-border dark:border-dark-border"
        >
          <Ionicons name="swap-horizontal-outline" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
          <ThemedText variant="muted" size="sm" className="ml-2">Mouvements</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}