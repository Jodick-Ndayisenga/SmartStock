// components/charts/ProgressPieChart.tsx
import React from 'react';
import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from 'nativewind';

interface ProgressPieChartProps {
  healthy: number;
  lowStock: number;
  outOfStock: number;
  total: number;
}

export const ProgressPieChart: React.FC<ProgressPieChartProps> = ({ 
  healthy, 
  lowStock, 
  outOfStock, 
  total 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const pieData = [
    { value: healthy, color: '#22c55e', text: 'Healthy' },
    { value: lowStock, color: '#f59e0b', text: 'Low Stock' },
    { value: outOfStock, color: '#ef4444', text: 'Out of Stock' },
  ].filter(item => item.value > 0);

  if (total === 0) {
    return (
      <View className="h-48 items-center justify-center">
        <ThemedText variant="muted">No products</ThemedText>
      </View>
    );
  }

  return (
    <View className="items-center">
      <PieChart
        data={pieData}
        donut
        radius={80}
        innerRadius={40}
        textColor={isDark ? '#f1f5f9' : '#0f172a'}
        centerLabelComponent={() => (
          <View className="items-center">
            <ThemedText variant="heading" size="lg" className="font-bold">
              {total}
            </ThemedText>
            <ThemedText variant="muted" size="xs">Total</ThemedText>
          </View>
        )}
      />
      
      <View className="flex-row flex-wrap justify-center gap-4 mt-4">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-success mr-2" />
          <ThemedText variant="muted" size="xs">Healthy: {healthy}</ThemedText>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-warning mr-2" />
          <ThemedText variant="muted" size="xs">Low: {lowStock}</ThemedText>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-error mr-2" />
          <ThemedText variant="muted" size="xs">Out: {outOfStock}</ThemedText>
        </View>
      </View>
    </View>
  );
};