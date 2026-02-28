// components/dashboard/BaseWidget.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Card, CardContent } from '@/components/ui/Card';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface BaseWidgetProps<T> {
  title: string;
  children: (data: T) => React.ReactNode;
  fetchData: () => Promise<T>;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: Error, retry: () => void) => React.ReactNode;
  emptyComponent?: React.ReactNode;
  refreshInterval?: number; // in ms
  onDataLoaded?: (data: T) => void;
  action?: {
    label: string;
    onPress: () => void;
    icon?: keyof typeof Ionicons.glyphMap;
  };
  className?: string;
}

export function BaseWidget<T>({
  title,
  children,
  fetchData,
  loadingComponent,
  errorComponent,
  emptyComponent,
  refreshInterval,
  onDataLoaded,
  action,
  className = '',
}: BaseWidgetProps<T>) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null,
  });

  const fadeAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const refreshTimer = useRef<number | null>(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) {
      setState(prev => ({ ...prev, loading: true, error: null }));
    }
    
    try {
      const data = await fetchData();
      setState({ data, loading: false, error: null });
      onDataLoaded?.(data);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  };

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  };

  useEffect(() => {
    loadData();

    if (refreshInterval) {
      refreshTimer.current = setInterval(() => loadData(false), refreshInterval);
    }

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  // Loading state
  if (state.loading) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <ThemedText variant="heading" size="base" className="font-semibold">
              {title}
            </ThemedText>
          </View>
          {loadingComponent || (
            <View className="h-48 items-center justify-center">
              <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
          )}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <ThemedText variant="heading" size="base" className="font-semibold">
              {title}
            </ThemedText>
          </View>
          {errorComponent ? (
            errorComponent(state.error, handleRetry)
          ) : (
            <View className="h-48 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-error/10 items-center justify-center mb-3">
                <Ionicons name="alert-circle" size={32} color="#ef4444" />
              </View>
              <ThemedText variant="error" size="sm" className="text-center mb-3">
                {state.error.message}
              </ThemedText>
              <TouchableOpacity
                onPress={handleRetry}
                className="px-4 py-2 bg-brand rounded-lg flex-row items-center"
              >
                <Ionicons name="refresh" size={16} color="#fff" />
                <ThemedText className="text-white ml-2">Retry</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!state.data || (Array.isArray(state.data) && state.data.length === 0)) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <ThemedText variant="heading" size="base" className="font-semibold">
              {title}
            </ThemedText>
          </View>
          {emptyComponent || (
            <View className="h-48 items-center justify-center">
              <Ionicons name="information-circle" size={48} color="#64748b" />
              <ThemedText variant="muted" size="sm" className="text-center mt-2">
                No data available
              </ThemedText>
            </View>
          )}
        </CardContent>
      </Card>
    );
  }

  // Success state
  return (
    <Card variant="elevated" className={className}>
      <CardContent className="p-4">
        <View className="flex-row justify-between items-center mb-4">
          <ThemedText variant="heading" size="base" className="font-semibold">
            {title}
          </ThemedText>
          {action && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                action.onPress();
              }}
              className="flex-row items-center"
            >
              {action.icon && (
                <Ionicons name={action.icon} size={16} color="#0ea5e9" />
              )}
              <ThemedText variant="brand" size="sm" className="ml-1">
                {action.label}
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
        <Animated.View style={{ opacity: fadeAnim }}>
          {children(state.data)}
        </Animated.View>
      </CardContent>
    </Card>
  );
}