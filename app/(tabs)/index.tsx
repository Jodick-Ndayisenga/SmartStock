
// import React, { useEffect, useMemo, useState } from "react";
// import { ScrollView, Text, View, TouchableOpacity,  Animated } from "react-native";
// import { cn } from "@/lib/utils";
// import { useAuth } from "@/context/AuthContext";
// import SalesOverviewChart from "@/components/charts/SalesOverviewChart";
// import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
// import ComparisonChart from "@/components/charts/ComparisonChart";
// import CumulativeMomentumChart from "@/components/charts/CumulativeMomentumChart";
// import StockSummaryChart from "@/components/charts/StockSummaryChart";
// import PremiumHeader from "@/components/layout/PremiumHeader";
// import { ThemedText } from "@/components/ui/ThemedText";
// import { Ionicons } from "@expo/vector-icons";
// import { useTranslation } from "react-i18next";
// import { useAuthRedirect } from "@/hooks/useAuthRedirect";
// type Period = "daily" | "weekly" | "monthly";

// export default function Dashboard() {
//   const [period, setPeriod] = useState<Period>("daily");
//   const { user } = useAuth();
//   const { t } = useTranslation();

//   useAuthRedirect();
//   // ------------------------------
//   // Hardcoded analytics data
//   // ------------------------------
//   const analytics = useMemo(() => ({
//     daily: [
//       { label: "Mon", value: 24000 },
//       { label: "Tue", value: 31000 },
//       { label: "Wed", value: 18000 },
//       { label: "Thu", value: 26000 },
//       { label: "Fri", value: 29000 },
//       { label: "Sat", value: 20000 },
//       { label: "Sun", value: 33000 },
//     ],
//     prevDaily: [
//       { label: "Mon", value: 20000 },
//       { label: "Tue", value: 28000 },
//       { label: "Wed", value: 17000 },
//       { label: "Thu", value: 25000 },
//       { label: "Fri", value: 24000 },
//       { label: "Sat", value: 22000 },
//       { label: "Sun", value: 30000 },
//     ],
//     weekly: [
//       { label: "W1", value: 150000 },
//       { label: "W2", value: 132000 },
//       { label: "W3", value: 165000 },
//       { label: "W4", value: 178000 },
//       { label: "W5", value: 190000 },
//       { label: "W6", value: 160000 },
//       { label: "W7", value: 180000 },
//     ],
//     prevWeekly: [
//       { label: "W1", value: 138000 },
//       { label: "W2", value: 125000 },
//       { label: "W3", value: 158000 },
//       { label: "W4", value: 170000 },
//     ],
//     monthly: [
//       { label: "Jan", value: 680000 },
//       { label: "Feb", value: 590000 },
//       { label: "Mar", value: 720000 },
//       { label: "Apr", value: 640000 },
//       { label: "May", value: 750000 },
//       { label: "Jun", value: 705000 },
//     ],
//     prevMonthly: [
//       { label: "Jan", value: 620000 },
//       { label: "Feb", value: 560000 },
//       { label: "Mar", value: 700000 },
//       { label: "Apr", value: 600000 },
//       { label: "May", value: 710000 },
//       { label: "Jun", value: 690000 },
//     ],
//     topProducts: [
//       { name: "Sugar 1kg", revenue: 52000 },
//       { name: "Rice 5kg", revenue: 41000 },
//       { name: "Cooking Oil", revenue: 34000 },
//       { name: "Soap Pack", revenue: 22500 },
//       { name: "Salt 1kg", revenue: 12000 },
//     ],
//     stock: { in: 33, low: 9, out: 6 },
//     totals: { revenue: 178000, profit: 42000, sales: 93, products: 48 },
//   }), []);

//   const currentData = analytics[period];
//   const previousData =
//     period === "daily"
//       ? analytics.prevDaily
//       : period === "weekly"
//       ? analytics.prevWeekly
//       : analytics.prevMonthly;

//   const totalRevenue = currentData.reduce((s, d) => s + d.value, 0);
//   const prevRevenue = previousData.reduce((s, d) => s + d.value, 0);
//   const percentChange = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);

//   const cumulativeData = currentData.map((d, i) => ({
//     label: d.label,
//     value: currentData.slice(0, i + 1).reduce((a, b) => a + b.value, 0),
//   }));

//   const displayStats =  {
//     products: 156,
//     sales: 125000,
//     revenue: 2800000,
//   };

//     const formatCurrency = (amount: number) => {
//     if (amount >= 1000000) return `FBU ${(amount / 1000000).toFixed(1)}M`;
//     if (amount >= 1000) return `FBU ${(amount / 1000).toFixed(0)}K`;
//     return `FBU ${amount}`;
//   };


//   //console.log(currentData)

//   // ------------------------------
//   // UI
//   // ------------------------------
//   return (
//    <View className="flex-1 bg-surface dark:bg-dark-surface">
//     <PremiumHeader title="Dashboard" 
//     showBackButton={true}
//     />
//     <ScrollView className="flex-1 bg-surface-soft dark:bg-dark-surface-soft p-2">
//      <ThemedText variant="heading" className="mb-4">
//       {'Welcome back, ' + (user ? user.displayName?.split(' ')[0] : '') + " 👐 ! "}
//     </ThemedText>
      

     

//       <View className="gap-2 mb-3">
//         <View className="bg-surface dark:bg-dark-surface p-3 rounded-sm">
//           <Text className="text-sm text-text-soft mb-4">Profit generated today</Text>
//           <Text className="text-5xl font-semibold text-text dark:text-dark-text">{`${analytics.totals.revenue.toLocaleString()} FBU`}</Text>
//           <View className="flex-row gap-3 mt-3">
//             <Ionicons name="arrow-up" size={25} color="green" style={{ transform: [{ rotate: "45deg" }]}}/>
//             <Text className="text-[18px] font-semibold text-success">{percentChange}%  More Than Last Week</Text>
//           </View>
//         </View>
//       </View>

//       <Animated.View 
//         style={{ opacity: 1}}
//         className="flex-row justify-between items-center mt-4 mb-3"
//       >
//         {[
//           { icon: '📦', label: t('dashboard.products'), value: displayStats.products?.toString() || '0', trend: '+12%', color: 'text-brand dark:text-dark-brand' },
//           { icon: '💰', label: t('dashboard.sales'), value: formatCurrency(displayStats.sales || 0), trend: '+23%', color: 'text-success dark:text-dark-success' },
//           { icon: '📈', label: t('dashboard.revenue'), value: formatCurrency(displayStats.revenue || 0), trend: '+18%', color: 'text-warning dark:text-dark-warning' },
//         ].map((stat, index) => (
//           <View 
//             key={index} 
//             className="flex-row items-center bg-surface dark:bg-dark-surface rounded-sm px-1 py-2 flex-1 mx-1"
//           >
//             <Text className="text-base mr-2">{stat.icon}</Text>
//             <View className="flex-1">
//               <Text className="text-xs font-inter-medium text-text-muted dark:text-dark-text-muted">
//                 {stat.label}
//               </Text>
//               <View className="flex-row items-baseline">
//                 <Text className={`text-[10px] font-inter-bold ${stat.color} mr-1`}>
//                   {stat.value}
//                 </Text>
//                 <Text className="text-xs font-inter-medium text-success dark:text-dark-success">
//                   {stat.trend}
//                 </Text>
//               </View>
//             </View>
//           </View>
//         ))}
//       </Animated.View>

//       {/* 🕹️ Period Toggle */}
//       <View className="flex-row justify-between mb-6 bg-surface dark:bg-dark-surface p-3 rounded-sm">
//         {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
//           <TouchableOpacity
//             key={p}
//             onPress={() => setPeriod(p)}
//             className={cn(
//               "px-4 py-2 rounded-full mx-1",
//               period === p ? "bg-brand dark:bg-dark-brand" : "bg-surface-soft dark:bg-dark-surface-soft"
//             )}
//           >
//             <Text
//               className={cn(
//                 "text-sm font-semibold",
//                 period === p ? "text-white" : "text-text-soft"
//               )}
//             >
//               {p.charAt(0).toUpperCase() + p.slice(1)}
//             </Text>
//           </TouchableOpacity>
//         ))}
//       </View>

//       {/* === Charts Section === */}
//       <SalesOverviewChart period={period} data={currentData} percentChange={percentChange} />
//       <RevenueTrendChart currentData={currentData} />
//       <ComparisonChart current={currentData} previous={previousData} />
//       <CumulativeMomentumChart data={cumulativeData} />
//       <StockSummaryChart stock={analytics.stock} />

//       {/* ⚡ Quick Actions */}
//       <View className="mt-6 mb-10">
//         {/* 3D Title Bar */}
//       <View className="flex-row items-center justify-center mb-4">
//         <View
//           className="px-5 py-2 rounded-2xl bg-white/10 dark:bg-dark-surface/40 
//           border border-white/20 dark:border-dark-border/30 shadow-lg shadow-brand/20
//           backdrop-blur-md"
//           style={{
//             shadowColor: '#38bdf8',
//             shadowOffset: { width: 0, height: 3 },
//             shadowOpacity: 0.3,
//             shadowRadius: 6,
//             elevation: 6,
//           }}
//         >
//           <Text
//             className="text-lg font-extrabold tracking-wide text-brand dark:text-brand-light
//             text-center drop-shadow-lg"
//             style={{
//               textShadowColor: 'rgba(56,189,248,0.7)',
//               textShadowOffset: { width: 0, height: 2 },
//               textShadowRadius: 4,
//             }}
//           >
//             ⚡ Quick Actions ⚡
//           </Text>
//         </View>
//       </View>


//         <View className="flex-row flex-wrap justify-between mt-4">
//           {[
//             { title: "Add Stock", icon: "📥", color: "brand", onPress: () => console.log("Add Stock") },
//             { title: "Sell", icon: "💸", color: "success", onPress: () => console.log("Sell Item") },
//             { title: "Products", icon: "📦", color: "warning", onPress: () => console.log("Products") },
//             { title: "Reports", icon: "📊", color: "info", onPress: () => console.log("Reports") },
//           ].map((action, index) => (
//             <TouchableOpacity
//               key={index}
//               onPress={action.onPress}
//               className={cn(
//                 "w-[48%] mb-3 rounded-2xl py-5 flex items-center justify-center border-2",
//                 "bg-surface dark:bg-dark-surface backdrop-blur-md cursor-pointer",
//                 action.color === "brand" ? "border-brand/40" :
//                 action.color === "success" ? "border-success/40" :
//                 action.color === "warning" ? "border-warning/40" :
//                 action.color === "info" ? "border-info/40" : "border-border/30"
//               )}
//               activeOpacity={0.8}
//             >
//               <Text
//                 className={cn(
//                   "text-2xl mb-2",
//                   action.color === "brand" ? "text-brand" :
//                   action.color === "success" ? "text-success" :
//                   action.color === "warning" ? "text-warning" :
//                   action.color === "info" ? "text-info" : "text-text"
//                 )}
//               >
//                 {action.icon}
//               </Text>
//               <Text className="text-sm font-semibold text-text dark:text-dark-text">
//                 {action.title}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </View>
//       </View>

//     </ScrollView>
//    </View>
//   );
// }
// app/(tabs)/index.tsx
// app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// Components
import PremiumHeader from '@/components/layout/PremiumHeader';
import { ThemedText } from '@/components/ui/ThemedText';
import { EmptyState } from '@/components/ui/EmptyState';
import { TodayPerformanceWidget } from '@/components/dashboard/TodayPerformanceWidget';
import { RevenueDistributionWidget } from '@/components/dashboard/RevenueDistributionWidget';
import { SalesTrendWidget } from '@/components/dashboard/SalesTrendWidget';
import { StockHealthWidget } from '@/components/dashboard/StockHealthWidget';
import { CreditHealthWidget } from '@/components/dashboard/CreditHealthWidget';
import { QuickStatsWidget } from '@/components/dashboard/QuickStatsWidget';
import { CategoryDistributionWidget } from '@/components/dashboard/CategoryDistributionWidget';
import { PaymentMethodsWidget } from '@/components/dashboard/PaymentMethodsWidget';

// Hooks
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/NotificationContext';

export default function DashboardScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { currentShop, user } = useAuth();
  const { showNotification } = useNotification();
  const isDark = colorScheme === 'dark';


  // Animation values - FIXED: Create animated event handler properly
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Create the animated event handler correctly
  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [shopReady, setShopReady] = useState(!!currentShop);

  // Update shop ready state
  useEffect(() => {
    setShopReady(!!currentShop);
  }, [currentShop]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    
    // Simulate refresh - the individual widgets will reload their data
    setTimeout(() => {
      setRefreshing(false);
      showNotification({
        type: 'success',
        title: 'Dashboard Updated',
        message: 'Latest data has been loaded',
      });
    }, 1000);
  }, []);

  // Quick actions with theme-aware gradients
  const quickActions = [
    {
      icon: 'add-circle',
      label: 'New Sale',
      gradient: isDark ? ['#16a34a', '#15803d'] : ['#22c55e', '#16a34a'],
      onPress: () => router.push('/(tabs)/sales'),
    },
    {
      icon: 'people',
      label: 'Add Debtor',
      gradient: isDark ? ['#d97706', '#b45309'] : ['#f59e0b', '#d97706'],
      onPress: () => router.push('/shops/contacts/add?role=customer'),
    },
    {
      icon: 'cube',
      label: 'Add Product',
      gradient: isDark ? ['#2563eb', '#1d4ed8'] : ['#3b82f6', '#2563eb'],
      onPress: () => router.push('/add-product'),
    },
    {
      icon: 'cash',
      label: 'Cash Flow',
      gradient: isDark ? ['#7c3aed', '#6d28d9'] : ['#8b5cf6', '#7c3aed'],
      onPress: () => router.push('/cash-flow'),
    },
  ];

  // No shop state
  if (!shopReady) {
    return (
      <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
        <PremiumHeader title="Dashboard" showBackButton={false} />
        <EmptyState
          icon="business-outline"
          title="No Shop Found"
          description="Create a shop first to start managing your inventory"
          action={{
            label: 'Create Shop',
            onPress: () => router.push('/(auth)/create-shop'),
          }}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      <Animated.View style={{ opacity: headerOpacity }}>
        <PremiumHeader
          title="Dashboard"
          showBackButton={false}
        />
      </Animated.View>

      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor={isDark ? '#fff' : '#0ea5e9'}
            progressBackgroundColor={isDark ? '#1e293b' : '#ffffff'}
            colors={['#0ea5e9']}
          />
        }
      >
        <View className="p-4">
          {/* Welcome Message with spacing */}
          <View className="mb-8">
            <ThemedText variant="heading" size="3xl" className="font-bold">
              Welcome back, {user?.displayName?.split(' ')[0] || 'Shop Owner'} 👋
            </ThemedText>
            <ThemedText variant="muted" size="base">
              {currentShop?.name} • {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </ThemedText>
          </View>

          {/* Quick Actions with spacing */}
          <View className="flex-row flex-wrap justify-between mb-8">
            {quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  action.onPress();
                }}
                className="w-[48%] mb-3"
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={action.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="p-4 rounded-2xl items-center"
                >
                  <Ionicons name={action.icon as any} size={28} color="#fff" />
                  <ThemedText className="text-white font-medium mt-2">
                    {action.label}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Performance - Full width with spacing */}
          <View className="mb-8">
            <TodayPerformanceWidget />
          </View>

          {/* Quick Stats - 2x2 grid with spacing */}
          <View className="mb-8">
            <QuickStatsWidget />
          </View>

          {/* Row 1: Revenue Distribution + Sales Trend with proper gap */}
          <View className="flex-row flex-wrap mb-8">
            <View className="w-[100%] mr-[4%]">
              <RevenueDistributionWidget />
            </View>
            <View className="w-[100%] mt-4">
              <SalesTrendWidget />
            </View>
          </View>

          {/* Row 2: Payment Methods + Stock Health with proper gap */}
          <View className="flex-row flex-wrap mb-8">
            <View className="w-[100%] mr-[4%] mt-4">
              <PaymentMethodsWidget />
            </View>
            <View className="w-[48%]">
              <StockHealthWidget />
            </View>
          </View>

          {/* Credit Health - Full width with spacing */}
          <View className="mb-8">
            <CreditHealthWidget />
          </View>

          {/* Category Distribution - Full width with spacing */}
          <View className="mb-8">
            <CategoryDistributionWidget />
          </View>

          {/* Additional spacing for bottom navigation - increased for better scroll experience */}
          <View className="h-24" />
        </View>
      </Animated.ScrollView>
    </View>
  );
}