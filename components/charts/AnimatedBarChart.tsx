// components/charts/AnimatedBarChart.tsx
import React from 'react';
import { View, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '../ui/ThemedText';

interface AnimatedBarChartProps {
  data: Array<{
    value: number;
    label: string;
    target: number;
  }>;
  formatValue: (value: number) => string;
}

export const AnimatedBarChart: React.FC<AnimatedBarChartProps> = ({ 
  data, 
  formatValue 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = Dimensions.get('window');

  const barData = data.map((item, index) => ({
    value: item.value,
    label: item.label,
    frontColor: item.value >= item.target ? '#22c55e' : '#f59e0b',
    topLabelComponent: () => (
      <ThemedText variant="muted" size="xs" className="mb-1">
        {formatValue(item.value)}
      </ThemedText>
    ),
  }));

  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target))) * 1.2;

  return (
    <BarChart
      data={barData}
      width={screenWidth - 100}
      height={180}
      barWidth={28}
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
      showValuesAsTopLabel
      topLabelContainerStyle={{ marginBottom: 6 }}
      rulesColor={isDark ? '#334155' : '#e2e8f0'}
      renderTooltip={(item: any) => (
        <View className="bg-surface dark:bg-dark-surface px-2 py-1 rounded-lg shadow-elevated">
          <ThemedText variant="default" size="xs" className="font-medium">
            {formatValue(item.value)}
          </ThemedText>
          <ThemedText variant="muted" size="xs">
            Target: {formatValue(item.target)}
          </ThemedText>
        </View>
      )}
    />
  );
};