// components/charts/GradientAreaChart.tsx
import React from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient, Stop } from 'react-native-svg';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '../ui/ThemedText';

interface GradientAreaChartProps {
  data: number[];
  labels: string[];
  formatValue: (value: number) => string;
}

export const GradientAreaChart: React.FC<GradientAreaChartProps> = ({ 
  data, 
  labels, 
  formatValue 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = Dimensions.get('window');

  const chartData = data.map((value, index) => ({
    value,
    label: labels[index],
  }));

  return (
    <LineChart
      data={chartData}
      width={screenWidth - 100}
      height={180}
      areaChart
      curved
      spacing={35}
      initialSpacing={15}
      color="transparent"
      hideDataPoints
      thickness={2}
      hideRules
      hideYAxisText
      yAxisColor="transparent"
      xAxisColor={isDark ? '#334155' : '#e2e8f0'}
      areaGradientId="gradient"
      areaGradientComponent={() => (
        <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0ea5e9" stopOpacity={0.8} />
          <Stop offset="0.5" stopColor="#0ea5e9" stopOpacity={0.4} />
          <Stop offset="1" stopColor="#0ea5e9" stopOpacity={0.1} />
        </LinearGradient>
      )}
      pointerConfig={{
        pointerStripHeight: 140,
        pointerStripColor: isDark ? '#475569' : '#cbd5e1',
        pointerStripWidth: 2,
        pointerComponent: (item: any) => (
          <View className="bg-surface dark:bg-dark-surface px-2 py-1 rounded-lg shadow-elevated border border-border dark:border-dark-border">
            <ThemedText variant="default" size="xs" className="font-medium">
              {formatValue(item.value)}
            </ThemedText>
          </View>
        ),
      }}
    />
  );
};