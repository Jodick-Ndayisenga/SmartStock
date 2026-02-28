// components/charts/HorizontalBarChart.tsx
import React from 'react';
import { View, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '../ui/ThemedText';

interface HorizontalBarChartProps {
  data: Array<{
    value: number;
    label: string;
  }>;
  formatValue: (value: number) => string;
}

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ 
  data, 
  formatValue 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = Dimensions.get('window');

  const barData = data.map((item, index) => ({
    value: item.value,
    label: item.label.length > 8 ? item.label.substring(0, 6) + '...' : item.label,
    frontColor: index === 0 ? '#0ea5e9' : 
                index === 1 ? '#22c55e' : 
                index === 2 ? '#f59e0b' : 
                index === 3 ? '#3b82f6' : '#8b5cf6',
  }));

  return (
    <BarChart
      horizontal
      data={barData}
      width={screenWidth - 100}
      height={180}
      barWidth={24}
      barBorderRadius={6}
      yAxisThickness={0}
      xAxisThickness={1}
      xAxisColor={isDark ? '#334155' : '#e2e8f0'}
      yAxisTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
      xAxisLabelTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }}
      noOfSections={4}
      maxValue={Math.max(...data.map(d => d.value)) * 1.1}
      isAnimated
      animationDuration={500}
      showValuesAsTopLabel
      topLabelContainerStyle={{ marginBottom: 4 }}
      renderTooltip={(item: any) => (
        <View className="bg-surface dark:bg-dark-surface px-2 py-1 rounded-lg shadow-elevated">
          <ThemedText variant="default" size="xs" className="font-medium">
            {formatValue(item.value)}
          </ThemedText>
        </View>
      )}
    />
  );
};