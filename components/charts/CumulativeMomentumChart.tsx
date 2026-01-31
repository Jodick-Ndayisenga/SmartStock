import React, { useState } from "react";
import { View, LayoutChangeEvent } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import ChartCard from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

export default function CumulativeMomentumChart({ data }: any) {
  const theme = useChartTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width - 16);

  const spacing = width && data.length > 1 ? width / (data.length - 1) : 40;

  return (
    <ChartCard
      title="Cumulative Momentum"
      subtitle="Sales acceleration overview"
    >
      <View onLayout={onLayout}>
        {width > 0 && (
          <LineChart
            areaChart
            curved
            hideDataPoints
            data={data}
            width={width -16}
            spacing={spacing}
            startFillColor={theme.success}
            endFillColor={theme.success}
            startOpacity={0.5}
            endOpacity={0.1}
            yAxisThickness={0}
            xAxisThickness={0}
            showVerticalLines
            verticalLinesColor={theme.grid}

            
            isAnimated
            animationDuration={900}
            xAxisLabelTextStyle={{ color: theme.muted, fontSize: 10 }}
            // ✅ Soft horizontal dashed lines
            rulesColor={ theme.muted} 
            rulesThickness={0}
            yAxisTextStyle={{
              color: theme.muted,
              fontSize: 10,
              fontWeight: "600",
            }}
          />
        )}
      </View>
    </ChartCard>
  );
}
