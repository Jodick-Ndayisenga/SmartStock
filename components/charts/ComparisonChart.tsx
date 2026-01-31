import React, { useState } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import ChartCard from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

export default function ComparisonChart({ current, previous }: any) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - 16);
  const spacing = width && current.length > 1 ? width / (current.length - 1) : 40;

  return (
    <ChartCard title="Performance Comparison" subtitle="Current vs previous period">
      <View onLayout={onLayout}>
        {width > 0 && (
          <LineChart
            areaChart
            curved
            data={current}
            data2={previous}
            color1={theme.brand}
            color2={theme.warning}
            width={width - 16}
            spacing={spacing}
            startFillColor1={theme.brand}
            endFillColor1={theme.brandSoft}
            startFillColor2={theme.warning}
            endFillColor2={theme.warning}
            startOpacity1={0.4}
            endOpacity1={0.05}
            startOpacity2={0.25}
            endOpacity2={0.05}
            yAxisThickness={0}
            xAxisThickness={0}
            showVerticalLines
            verticalLinesColor={theme.grid}
            isAnimated
            animationDuration={900}
            // ✅ Soft horizontal dashed lines
            rulesColor={ theme.muted} 
            rulesThickness={0}
            yAxisTextStyle={{
              color: theme.muted,
              fontSize: 10,
              fontWeight: "600",
            }}

            xAxisLabelTextStyle={{
              color: theme.muted,
              fontSize: 10,
            }}
          />
        )}
      </View>
      <Text
        style={{
          color: theme.muted,
          textAlign: "center",
          marginTop: 10,
          fontSize: 13,
        }}
      >
        Blue = Current, Gold = Previous
      </Text>
    </ChartCard>
  );
}
