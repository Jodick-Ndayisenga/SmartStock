// components/charts/RevenueTrendChart.tsx
import React, { useState } from "react";
import { View, Text, LayoutChangeEvent } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import ChartCard from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

export default function RevenueTrendChart({ currentData }: any) {
  
  if (!currentData) return null;
  const [width, setWidth] = useState(0);
  const theme = useChartTheme();

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width );
  //console.log("current width is", width, "Current width minus 16  ", width - 16);
  const spacing = width && currentData.length && currentData.length > 1 ? width / (currentData.length - 1) : 30;

  return (
    <ChartCard title="Revenue Trend" subtitle="Visualize growth patterns">
      <View onLayout={onLayout}>
        {width > 0 && (
          <LineChart
            areaChart
            curved
            hideDataPoints
            data={currentData.map((d) => ({ value: d.value, label: d.label }))}
            width={width - 30}
            spacing={spacing}
            startFillColor={theme.brand}
            endFillColor={theme.brandSoft}
            startOpacity={0.8}
            endOpacity={0.1}
            yAxisThickness={0}
            xAxisThickness={0}
            rulesColor={theme.grid}
            showVerticalLines
            xAxisLabelTextStyle={{ color: theme.muted, fontSize: 10 }}
            yAxisTextStyle={{ color: theme.muted, fontSize: 10, fontWeight: "600" }}
            yAxisColor={theme.muted}
            verticalLinesColor={theme.grid}
            isAnimated
            animationDuration={1000}
            pointerConfig={{
              pointerStripUptoDataPoint: true,
              pointerStripColor: theme.brand,
              pointerStripWidth: 2,
              radius: 4,
              pointerColor: theme.brand,
              pointerLabelWidth: 110,
              pointerLabelHeight: 70,
              shiftPointerLabelY: -35,
              pointerLabelComponent: (items) => {
                const item = items[0];
                return (
                  <View
                    style={{
                      height: 50,
                      width: 110,
                      backgroundColor: theme.tooltipBg,
                      borderRadius: 10,
                      justifyContent: "center",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: theme.brand,
                      shadowColor: theme.brand,
                      shadowOpacity: 0.3,
                      shadowRadius: 6,
                    }}
                  >
                    <Text style={{ color: theme.brand, fontWeight: "500" }}>
                      ₣{item?.value?.toLocaleString()}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 9 }}>
                      {item?.label}
                    </Text>
                  </View>
                );
              },
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
        Tap to explore performance over time
      </Text>
    </ChartCard>
  );
}
