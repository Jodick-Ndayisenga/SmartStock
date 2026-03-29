// components/edit-product/ProfitabilityBanner.tsx
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardContent } from '@/components/ui/Card';
import { ThemedText } from '@/components/ui/ThemedText';
import { ProfitAnalysis } from '@/hooks/useProductForm';

interface ProfitabilityBannerProps {
  analysis: ProfitAnalysis;
  sellingUnit: string;
  formatCurrency: (value: number) => string;
  onPress?: () => void;
}

export function ProfitabilityBanner({ 
  analysis, 
  sellingUnit, 
  formatCurrency,
  onPress 
}: ProfitabilityBannerProps) {
  const getProfitabilityStyles = () => {
    switch (analysis.profitability) {
      case 'high':
        return {
          bgCard: 'bg-success-soft dark:bg-dark-success-soft border-success/20',
          iconBg: 'bg-success/20',
          iconColor: '#22c55e',
          iconName: 'trending-up',
          badgeBg: 'bg-success/10 border-success/20',
          textVariant: 'success' as const,
          badgeText: 'Excellent'
        };
      case 'medium':
        return {
          bgCard: 'bg-brand-soft dark:bg-dark-brand-soft border-brand/20',
          iconBg: 'bg-brand/20',
          iconColor: '#0ea5e9',
          iconName: 'stats-chart',
          badgeBg: 'bg-brand/10 border-brand/20',
          textVariant: 'brand' as const,
          badgeText: 'Bon'
        };
      case 'low':
        return {
          bgCard: 'bg-warning-soft dark:bg-dark-warning-soft border-warning/20',
          iconBg: 'bg-warning/20',
          iconColor: '#f59e0b',
          iconName: 'alert-circle',
          badgeBg: 'bg-warning/10 border-warning/20',
          textVariant: 'warning' as const,
          badgeText: 'Faible'
        };
      case 'loss':
        return {
          bgCard: 'bg-error-soft dark:bg-dark-error-soft border-error/20',
          iconBg: 'bg-error/20',
          iconColor: '#ef4444',
          iconName: 'warning',
          badgeBg: 'bg-error/10 border-error/20',
          textVariant: 'error' as const,
          badgeText: 'Perte'
        };
    }
  };

  const styles = getProfitabilityStyles();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Card className={styles.bgCard}>
        <CardContent className="p-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${styles.iconBg}`}>
                <Ionicons name={styles.iconName as any} size={24} color={styles.iconColor} />
              </View>
              <View>
                <ThemedText variant="default" size="sm" className="text-text dark:text-dark-text">
                  Marge: {analysis.perSellingUnit.margin.toFixed(1)}%
                </ThemedText>
                <ThemedText variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted">
                  Bénéfice: {formatCurrency(analysis.perSellingUnit.profit)} / {sellingUnit}
                </ThemedText>
              </View>
            </View>
            <View className={`px-3 py-1.5 rounded-full ${styles.badgeBg}`}>
              <ThemedText variant={styles.textVariant} size="xs" className="font-semibold">
                {styles.badgeText}
              </ThemedText>
            </View>
          </View>

          {analysis.recommendations.length > 0 && (
            <View className="mt-3 pt-3 border-t border-border dark:border-dark-border">
              {analysis.recommendations.map((rec, index) => (
                <ThemedText key={index} variant="muted" size="xs" className="text-text-muted dark:text-dark-text-muted mb-1">
                  • {rec}
                </ThemedText>
              ))}
            </View>
          )}
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}