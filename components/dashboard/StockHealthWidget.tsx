// components/dashboard/StockHealthWidget.tsx
import React from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { useAuth } from '@/context/AuthContext';
import database from '@/database';
import { Q } from '@nozbe/watermelondb';
import { Product } from '@/database/models/Product';
import { StockPieChart } from '@/components/charts/ThreePieChartsVariation';
import { BaseWidget } from './BaseWidget';
import {useRouter} from "expo-router";

interface StockData {
  total: number;
  healthy: number;
  lowStock: number;
  outOfStock: number;
  lowStockThreshold: number;
}

export function StockHealthWidget() {
  const { currentShop } = useAuth();
  const router = useRouter();

  const fetchStockData = async (): Promise<StockData> => {
    if (!currentShop) throw new Error('No shop selected');

    const products = await database.get<Product>('products')
      .query(Q.where('shop_id', currentShop.id))
      .fetch();

    const lowStockThreshold = 10;
    const healthy = products.filter(p => (p.stockQuantity || 0) > lowStockThreshold).length;
    const lowStock = products.filter(p => {
      const stock = p.stockQuantity || 0;
      return stock > 0 && stock <= lowStockThreshold;
    }).length;
    const outOfStock = products.filter(p => !p.stockQuantity || p.stockQuantity === 0).length;

    return {
      total: products.length,
      healthy,
      lowStock,
      outOfStock,
      lowStockThreshold,
    };
  };

  return (
    <BaseWidget<StockData>
      title="Stock Health"
      fetchData={fetchStockData}
      refreshInterval={600000} // 10 minutes
      action={{
        label: 'Manage Stock',
        icon: 'arrow-forward',
        onPress: () => router.push('/products'),
      }}
    >
      {(data) => (
        <StockPieChart
          healthy={data.healthy}
          lowStock={data.lowStock}
          outOfStock={data.outOfStock}
          formatValue={(value) => value.toString()}
        />
      )}
    </BaseWidget>
  );
}