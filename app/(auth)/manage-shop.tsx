// app/(tabs)/shops.tsx
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import ShopManager from '@/components/ShopManager';

export default function ShopsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <PremiumHeader 
        title={user?.displayName ? user.displayName : user?.email || t('manageShop.title')}
        showBackButton={true}
      />
      <ShopManager />
    </View>
  );
}