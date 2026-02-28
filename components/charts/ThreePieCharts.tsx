// components/charts/ThreeDPieChart.tsx
import React from 'react';
import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from 'nativewind';

interface ThreeDPieChartProps {
  data: Array<{
    value: number;
    color: string;
    label: string;
    percentage?: number;
  }>;
  total: number;
  formatValue: (value: number) => string;
  donut?: boolean;
  innerRadius?: number;
}

export const ThreeDPieChart: React.FC<ThreeDPieChartProps> = ({ 
  data, 
  total, 
  formatValue,
  donut = true,
  innerRadius = 40,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Filter out zero values and calculate percentages
  const validData = data.filter(item => item.value > 0);
  
  const pieData = validData.map(item => ({
    value: item.value,
    color: item.color,
    text: item.label,
    percentage: ((item.value / (total || 1)) * 100).toFixed(1),
    label: `${item.label}\n${((item.value / (total || 1)) * 100).toFixed(1)}%`,
  }));

  if (pieData.length === 0) {
    return (
      <View className="h-64 items-center justify-center">
        <ThemedText variant="muted">No data available</ThemedText>
      </View>
    );
  }

  // Calculate center label text based on donut mode
  const CenterLabel = () => (
    <View className="items-center">
      <ThemedText variant="heading" size="xl" className="font-bold text-brand">
        {formatValue(total)}
      </ThemedText>
      <ThemedText variant="muted" size="xs">Total</ThemedText>
    </View>
  );

  return (
    <View className="items-center">
      <PieChart
        data={pieData}
        donut={donut}
        isThreeD
        showText
        textColor={isDark ? '#f1f5f9' : '#0f172a'}
        textSize={12}
        fontWeight="600"
        showTextBackground
        textBackgroundColor={isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'}
        textBackgroundRadius={16}
        radius={120}
        innerRadius={donut ? innerRadius : 0}
        innerCircleBorderWidth={2}
        innerCircleBorderColor={isDark ? '#334155' : '#e2e8f0'}
        shiftInnerCenterX={-8}
        shiftInnerCenterY={-10}
        centerLabelComponent={donut ? CenterLabel : undefined}
        strokeWidth={0}
        strokeColor="transparent"
        //innerRadius={donut ? innerRadius : 0}
        innerCircleColor={isDark ? '#1e293b' : '#ffffff'}
        shadow
        shadowColor={isDark ? '#00000040' : '#00000020'}
        showValuesAsLabels
        labelsPosition="outward"
        //labelRadius={140}
      />
      
      {/* Custom Legend */}
      <View className="flex-row flex-wrap justify-center gap-3 mt-6">
        {validData.map((item, index) => (
          <View key={index} className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft px-3 py-2 rounded-lg">
            <View 
              className="w-4 h-4 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            />
            <View>
              <ThemedText variant="default" size="sm" className="font-medium">
                {item.label}
              </ThemedText>
              <ThemedText variant="muted" size="xs">
                {((item.value / (total || 1)) * 100).toFixed(1)}% • {formatValue(item.value)}
              </ThemedText>
            </View>
          </View>
        ))}
      </View>

      {/* Percentage Summary */}
      <View className="flex-row justify-around w-full mt-4 pt-4 border-t border-border dark:border-dark-border">
        {validData.map((item, index) => (
          <View key={index} className="items-center">
            <ThemedText 
              variant="heading" 
              size="lg" 
              className="font-bold"
              style={{ color: item.color }}
            >
              {((item.value / (total || 1)) * 100).toFixed(1)}%
            </ThemedText>
            <ThemedText variant="muted" size="xs">
              {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
};