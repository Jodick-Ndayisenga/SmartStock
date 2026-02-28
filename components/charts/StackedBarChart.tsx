// components/charts/StackedBarChart.tsx
import React from 'react';
import { View, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '../ui/ThemedText';

interface StackedBarChartProps {
  data: Array<{
    value: number;
    label: string;
  }>;
  formatValue: (value: number) => string;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({ 
  data, 
  formatValue 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = Dimensions.get('window');

  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
  
  const barData = data.map((item, index) => ({
    stacks: [
      { value: item.value, color: colors[index % colors.length] },
    ],
    label: item.label,
  }));

  const maxValue = Math.max(...data.map(d => d.value)) * 1.2;

  return (
    <BarChart
      data={barData}
      width={screenWidth - 100}
      height={180}
      barWidth={35}
      spacing={20}
      initialSpacing={15}
      yAxisThickness={1}
      xAxisThickness={1}
      xAxisColor={isDark ? '#334155' : '#e2e8f0'}
      yAxisColor={isDark ? '#334155' : '#e2e8f0'}
      yAxisTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
      xAxisLabelTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
      noOfSections={4}
      maxValue={maxValue}
      isAnimated
      animationDuration={500}
      barBorderRadius={4}
      showGradient
      gradientColor="rgba(255,255,255,0.2)"
      renderTooltip={(item: any) => (
        <View className="bg-surface dark:bg-dark-surface px-2 py-1 rounded-lg shadow-elevated">
          <ThemedText variant="default" size="xs" className="font-medium">
            {formatValue(item.value)}
          </ThemedText>
          <ThemedText variant="muted" size="xs" className="capitalize">
            {item.label}
          </ThemedText>
        </View>
      )}
    />
  );
};