// components/charts/DualLineChart.tsx
import React from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useColorScheme } from 'nativewind';
import { ThemedText } from '../ui/ThemedText';

interface DualLineChartProps {
  data1: number[];
  data2: number[];
  labels: string[];
  formatValue: (value: number) => string;
}

export const DualLineChart: React.FC<DualLineChartProps> = ({ 
  data1, 
  data2, 
  labels, 
  formatValue 
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth } = Dimensions.get('window');

  const lineData1 = data1.map((value, index) => ({
    value,
    label: labels[index],
  }));

  const lineData2 = data2.map((value, index) => ({
    value,
  }));

  return (
    <LineChart
      data={lineData1}
      data2={lineData2}
      width={screenWidth - 64}
      height={180}
      spacing={40}
      initialSpacing={15}
      color1="#0ea5e9"
      color2={isDark ? '#64748b' : '#94a3b8'}
      thickness={2}
      hideRules
      dataPointsColor1="#0ea5e9"
      dataPointsColor2={isDark ? '#64748b' : '#94a3b8'}
      dataPointsRadius={4}
      textColor={isDark ? '#94a3b8' : '#64748b'}
      xAxisLabelTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
      yAxisTextStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
      yAxisColor={isDark ? '#334155' : '#e2e8f0'}
      xAxisColor={isDark ? '#334155' : '#e2e8f0'}
      backgroundColor="transparent"
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