// types/dashboard.ts
export interface DashboardMetric {
  value: number;
  previousValue?: number;
  trend?: number;
  formatted: string;
}

export interface ComponentState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null;
}