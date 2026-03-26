// hooks/useStockNotifications.ts
import { useEffect, useRef, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { Observable } from '@nozbe/watermelondb/utils/rx';
import database from '@/database'; // Ensure this points to your singleton DB instance
import { notificationService } from '@/services/notificationService';
import { Product } from '@/database/models/Product';

// ---------------------------------------------------------
// STEP 1: Define the local useLiveQuery hook here 
// (Or import it from '@/hooks/useLiveQuery' if you created that file)
// ---------------------------------------------------------

function useLiveQuery<T>(
  factory: () => Observable<T> | null,
  deps: any[] = []
): T | null {
  const [data, setData] = useState<T | null>(null);
  
  useEffect(() => {
    const observable = factory();
    // Move the "if (!observable)" check INSIDE the effect, 
    // so the effect itself still runs every time.
    if (!observable) {
      setData(null);
      return;
    }
    
    const subscription = observable.subscribe({
      next: (result) => setData(result),
      error: (err) => console.error('[useLiveQuery] Error:', err),
    });
    return () => subscription.unsubscribe();
  }, deps);

  return data;
}

// Helper function to normalize timestamp to milliseconds
const normalizeTimestamp = (timestamp: any): number => {
  if (!timestamp) return 0;
  
  // Convert to number if it's a string
  let ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  
  // If timestamp is in microseconds (16+ digits), convert to milliseconds
  if (ts > 1e15) {
    ts = Math.floor(ts / 1000);
  }
  
  // If timestamp is in seconds (10 digits), convert to milliseconds
  if (ts > 1e9 && ts < 1e11) {
    ts = ts * 1000;
  }
  
  return ts;
};

// ---------------------------------------------------------
// STEP 2: The Main Notification Hook
// ---------------------------------------------------------
export const useStockNotifications = () => {
  // Track notified IDs in memory to prevent double-firing during rapid re-renders
  const notifiedIds = useRef<Set<string>>(new Set());

  /**
   * Query 1: Low Stock Products
   * Logic: Stock > 0 AND Stock <= Threshold
   * Note: WatermelonDB queries need explicit column names. 
   * Assuming your schema has 'quantity' and 'low_stock_threshold'.
   */
  const lowStockProducts = useLiveQuery<Product[]>(
    () => {
      // Safety check: if DB not ready, return null
      if (!database) return null;

      return database
        .get<Product>('products')
        .query(
          Q.where('stock_quantity', Q.gt(0)), // Greater than 0
          Q.where('stock_quantity', Q.lte(5)) // Less than or equal to threshold (e.g., 5)
          // If you have a dynamic threshold column per product, you'd filter in JS or use a more complex Q.or
        )
        .observe();
    },
    [] // Dependencies: usually empty if querying all products, or add [shopId] if scoped
  );

  /**
   * Query 2: Out of Stock Products
   * Logic: Stock == 0
   */
  const outOfStockProducts = useLiveQuery<Product[]>(
    () => {
      if (!database) return null;

      return database
        .get<Product>('products')
        .query(
          Q.where('stock_quantity', 0)
        )
        .observe();
    },
    []
  );

  // ---------------------------------------------------------
  // Handle Low Stock Alerts
  // ---------------------------------------------------------
  useEffect(() => {
    if (!lowStockProducts || lowStockProducts.length === 0) return;

    lowStockProducts.forEach(async (product) => {
      // Safety check: ensure product has necessary fields
      const currentStock = product.stockQuantity ?? 0;
      const threshold = product.lowStockThreshold ?? 5; // Default to 5 if not set

      // Check logic: Is it actually low stock?
      if (currentStock > threshold || currentStock <= 0) return;

      const key = `low-${product.id}`;
      
      // Prevent duplicate notifications in same session
      if (notifiedIds.current.has(key)) return;

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;
      
      // Check lastNotifiedAt with timestamp normalization
      const rawLastNotified = (product as any).lastNotifiedAt;
      const lastNotified = normalizeTimestamp(rawLastNotified);
      const shouldNotify = !lastNotified || (now - lastNotified > twentyFourHours);

      if (!shouldNotify) return;

      console.log(`📦 Low Stock Alert: ${product.name} (${currentStock} left)`);

      try {
        const notificationId = await notificationService.sendLocalNotification({
          variant: 'warning',
          title: '⚠️ Stock Faible',
          message: `${product.name} n'a plus que ${currentStock} unités.`,
          data: { 
            productId: product.id, 
            type: 'low_stock',
            sku: product.sku || 'N/A' 
          },
          channelId: 'stock-alerts',
          priority: 'high',
          delaySeconds: 2,
        });

        if (notificationId) {
          notifiedIds.current.add(key);

          // Update DB to mark as notified
          await database.write(async () => {
            await product.update((p) => {
              (p as any).lastNotifiedAt = now;
            });
          });
        }
      } catch (error) {
        console.error('Failed to send low stock notification:', error);
      }
    });
  }, [lowStockProducts]);

  // ---------------------------------------------------------
  // Handle Out of Stock Alerts
  // ---------------------------------------------------------
  useEffect(() => {
    if (!outOfStockProducts || outOfStockProducts.length === 0) return;

    outOfStockProducts.forEach(async (product) => {
        console.log(`this product is last notified: ${(product as any).lastNotifiedAt}`);
      const currentStock = product.stockQuantity ?? 0;
      if (currentStock !== 0) return; // Double check

      const key = `out-${product.id}`;
      if (notifiedIds.current.has(key)) return;

      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      
      
      // Check lastNotifiedAt with timestamp normalization
      const rawLastNotified = (product as any).lastNotifiedAt;
      const lastNotified = normalizeTimestamp(rawLastNotified);
      const shouldNotify = !lastNotified || (now - lastNotified > twentyFourHours);

      console.log(`This should notify: ${shouldNotify}`);

      console.log(`Times: now: ${now}, lastNotified: ${(product as any).lastNotifiedAt} lastNotified: ${lastNotified}, 24Hours: ${twentyFourHours}`);

      if (!shouldNotify) return;

      console.log(`❌ Out of Stock Alert: ${product.name}`);

      try {
        const notificationId = await notificationService.sendLocalNotification({
          variant: 'error',
          title: '❌ Rupture de Stock',
          message: `${product.name} est épuisé. Réapprovisionnement nécessaire.`,
          data: { 
            productId: product.id, 
            type: 'out_of_stock',
            sku: product.sku || 'N/A' 
          },
          channelId: 'stock-alerts',
          priority: 'high',
          delaySeconds: 2,
        });

        if (notificationId) {
          notifiedIds.current.add(key);

          await database.write(async () => {
            await product.update((p) => {
              (p as any).lastNotifiedAt = now;
            });
          });
        }
      } catch (error) {
        console.error('Failed to send out of stock notification:', error);
      }
    });
  }, [outOfStockProducts]);

  // Cleanup memory on unmount (optional, but good practice)
  useEffect(() => {
    return () => {
      notifiedIds.current.clear();
    };
  }, []);
};