// services/saleQueueService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem } from '@/app/(tabs)/sales';

export type PaymentMode = 'cash' | 'credit';

export interface QueuedSale {
  id: string;
  cart: CartItem[];
  paymentMode: PaymentMode;
  selectedCustomer: string | null;
  dueDate: number | null;
  creditTerms: string;
  totalAmount: number;
  timestamp: number;
  shopId: string;
  userId: string;
  retryCount?: number;
  lastRetry?: number;
}

const QUEUE_STORAGE_KEY = '@sale_queue';
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

export class SaleQueueService {
  /**
   * Save a queued sale to AsyncStorage
   */
  static async saveQueuedSale(sale: QueuedSale): Promise<void> {
    try {
      const queue = await this.getQueuedSales();
      queue.push({
        ...sale,
        retryCount: 0,
        lastRetry: undefined
      });
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queued sale:', error);
      throw new Error('Failed to queue sale');
    }
  }

  /**
   * Get all queued sales from AsyncStorage
   */
  static async getQueuedSales(): Promise<QueuedSale[]> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return queueJson ? JSON.parse(queueJson) : [];
    } catch (error) {
      console.error('Error getting queued sales:', error);
      return [];
    }
  }

  /**
   * Remove a queued sale by ID
   */
  static async removeQueuedSale(saleId: string): Promise<void> {
    try {
      const queue = await this.getQueuedSales();
      const filteredQueue = queue.filter(sale => sale.id !== saleId);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filteredQueue));
    } catch (error) {
      console.error('Error removing queued sale:', error);
      throw new Error('Failed to remove queued sale');
    }
  }

  /**
   * Update a queued sale (increment retry count, update last retry)
   */
  static async updateQueuedSale(saleId: string, updates: Partial<QueuedSale>): Promise<void> {
    try {
      const queue = await this.getQueuedSales();
      const index = queue.findIndex(sale => sale.id === saleId);
      
      if (index !== -1) {
        queue[index] = { ...queue[index], ...updates };
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error updating queued sale:', error);
      throw new Error('Failed to update queued sale');
    }
  }

  /**
   * Clear all queued sales
   */
  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw new Error('Failed to clear queue');
    }
  }

  /**
   * Get count of queued sales
   */
  static async getQueueCount(): Promise<number> {
    try {
      const queue = await this.getQueuedSales();
      return queue.length;
    } catch (error) {
      console.error('Error getting queue count:', error);
      return 0;
    }
  }

  /**
   * Get stale sales that need retry
   * Returns sales that haven't been retried in the last RETRY_DELAY
   * and haven't exceeded MAX_RETRY_COUNT
   */
  static async getStaleSalesForRetry(): Promise<QueuedSale[]> {
    try {
      const queue = await this.getQueuedSales();
      const now = Date.now();
      
      return queue.filter(sale => {
        // Skip if max retries exceeded
        if ((sale.retryCount || 0) >= MAX_RETRY_COUNT) {
          return false;
        }
        
        // If never retried, include
        if (!sale.lastRetry) {
          return true;
        }
        
        // Check if enough time has passed since last retry
        return (now - sale.lastRetry) >= RETRY_DELAY;
      });
    } catch (error) {
      console.error('Error getting stale sales:', error);
      return [];
    }
  }

  /**
   * Get failed sales (exceeded max retries)
   */
  static async getFailedSales(): Promise<QueuedSale[]> {
    try {
      const queue = await this.getQueuedSales();
      return queue.filter(sale => (sale.retryCount || 0) >= MAX_RETRY_COUNT);
    } catch (error) {
      console.error('Error getting failed sales:', error);
      return [];
    }
  }

  /**
   * Mark a sale as failed (exceeded retry count)
   */
  static async markSaleAsFailed(saleId: string): Promise<void> {
    await this.updateQueuedSale(saleId, { 
      retryCount: MAX_RETRY_COUNT,
      lastRetry: Date.now() 
    });
  }

  /**
   * Increment retry count for a sale
   */
  static async incrementRetryCount(saleId: string): Promise<void> {
    try {
      const queue = await this.getQueuedSales();
      const index = queue.findIndex(sale => sale.id === saleId);
      
      if (index !== -1) {
        const currentRetryCount = queue[index].retryCount || 0;
        queue[index].retryCount = currentRetryCount + 1;
        queue[index].lastRetry = Date.now();
        
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('Error incrementing retry count:', error);
      throw new Error('Failed to increment retry count');
    }
  }

  /**
   * Get sales summary
   */
  static async getQueueSummary(): Promise<{
    total: number;
    pending: number;
    failed: number;
    totalAmount: number;
  }> {
    try {
      const queue = await this.getQueuedSales();
      const failed = queue.filter(s => (s.retryCount || 0) >= MAX_RETRY_COUNT);
      const pending = queue.filter(s => (s.retryCount || 0) < MAX_RETRY_COUNT);
      const totalAmount = queue.reduce((sum, sale) => sum + sale.totalAmount, 0);
      
      return {
        total: queue.length,
        pending: pending.length,
        failed: failed.length,
        totalAmount
      };
    } catch (error) {
      console.error('Error getting queue summary:', error);
      return {
        total: 0,
        pending: 0,
        failed: 0,
        totalAmount: 0
      };
    }
  }

  /**
   * Clean up old failed sales (older than 7 days)
   */
  static async cleanupOldSales(daysOld: number = 7): Promise<number> {
    try {
      const queue = await this.getQueuedSales();
      const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      
      const filteredQueue = queue.filter(sale => {
        // Keep if not failed or if it's newer than cutoff
        if ((sale.retryCount || 0) < MAX_RETRY_COUNT) {
          return true;
        }
        return sale.timestamp > cutoffTime;
      });
      
      const removedCount = queue.length - filteredQueue.length;
      
      if (removedCount > 0) {
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(filteredQueue));
      }
      
      return removedCount;
    } catch (error) {
      console.error('Error cleaning up old sales:', error);
      return 0;
    }
  }

  /**
   * Export queue data (for debugging/backup)
   */
  static async exportQueue(): Promise<string> {
    try {
      const queue = await this.getQueuedSales();
      return JSON.stringify(queue, null, 2);
    } catch (error) {
      console.error('Error exporting queue:', error);
      throw new Error('Failed to export queue');
    }
  }

  /**
   * Import queue data (for restore)
   */
  static async importQueue(queueData: string): Promise<void> {
    try {
      const queue = JSON.parse(queueData);
      // Validate queue data structure
      if (!Array.isArray(queue)) {
        throw new Error('Invalid queue data format');
      }
      
      // Basic validation of each sale
      queue.forEach(sale => {
        if (!sale.id || !sale.cart || !Array.isArray(sale.cart)) {
          throw new Error('Invalid sale data structure');
        }
      });
      
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, queueData);
    } catch (error) {
      console.error('Error importing queue:', error);
      throw new Error('Failed to import queue');
    }
  }

  /**
   * Check if a sale exists in queue
   */
  static async saleExists(saleId: string): Promise<boolean> {
    try {
      const queue = await this.getQueuedSales();
      return queue.some(sale => sale.id === saleId);
    } catch (error) {
      console.error('Error checking sale existence:', error);
      return false;
    }
  }

  /**
   * Get sales by customer
   */
  static async getSalesByCustomer(customerId: string): Promise<QueuedSale[]> {
    try {
      const queue = await this.getQueuedSales();
      return queue.filter(sale => sale.selectedCustomer === customerId);
    } catch (error) {
      console.error('Error getting sales by customer:', error);
      return [];
    }
  }

  /**
   * Get total value of queued sales
   */
  static async getTotalQueuedValue(): Promise<number> {
    try {
      const queue = await this.getQueuedSales();
      return queue.reduce((sum, sale) => sum + sale.totalAmount, 0);
    } catch (error) {
      console.error('Error getting total queued value:', error);
      return 0;
    }
  }
}