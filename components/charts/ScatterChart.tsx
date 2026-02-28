// components/charts/ScatterChart.tsx
import React from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '../ui/ThemedText';

interface ScatterChartProps {
  data: Array<{
    x: number;
    y: number;
    label: string;
  }>;
  formatValue: (value: number) => string;
}

export const ScatterChart: React.FC<ScatterChartProps> = ({ 
  data, 
  formatValue 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = Dimensions.get('window');

  const chartData = data.map(item => ({
    value: item.y,
    label: item.label,
  }));

  const maxY = Math.max(...data.map(d => d.y)) * 1.2;

  return (
    <LineChart
      data={chartData}
      width={screenWidth - 64}
      height={180}
      spacing={25}
      initialSpacing={20}
      color="#0ea5e9"
      thickness={0}
      dataPointsColor="#0ea5e9"
      dataPointsRadius={6}
      hideRules
      yAxisThickness={1}
      xAxisThickness={1}
      xAxisColor={isDark ? '#334155' : '#e2e8f0'}
      yAxisColor={isDark ? '#334155' : '#e2e8f0'}
      yAxisTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
      xAxisLabelTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 9 }}
      noOfSections={4}
      maxValue={maxY}
      showFractionalValues={false}
      pointerConfig={{
        pointerStripHeight: 140,
        pointerStripColor: isDark ? '#475569' : '#cbd5e1',
        pointerStripWidth: 2,
        pointerComponent: (item: any) => (
          <View className="bg-surface dark:bg-dark-surface px-2 py-1 rounded-lg shadow-elevated border border-border dark:border-dark-border">
            <ThemedText variant="default" size="xs" className="font-medium">
              {formatValue(item.value)}
            </ThemedText>
            <ThemedText variant="muted" size="xs">
              {item.label}
            </ThemedText>
          </View>
        ),
      }}
    />
  );
};