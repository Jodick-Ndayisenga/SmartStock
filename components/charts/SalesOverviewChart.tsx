import React, { useState } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { BarChart } from "react-native-gifted-charts";
import ChartCard from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

export default function SalesOverviewChart({ data, percentChange }: any) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <ChartCard title="Sales Overview" subtitle="Overall sales by period">
      <View onLayout={onLayout}>
        {width > 0 && (
          <BarChart
            data={data}
            width={width }
            spacing={16}
            barBorderRadius={6}
            frontColor={theme.brand}
            noOfSections={4}
            yAxisThickness={0}
            xAxisThickness={0}
            isAnimated
            rulesColor={theme.grid}
            showGradient
            gradientColor={theme.brandSoft}
            animationDuration={800}
            xAxisLabelTextStyle={{ color: theme.muted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.muted, fontSize: 10, fontWeight: "600" }}
          />
        )}
      </View>
      <Text
        style={{
          color: percentChange >= 0 ? theme.success : theme.danger,
          marginTop: 8,
          textAlign: "center",
          fontWeight: "600",
        }}
      >
        {percentChange >= 0 ? "▲" : "▼"} {Math.abs(percentChange)}% vs previous period
      </Text>
    </ChartCard>
  );
}
