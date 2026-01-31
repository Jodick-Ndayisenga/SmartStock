import React from "react";
import { View, Text } from "react-native";
import ChartCard from "./ChartCard";
import { useChartTheme } from "./useChartTheme";

export default function StockSummaryChart({ stock }: any) {
  const theme = useChartTheme();
  const total = stock.in + stock.low + stock.out;

  return (
    <ChartCard title="Stock Summary" subtitle="Inventory health snapshot">
      <View className="flex-row justify-around py-3">
        <Text style={{ color: theme.success }}>In: {stock.in}</Text>
        <Text style={{ color: theme.warning }}>Low: {stock.low}</Text>
        <Text style={{ color: theme.danger }}>Out: {stock.out}</Text>
      </View>
      <View className="mt-4">
        <View
          style={{
            height: 10,
            borderRadius: 6,
            backgroundColor: theme.grid,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${(stock.in / total) * 100}%`,
              backgroundColor: theme.success,
              height: "100%",
            }}
          />
          <View
            style={{
              width: `${(stock.low / total) * 100}%`,
              backgroundColor: theme.warning,
              height: "100%",
              position: "absolute",
              left: `${(stock.in / total) * 100}%`,
            }}
          />
          <View
            style={{
              width: `${(stock.out / total) * 100}%`,
              backgroundColor: theme.danger,
              height: "100%",
              position: "absolute",
              left: `${((stock.in + stock.low) / total) * 100}%`,
            }}
          />
        </View>
      </View>
    </ChartCard>
  );
}
