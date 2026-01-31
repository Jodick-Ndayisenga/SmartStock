// components/charts/PerformanceAnalyticsHeader.tsx
import React from "react";
import { View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { LineChart } from "react-native-gifted-charts";
import { LinearGradient, Stop } from "react-native-svg";
import { cn } from "@/lib/utils";

interface Props {
  growthPercent: number;
  topProduct: { name: string; revenue: number };
  trendData: { value: number }[];
  theme?: "light" | "dark";
}

export default function PerformanceAnalyticsHeader({
  growthPercent,
  topProduct,
  trendData,
  theme = "light",
}: Props) {
  const positive = growthPercent >= 0;

  const gradient = theme === "dark"
    ? { start: "#0ea5e9", end: "#38bdf8" }
    : { start: "#38bdf8", end: "#0ea5e9" };

  const blurTint = theme === "dark" ? "dark" : "light";

  return (
    <BlurView
      intensity={80}
      tint={blurTint}
      className={cn(
        "rounded-2xl p-4 mb-6 border",
        theme === "dark" ? "border-border-strong" : "border-border"
      )}
    >
      {/* Header Row */}
      <View className="flex-row justify-between items-center mb-3">
        <View>
          <Text className="text-text-soft text-sm font-medium">
            Revenue Growth
          </Text>
          <Text
            className={cn(
              "text-2xl font-semibold",
              positive ? "text-success" : "text-error"
            )}
          >
            {positive ? "▲" : "▼"} {Math.abs(growthPercent)}%
          </Text>
        </View>

        {/* Best Product */}
        <View className="items-end">
          <Text className="text-text-soft text-sm font-medium">
            Top Product
          </Text>
          <Text className="text-text font-semibold text-base">
            {topProduct.name}
          </Text>
          <Text className="text-text-soft text-xs">
            ₣{topProduct.revenue.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Sparkline Chart */}
      <View className="w-full h-[70px]">
        <LineChart
          data={trendData}
          curved
          areaChart
          hideDataPoints
          yAxisThickness={0}
          xAxisThickness={0}
          spacing={20}
          color="transparent"
          startFillColor={gradient.start}
          endFillColor={gradient.end}
          startOpacity={0.6}
          endOpacity={0.1}
          adjustToWidth
          isAnimated
          animationDuration={900}
          areaGradientId="header-gradient"
          
          areaGradientComponent={() => (
            <LinearGradient id="header-gradient" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={gradient.start} />
              <Stop offset="1" stopColor={gradient.end} />
            </LinearGradient>
          )}
        />
      </View>
    </BlurView>
  );
}
