// components/charts/useChartTheme.ts
import { useColorScheme } from "react-native";

export function useChartTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  return {
    isDark,
    background: isDark ? "#0f172a" : "#ffffff",
    grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    brand: isDark ? "#38bdf8" : "#0ea5e9",
    brandSoft: isDark ? "#0ea5e9" : "#38bdf8",
    success: isDark ? "#4ade80" : "#22c55e",
    warning: isDark ? "#fbbf24" : "#f59e0b",
    danger: isDark ? "#f87171" : "#ef4444",
    text: isDark ? "#f1f5f9" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    tooltipBg: isDark ? "#1e293b" : "#f8fafc",
    info: isDark ? "#3b82f6" : "#60a5fa",
  };
}
