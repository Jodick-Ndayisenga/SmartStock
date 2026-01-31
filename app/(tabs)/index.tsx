// // app/(tabs)/dashboard.tsx
// import React, { useEffect, useState } from 'react';
// import { View, ScrollView, RefreshControl, Alert } from 'react-native';
// import { Q } from '@nozbe/watermelondb';
// import { useFocusEffect } from '@react-navigation/native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import { useAuth } from '@/context/AuthContext';
// import { useRouter } from 'expo-router';
// import { useTranslation } from 'react-i18next';

// // Components
// import PremiumHeader from '@/components/layout/PremiumHeader';
// import { ThemedText } from '@/components/ui/ThemedText';
// import { Card } from '@/components/ui/Card';
// import { Badge } from '@/components/ui/Badge';
// import { Button } from '@/components/ui/Button';
// import { EmptyState } from '@/components/ui/EmptyState';
// import { Skeleton } from '@/components/ui/Loading';
// import database from '@/database';

// // Models
// import { Product } from '@/database/models/Product';
// import { StockMovement } from '@/database/models/StockMovement';
// import { Shop } from '@/database/models/Shop';

// // Types
// interface DashboardStats {
//   totalProducts: number;
//   totalStockValue: number;
//   todaySales: number;
//   todayProfit: number;
//   lowStockItems: number;
//   outOfStockItems: number;
// }

// interface RecentSale {
//   id: string;
//   productName: string;
//   quantity: number;
//   amount: number;
//   timestamp: number;
// }

// interface LowStockProduct {
//   id: string;
//   name: string;
//   currentStock: number;
//   lowStockThreshold: number;
// }

// export default function Dashboard() {
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [stats, setStats] = useState<DashboardStats>({
//     totalProducts: 0,
//     totalStockValue: 0,
//     todaySales: 0,
//     todayProfit: 0,
//     lowStockItems: 0,
//     outOfStockItems: 0,
//   });
//   const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
//   const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
//   const [activeShop, setActiveShop] = useState<Shop | null>(null);

//   const { user } = useAuth();
//   const router = useRouter();
//   const { t } = useTranslation();

//   // Load dashboard data
//   const loadDashboardData = async () => {
//     try {
//       setLoading(true);
//       const shops = await database.get<Shop>('shops').query().fetch();
//       const shop = shops[0] || null;
//       setActiveShop(shop);

//       if (!shop) {
//         setLoading(false);
//         return;
//       }

//       const shopId = shop.id;
//       const products = await database.get<Product>('products')
//         .query(Q.where('shop_id', shopId), Q.where('is_active', true))
//         .fetch();

//       const today = new Date();
//       today.setHours(0, 0, 0, 0);
//       const todayTimestamp = today.getTime();

//       // Calculate current stock & stats
//       let totalStockValue = 0;
//       let lowStockItems = 0;
//       let outOfStockItems = 0;
//       const productStockMap = new Map<string, number>();

//       for (const product of products) {
//         const movements = await database.get<StockMovement>('stock_movements')
//           .query(Q.where('product_id', product.id), Q.where('shop_id', shopId))
//           .fetch();

//         let currentStock = 0;
//         for (const m of movements) {
//           currentStock += m.movementType === 'purchase' ? m.quantity : -m.quantity;
//         }

//         productStockMap.set(product.id, currentStock);
//         totalStockValue += currentStock * product.sellingPricePerBase;

//         if (currentStock === 0) outOfStockItems++;
//         else if (currentStock <= (product.lowStockThreshold || 10)) lowStockItems++;
//       }

//       // Today's sales
//       const todayMovements = await database.get<StockMovement>('stock_movements')
//         .query(
//           Q.where('shop_id', shopId),
//           Q.where('movement_type', 'sale'),
//           Q.where('timestamp', Q.gte(todayTimestamp))
//         )
//         .fetch();

//       let todaySales = 0, todayProfit = 0;
//       for (const m of todayMovements) {
//         const product = products.find(p => p.id === m.productId);
//         if (product) {
//           const sale = m.quantity * product.sellingPricePerBase;
//           const cost = m.quantity * product.costPricePerBase;
//           todaySales += sale;
//           todayProfit += (sale - cost);
//         }
//       }

//       // Recent sales
//       const recentMovements = await database.get<StockMovement>('stock_movements')
//         .query(
//           Q.where('shop_id', shopId),
//           Q.where('movement_type', 'sale'),
//           Q.sortBy('timestamp', Q.desc),
//           Q.take(5)
//         )
//         .fetch();

//       const recentSalesData: RecentSale[] = recentMovements.map(m => {
//         const product = products.find(p => p.id === m.productId);
//         return product ? {
//           id: m.id,
//           productName: product.name,
//           quantity: m.quantity,
//           amount: m.quantity * product.sellingPricePerBase,
//           timestamp: m.timestamp,
//         } : null;
//       }).filter(Boolean) as RecentSale[];

//       // Low stock products
//       const lowStockData: LowStockProduct[] = products
//         .filter(p => {
//           const stock = productStockMap.get(p.id) || 0;
//           return stock > 0 && stock <= (p.lowStockThreshold || 10);
//         })
//         .map(p => ({
//           id: p.id,
//           name: p.name,
//           currentStock: productStockMap.get(p.id) || 0,
//           lowStockThreshold: p.lowStockThreshold || 10,
//         }))
//         .slice(0, 5);

//       setStats({ totalProducts: products.length, totalStockValue, todaySales, todayProfit, lowStockItems, outOfStockItems });
//       setRecentSales(recentSalesData);
//       setLowStockProducts(lowStockData);
//     } catch (error) {
//       console.error('Dashboard error:', error);
//       Alert.alert('Erreur', 'Impossible de charger les données');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   };

//   useFocusEffect(React.useCallback(() => { loadDashboardData(); }, []));
//   const onRefresh = () => { setRefreshing(true); loadDashboardData(); };

//   const formatCurrency = (amount: number) => `₣${amount.toLocaleString('fr-BI')}`;
//   const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('fr-BI', { hour: '2-digit', minute: '2-digit' });

//   if (loading && !refreshing) return <DashboardSkeleton />;
//   if (!activeShop) return <EmptyShopState router={router} />;

//   return (
//     <View className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
//     <PremiumHeader 
//         title={t('dashboard.title')}
//         showProfile={true}
//         showBackButton={true}
//         pathname='/(tabs)/index'

//       />
//     <SafeAreaView className="flex-1 bg-surface-soft dark:bg-dark-surface-soft">
      

//       <ScrollView
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         showsVerticalScrollIndicator={false}
//         className="flex-1 -mt-10"
//       >
//         <View className="px-4 pb-6">
//           {/* Hero Header */}
//           <View className="mb-6">
//             <ThemedText variant="title" className="text-2xl font-bold text-text dark:text-dark-text">
//               Bonjour, {user?.displayName?.split(' ')[0]}! 👋
//             </ThemedText>
//             <ThemedText className="text-text-muted dark:text-dark-text-muted mt-1">
//               {activeShop.name} • {new Date().toLocaleDateString('fr-BI', { weekday: 'long', day: 'numeric', month: 'long' })}
//             </ThemedText>
//           </View>

//           {/* Stats Overview - Glass Cards */}
//           <View className="mb-6">
//             <ThemedText variant="title" className="text-lg font-semibold text-text dark:text-dark-text mb-3">
//               Aperçu d'aujourd'hui
//             </ThemedText>
            
//             <View className="gap-3">
//               {/* Sales Card */}
//               <GlassCard className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50">
//                 <View className="flex-row items-center justify-between">
//                   <View>
//                     <ThemedText className="text-text-muted dark:text-dark-text-muted text-sm">
//                       Ventes aujourd'hui
//                     </ThemedText>
//                     <ThemedText className="text-text dark:text-dark-text text-2xl font-bold mt-1">
//                       {formatCurrency(stats.todaySales)}
//                     </ThemedText>
//                     <View className="flex-row items-center mt-1">
//                       <ThemedText className={`text-sm font-medium ${stats.todayProfit >= 0 ? 'text-success' : 'text-error'}`}>
//                         {stats.todayProfit >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(stats.todayProfit))}
//                       </ThemedText>
//                       <ThemedText className="text-text-muted dark:text-dark-text-muted text-xs ml-2">
//                         bénéfice
//                       </ThemedText>
//                     </View>
//                   </View>
//                   <View className="w-12 h-12 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center">
//                     <ThemedText className="text-success text-xl">💰</ThemedText>
//                   </View>
//                 </View>
//               </GlassCard>

//               {/* Inventory Card */}
//               <GlassCard className="bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50">
//                 <View className="flex-row items-center justify-between">
//                   <View>
//                     <ThemedText className="text-text-muted dark:text-dark-text-muted text-sm">
//                       Valeur du stock
//                     </ThemedText>
//                     <ThemedText className="text-text dark:text-dark-text text-2xl font-bold mt-1">
//                       {formatCurrency(stats.totalStockValue)}
//                     </ThemedText>
//                     <View className="flex-row items-center mt-1">
//                       <ThemedText className="text-text-muted dark:text-dark-text-muted text-sm">
//                         {stats.totalProducts} produits actifs
//                       </ThemedText>
//                     </View>
//                   </View>
//                   <View className="w-12 h-12 rounded-full bg-brand/10 dark:bg-brand/20 flex items-center justify-center">
//                     <ThemedText className="text-brand text-xl">📦</ThemedText>
//                   </View>
//                 </View>
//               </GlassCard>

//               {/* Alerts Card */}
//               <GlassCard 
//                 className={cn(
//                   "bg-white/70 dark:bg-dark-surface/70 backdrop-blur-sm border border-border/50 dark:border-dark-border/50",
//                   (stats.lowStockItems > 0 || stats.outOfStockItems > 0) ? 'border-warning/50 dark:border-warning/50' : 'border-success/50 dark:border-success/50'
//                 )}
//               >
//                 <View className="flex-row items-center justify-between">
//                   <View>
//                     <ThemedText className="text-text-muted dark:text-dark-text-muted text-sm">
//                       Alertes de stock
//                     </ThemedText>
//                     <ThemedText className="text-text dark:text-dark-text text-2xl font-bold mt-1">
//                       {stats.lowStockItems + stats.outOfStockItems}
//                     </ThemedText>
//                     <View className="flex-row gap-2 mt-1">
//                       {stats.outOfStockItems > 0 && (
//                         <Badge variant="error" size="sm">
//                           Épuisé: {stats.outOfStockItems}
//                         </Badge>
//                       )}
//                       {stats.lowStockItems > 0 && (
//                         <Badge variant="warning" size="sm">
//                           Stock bas: {stats.lowStockItems}
//                         </Badge>
//                       )}
//                       {stats.lowStockItems === 0 && stats.outOfStockItems === 0 && (
//                         <Badge variant="success" size="sm">
//                           Tout est en stock ✅
//                         </Badge>
//                       )}
//                     </View>
//                   </View>
//                   <View className="w-12 h-12 rounded-full bg-warning/10 dark:bg-warning/20 flex items-center justify-center">
//                     <ThemedText className="text-warning text-xl">⚠️</ThemedText>
//                   </View>
//                 </View>
//               </GlassCard>
//             </View>
//           </View>

//           {/* Low Stock Section */}
//           {lowStockProducts.length > 0 && (
//             <View className="mb-6">
//               <View className="flex-row justify-between items-center mb-3">
//                 <ThemedText variant="title" className="text-lg font-semibold text-text dark:text-dark-text">
//                   Stock critique
//                 </ThemedText>
//                 <Button variant="ghost" size="sm" onPress={() => router.push('/(tabs)/stock/alerts')}>
//                   Voir tout
//                 </Button>
//               </View>
              
//               <View className="space-y-3">
//                 {lowStockProducts.map((item) => (
//                   <AlertCard key={item.id} type="warning">
//                     <View className="flex-1">
//                       <ThemedText className="font-medium text-text dark:text-dark-text">
//                         {item.name}
//                       </ThemedText>
//                       <View className="flex-row items-center mt-1">
//                         <ThemedText className="text-text-muted dark:text-dark-text-muted text-sm">
//                           Il reste seulement <ThemedText className="font-medium">{item.currentStock}</ThemedText> • Seuil: {item.lowStockThreshold}
//                         </ThemedText>
//                       </View>
//                     </View>
//                     <Button 
//                       size="sm" 
//                       variant="outline" 
//                       className="ml-3"
//                      // onPress={() => router.push(`/stock/purchase?productId=${item.id}`)}
//                     >
//                       Commander
//                     </Button>
//                   </AlertCard>
//                 ))}
//               </View>
//             </View>
//           )}

//           {/* Recent Sales */}
//           <View className="mb-6">
//             <View className="flex-row justify-between items-center mb-3">
//               <ThemedText variant="title" className="text-lg font-semibold text-text dark:text-dark-text">
//                 Dernières ventes
//               </ThemedText>
//               {recentSales.length > 0 && (
//                 <Button variant="ghost" size="sm" onPress={() => router.push('/sales')}>
//                   Voir tout
//                 </Button>
//               )}
//             </View>

//             {recentSales.length > 0 ? (
//               <View className="space-y-3">
//                 {recentSales.map((sale) => (
//                   <GlassCard 
//                     key={sale.id} 
//                     className="bg-white/60 dark:bg-dark-surface/60 backdrop-blur-sm border border-border/40 dark:border-dark-border/40"
//                   >
//                     <View className="flex-row items-center justify-between">
//                       <View className="flex-1">
//                         <ThemedText className="font-medium text-text dark:text-dark-text">
//                           {sale.productName}
//                         </ThemedText>
//                         <ThemedText className="text-text-muted dark:text-dark-text-muted text-sm mt-1">
//                           {sale.quantity} unités • {formatTime(sale.timestamp)}
//                         </ThemedText>
//                       </View>
//                       <ThemedText className="text-text dark:text-dark-text font-bold">
//                         {formatCurrency(sale.amount)}
//                       </ThemedText>
//                     </View>
//                   </GlassCard>
//                 ))}
//               </View>
//             ) : (
//               <GlassCard className="bg-white/60 dark:bg-dark-surface/60 backdrop-blur-sm border border-border/40 dark:border-dark-border/40 py-6">
//                 <ThemedText className="text-center text-text-muted dark:text-dark-text-muted">
//                   Aucune vente aujourd'hui. Commencez à vendre !
//                 </ThemedText>
//               </GlassCard>
//             )}
//           </View>

//           {/* Quick Actions - Floating Style */}
//           <View className="mb-8">
//             <ThemedText variant="title" className="text-lg font-semibold text-text dark:text-dark-text mb-3">
//               Actions rapides
//             </ThemedText>
            
//             <View className="grid grid-cols-2 gap-3">
//               <ActionButton 
//                 icon="📥" 
//                 title="Ajouter stock" 
//                 color="brand" 
//                 onPress={() => router.push('/(tabs)/stock/purchase')}
//               />
//               <ActionButton 
//                 icon="📤" 
//                 title="Vendre" 
//                 color="success" 
//                 onPress={() => router.push('/sales')}
//               />
//               <ActionButton 
//                 icon="🔍" 
//                 title="Produits" 
//                 color="text" 
//                 onPress={() => router.push('/products')}
//               />
//               <ActionButton 
//                 icon="📊" 
//                 title="Rapports" 
//                 color="warning" 
//                 onPress={() => router.push('/(tabs)/sales')}
//               />
//             </View>
//           </View>
//         </View>
//       </ScrollView>
//     </SafeAreaView>
//     </View>
//   );
// }

// // ==============
// // Reusable Components
// // ==============

// const GlassCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//   <View className={cn("rounded-2xl p-4", className)}>
//     {children}
//   </View>
// );

// const AlertCard = ({ children, type }: { children: React.ReactNode; type: 'warning' | 'error' }) => (
//   <View className={cn(
//     "flex-row items-center p-4 rounded-2xl border",
//     type === 'warning' 
//       ? 'bg-warning/5 border-warning/20 dark:bg-warning/10 dark:border-warning/30' 
//       : 'bg-error/5 border-error/20 dark:bg-error/10 dark:border-error/30'
//   )}>
//     {children}
//   </View>
// );

// const ActionButton = ({ icon, title, color, onPress }: { 
//   icon: string; 
//   title: string; 
//   color: 'brand' | 'success' | 'warning' | 'error' | 'text'; 
//   onPress: () => void; 
// }) => (
//   <Button 
//     variant="outline" 
//     className={cn(
//       "flex flex-col items-center justify-center h-24 rounded-2xl border-2",
//       color === 'brand' ? 'border-brand/30 dark:border-brand/40' :
//       color === 'success' ? 'border-success/30 dark:border-success/40' :
//       color === 'warning' ? 'border-warning/30 dark:border-warning/40' :
//       'border-border dark:border-dark-border'
//     )}
//     onPress={onPress}
//   >
//     <ThemedText className={cn(
//       "text-2xl mb-2",
//       color === 'brand' ? 'text-brand dark:text-dark-brand' :
//       color === 'success' ? 'text-success dark:text-dark-success' :
//       color === 'warning' ? 'text-warning dark:text-dark-warning' :
//       'text-text dark:text-dark-text'
//     )}>
//       {icon}
//     </ThemedText>
//     <ThemedText className="text-center text-sm font-medium text-text dark:text-dark-text">
//       {title}
//     </ThemedText>
//   </Button>
// );

// // ==============
// // Empty & Loading States
// // ==============

// const EmptyShopState = ({ router }: { router: any }) => (
//   <View className="flex-1 items-center justify-center p-6">
//     <EmptyState
//       icon="🏪"
//       title="Aucune boutique trouvée"
//       description="Créez votre première boutique pour commencer à gérer votre stock"
//       action={{
//         label: "Créer une boutique",
//         onPress: () => router.push('/(auth)/create-shop')
//       }}
//     />
//   </View>
// );

// const DashboardSkeleton = () => (
//   <View className="flex-1 p-4 bg-surface-soft dark:bg-dark-surface-soft">
//     <View className="mb-6">
//       <Skeleton width={200} height={28} className="mb-2" />
//       <Skeleton width={250} height={16} />
//     </View>
    
//     <View className="gap-3 mb-6">
//       {[1, 2, 3].map(i => (
//         <View key={i} className="h-24 bg-surface rounded-2xl border border-border/30 dark:bg-dark-surface/50 dark:border-dark-border/30" />
//       ))}
//     </View>
    
//     <View className="h-32 bg-surface rounded-2xl border border-border/30 dark:bg-dark-surface/50 dark:border-dark-border/30 mb-6" />
    
//     <View className="grid grid-cols-2 gap-3">
//       {[1, 2, 3, 4].map(i => (
//         <View key={i} className="h-24 bg-surface rounded-2xl border border-border/30 dark:bg-dark-surface/50 dark:border-dark-border/30" />
//       ))}
//     </View>
//   </View>
// );

// // Helper
// function cn(...classes: (string | undefined | null | false)[]): string {
//   return classes.filter(Boolean).join(' ');
// }

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, TouchableOpacity,  Animated } from "react-native";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import SalesOverviewChart from "@/components/charts/SalesOverviewChart";
import RevenueTrendChart from "@/components/charts/RevenueTrendChart";
import ComparisonChart from "@/components/charts/ComparisonChart";
import CumulativeMomentumChart from "@/components/charts/CumulativeMomentumChart";
import StockSummaryChart from "@/components/charts/StockSummaryChart";
import PremiumHeader from "@/components/layout/PremiumHeader";
import { ThemedText } from "@/components/ui/ThemedText";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
type Period = "daily" | "weekly" | "monthly";

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("daily");
  const { user } = useAuth();
  const { t } = useTranslation();

  useAuthRedirect();
  // ------------------------------
  // Hardcoded analytics data
  // ------------------------------
  const analytics = useMemo(() => ({
    daily: [
      { label: "Mon", value: 24000 },
      { label: "Tue", value: 31000 },
      { label: "Wed", value: 18000 },
      { label: "Thu", value: 26000 },
      { label: "Fri", value: 29000 },
      { label: "Sat", value: 20000 },
      { label: "Sun", value: 33000 },
    ],
    prevDaily: [
      { label: "Mon", value: 20000 },
      { label: "Tue", value: 28000 },
      { label: "Wed", value: 17000 },
      { label: "Thu", value: 25000 },
      { label: "Fri", value: 24000 },
      { label: "Sat", value: 22000 },
      { label: "Sun", value: 30000 },
    ],
    weekly: [
      { label: "W1", value: 150000 },
      { label: "W2", value: 132000 },
      { label: "W3", value: 165000 },
      { label: "W4", value: 178000 },
      { label: "W5", value: 190000 },
      { label: "W6", value: 160000 },
      { label: "W7", value: 180000 },
    ],
    prevWeekly: [
      { label: "W1", value: 138000 },
      { label: "W2", value: 125000 },
      { label: "W3", value: 158000 },
      { label: "W4", value: 170000 },
    ],
    monthly: [
      { label: "Jan", value: 680000 },
      { label: "Feb", value: 590000 },
      { label: "Mar", value: 720000 },
      { label: "Apr", value: 640000 },
      { label: "May", value: 750000 },
      { label: "Jun", value: 705000 },
    ],
    prevMonthly: [
      { label: "Jan", value: 620000 },
      { label: "Feb", value: 560000 },
      { label: "Mar", value: 700000 },
      { label: "Apr", value: 600000 },
      { label: "May", value: 710000 },
      { label: "Jun", value: 690000 },
    ],
    topProducts: [
      { name: "Sugar 1kg", revenue: 52000 },
      { name: "Rice 5kg", revenue: 41000 },
      { name: "Cooking Oil", revenue: 34000 },
      { name: "Soap Pack", revenue: 22500 },
      { name: "Salt 1kg", revenue: 12000 },
    ],
    stock: { in: 33, low: 9, out: 6 },
    totals: { revenue: 178000, profit: 42000, sales: 93, products: 48 },
  }), []);

  const currentData = analytics[period];
  const previousData =
    period === "daily"
      ? analytics.prevDaily
      : period === "weekly"
      ? analytics.prevWeekly
      : analytics.prevMonthly;

  const totalRevenue = currentData.reduce((s, d) => s + d.value, 0);
  const prevRevenue = previousData.reduce((s, d) => s + d.value, 0);
  const percentChange = Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100);

  const cumulativeData = currentData.map((d, i) => ({
    label: d.label,
    value: currentData.slice(0, i + 1).reduce((a, b) => a + b.value, 0),
  }));

  const displayStats =  {
    products: 156,
    sales: 125000,
    revenue: 2800000,
  };

    const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `FBU ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `FBU ${(amount / 1000).toFixed(0)}K`;
    return `FBU ${amount}`;
  };


  //console.log(currentData)

  // ------------------------------
  // UI
  // ------------------------------
  return (
   <View className="flex-1 bg-surface dark:bg-dark-surface">
    <PremiumHeader title="Dashboard" 
    showBackButton={true}
    />
    <ScrollView className="flex-1 bg-surface-soft dark:bg-dark-surface-soft p-2">
     <ThemedText variant="heading" className="mb-4">
      {'Welcome back, ' + (user ? user.displayName?.split(' ')[0] : '') + " 👐 ! "}
    </ThemedText>
      

      {/* 📊 Summary Metrics */}
      {/* <View className="flex-row flex-wrap justify-between mb-4">
        {[
          { label: "Revenue", value: `₣${analytics.totals.revenue.toLocaleString()}` },
          { label: "Profit", value: `₣${analytics.totals.profit.toLocaleString()}`, color: "text-success" },
          { label: "Sales", value: analytics.totals.sales },
          { label: "Products", value: analytics.totals.products },
        ].map((item, i) => (
          <Card key={i} className="w-[48%] mb-3">
            <Text className="text-text-soft">{item.label}</Text>
            <Text className={`text-xl font-semibold ${item.color ?? "text-text"}`}>
              {item.value}
            </Text>
          </Card>
        ))}
      </View> */}

      <View className="gap-2 mb-3">
        <View className="bg-surface dark:bg-dark-surface p-3 rounded-sm">
          <Text className="text-sm text-text-soft mb-4">Profit generated today</Text>
          <Text className="text-5xl font-semibold text-text dark:text-dark-text">{`${analytics.totals.revenue.toLocaleString()} FBU`}</Text>
          <View className="flex-row gap-3 mt-3">
            <Ionicons name="arrow-up" size={25} color="green" style={{ transform: [{ rotate: "45deg" }]}}/>
            <Text className="text-[18px] font-semibold text-success">{percentChange}%  More Than Last Week</Text>
          </View>
        </View>
      </View>

      <Animated.View 
        style={{ opacity: 1}}
        className="flex-row justify-between items-center mt-4 mb-3"
      >
        {[
          { icon: '📦', label: t('dashboard.products'), value: displayStats.products?.toString() || '0', trend: '+12%', color: 'text-brand dark:text-dark-brand' },
          { icon: '💰', label: t('dashboard.sales'), value: formatCurrency(displayStats.sales || 0), trend: '+23%', color: 'text-success dark:text-dark-success' },
          { icon: '📈', label: t('dashboard.revenue'), value: formatCurrency(displayStats.revenue || 0), trend: '+18%', color: 'text-warning dark:text-dark-warning' },
        ].map((stat, index) => (
          <View 
            key={index} 
            className="flex-row items-center bg-surface dark:bg-dark-surface rounded-sm px-1 py-2 flex-1 mx-1"
          >
            <Text className="text-base mr-2">{stat.icon}</Text>
            <View className="flex-1">
              <Text className="text-xs font-inter-medium text-text-muted dark:text-dark-text-muted">
                {stat.label}
              </Text>
              <View className="flex-row items-baseline">
                <Text className={`text-[10px] font-inter-bold ${stat.color} mr-1`}>
                  {stat.value}
                </Text>
                <Text className="text-xs font-inter-medium text-success dark:text-dark-success">
                  {stat.trend}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* 🕹️ Period Toggle */}
      <View className="flex-row justify-between mb-6 bg-surface dark:bg-dark-surface p-3 rounded-sm">
        {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            className={cn(
              "px-4 py-2 rounded-full mx-1",
              period === p ? "bg-brand dark:bg-dark-brand" : "bg-surface-soft dark:bg-dark-surface-soft"
            )}
          >
            <Text
              className={cn(
                "text-sm font-semibold",
                period === p ? "text-white" : "text-text-soft"
              )}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* === Charts Section === */}
      <SalesOverviewChart period={period} data={currentData} percentChange={percentChange} />
      <RevenueTrendChart currentData={currentData} />
      <ComparisonChart current={currentData} previous={previousData} />
      <CumulativeMomentumChart data={cumulativeData} />
      <StockSummaryChart stock={analytics.stock} />

      {/* ⚡ Quick Actions */}
      <View className="mt-6 mb-10">
        {/* 3D Title Bar */}
      <View className="flex-row items-center justify-center mb-4">
        <View
          className="px-5 py-2 rounded-2xl bg-white/10 dark:bg-dark-surface/40 
          border border-white/20 dark:border-dark-border/30 shadow-lg shadow-brand/20
          backdrop-blur-md"
          style={{
            shadowColor: '#38bdf8',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 6,
          }}
        >
          <Text
            className="text-lg font-extrabold tracking-wide text-brand dark:text-brand-light
            text-center drop-shadow-lg"
            style={{
              textShadowColor: 'rgba(56,189,248,0.7)',
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
          >
            ⚡ Quick Actions ⚡
          </Text>
        </View>
      </View>


        <View className="flex-row flex-wrap justify-between mt-4">
          {[
            { title: "Add Stock", icon: "📥", color: "brand", onPress: () => console.log("Add Stock") },
            { title: "Sell", icon: "💸", color: "success", onPress: () => console.log("Sell Item") },
            { title: "Products", icon: "📦", color: "warning", onPress: () => console.log("Products") },
            { title: "Reports", icon: "📊", color: "info", onPress: () => console.log("Reports") },
          ].map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              className={cn(
                "w-[48%] mb-3 rounded-2xl py-5 flex items-center justify-center border-2",
                "bg-surface dark:bg-dark-surface backdrop-blur-md cursor-pointer",
                action.color === "brand" ? "border-brand/40" :
                action.color === "success" ? "border-success/40" :
                action.color === "warning" ? "border-warning/40" :
                action.color === "info" ? "border-info/40" : "border-border/30"
              )}
              activeOpacity={0.8}
            >
              <Text
                className={cn(
                  "text-2xl mb-2",
                  action.color === "brand" ? "text-brand" :
                  action.color === "success" ? "text-success" :
                  action.color === "warning" ? "text-warning" :
                  action.color === "info" ? "text-info" : "text-text"
                )}
              >
                {action.icon}
              </Text>
              <Text className="text-sm font-semibold text-text dark:text-dark-text">
                {action.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

    </ScrollView>
   </View>
  );
}