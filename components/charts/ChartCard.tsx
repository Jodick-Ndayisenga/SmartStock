// components/charts/ChartCard.tsx
import React from "react";
import { View, Text, useColorScheme } from "react-native";

export default function ChartCard({ title, subtitle, children }: any) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <View
      style={{
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        borderRadius: 18,
        padding: 16,
        marginBottom: 24,
        shadowColor: isDark ? "#38bdf8" : "#0ea5e9",
        shadowOpacity: isDark ? 0.08 : 0.05,
        shadowRadius: 10,
        shadowOffset: { height: 6, width: 0 },
        borderWidth: 1,
        borderColor: isDark ? "#1e293b" : "#e2e8f0",
      }}
    >
      <Text
        style={{
          color: isDark ? "#f1f5f9" : "#0f172a",
          fontWeight: "600",
          fontSize: 17,
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: 13,
            marginBottom: 10,
          }}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </View>
  );
}
