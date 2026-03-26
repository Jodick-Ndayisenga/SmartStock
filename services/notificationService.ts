// services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationVariant = 'success' | 'warning' | 'error' | 'info' | 'brand';
export type NotificationChannelId = 'stock-alerts' | 'reminders' | 'sync' | 'default';

export interface LocalNotificationOptions {
  variant?: NotificationVariant;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  sound?: string;
  delaySeconds?: number;
  repeat?: boolean;
  channelId?: NotificationChannelId;
  priority?: 'high' | 'default' | 'low';
}

export interface NotificationResponseData {
  variant?: NotificationVariant;
  productId?: string;
  type?: string;
  [key: string]: unknown;
}

// ============================================================================
// VARIANT CONFIGURATION
// ============================================================================

const variantConfig: Record<NotificationVariant, {
  color: string;
  sound: string;
  channelId: NotificationChannelId;
}> = {
  success: {
    color: '#22c55e',
    sound: 'default',
    channelId: 'sync',
  },
  warning: {
    color: '#f59e0b',
    sound: 'default',
    channelId: 'stock-alerts',
  },
  error: {
    color: '#ef4444',
    sound: 'default',
    channelId: 'stock-alerts',
  },
  info: {
    color: '#3b82f6',
    sound: 'default',
    channelId: 'default',
  },
  brand: {
    color: '#0ea5e9',
    sound: 'default',
    channelId: 'reminders',
  },
};

// ============================================================================
// NOTIFICATION HANDLER
// ============================================================================

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ============================================================================
// CHANNEL SETUP (Android Only)
// ============================================================================

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stock-alerts', {
      name: 'Stock Alerts',
      description: 'Low stock and out of stock notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0ea5e9',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      description: 'Daily check-ins and scheduled reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#0ea5e9',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });

    await Notifications.setNotificationChannelAsync('sync', {
      name: 'Sync Status',
      description: 'Data synchronization notifications',
      importance: Notifications.AndroidImportance.LOW,
      vibrationPattern: [0, 50],
      lightColor: '#22c55e',
      sound: 'default',
      enableLights: false,
      enableVibrate: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      description: 'General app notifications',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100],
      lightColor: '#3b82f6',
      sound: 'default',
      enableLights: true,
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================

export class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      await setupNotificationChannels();

      const { status } = await Notifications.requestPermissionsAsync({
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: true,
          allowAnnouncements: false,
        },
      });

      this.isInitialized = status === 'granted';
      return this.isInitialized;
    } catch (error) {
      console.error('NotificationService initialization failed:', error);
      return false;
    }
  }

  async sendLocalNotification({
    variant = 'info',
    title,
    message,
    data = {},
    sound,
    delaySeconds = 0,
    repeat = false,
    channelId,
    priority = 'default',
  }: LocalNotificationOptions): Promise<string | null> {
    try {
      const config = variantConfig[variant];
      const finalChannelId: NotificationChannelId = channelId || config.channelId;
      const finalSound = sound || config.sound;

      let androidPriority: Notifications.AndroidNotificationPriority;
      switch (priority) {
        case 'high':
          androidPriority = Notifications.AndroidNotificationPriority.MAX;
          break;
        case 'low':
          androidPriority = Notifications.AndroidNotificationPriority.MIN;
          break;
        default:
          androidPriority = Notifications.AndroidNotificationPriority.DEFAULT;
      }

      let trigger: Notifications.NotificationTriggerInput | null = null;

      if (repeat) {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 86400,
        };
      } else if (delaySeconds > 0) {
        trigger = {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delaySeconds,
        };
      }

      // Base content with type-safe fields
      const content: Notifications.NotificationContentInput = {
        title,
        body: message,
        data: { variant, ...data },
        sound: finalSound,
        color: config.color,
        badge: 1,
        priority: androidPriority,
      };

      // Add Android-specific channelId (not in TS types but required at runtime)
      if (Platform.OS === 'android') {
        (content as any).channelId = finalChannelId;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: trigger as Notifications.NotificationTriggerInput,
      });

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  addResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  addReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(callback);
  }

  async getNotificationStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  }

  async openNotificationSettings(): Promise<void> {
    await Linking.openSettings();
  }

  async getBadgeCountAsync(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCountAsync(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  // Add to NotificationService class
async sendTestNotification(): Promise<void> {
  console.log('🧪 Sending test notification...');
  
  // Test immediate notification
  await this.sendLocalNotification({
    variant: 'success',
    title: '✅ Test Notification',
    message: `This is a test notification sent at ${new Date().toLocaleTimeString()}`,
    data: { test: true, timestamp: Date.now() },
    priority: 'high',
  });
  
  // Test delayed notification
  await this.sendLocalNotification({
    variant: 'warning',
    title: '⏰ Delayed Test',
    message: 'This notification was delayed by 5 seconds',
    delaySeconds: 5,
    data: { test: true, delayed: true },
  });
  
  console.log('✅ Test notifications scheduled');
}

async checkPermissions(): Promise<void> {
  const status = await this.getNotificationStatus();
  console.log('📱 Notification permission status:', status);
  
  if (status !== 'granted') {
    console.warn('⚠️ Notifications not granted. Opening settings...');
    await this.openNotificationSettings();
  }
}

async listScheduledNotifications(): Promise<void> {
  const scheduled = await this.getAllScheduledNotifications();
  console.log(`📋 Scheduled notifications: ${scheduled.length}`);
  scheduled.forEach(notif => {
    console.log(`  - ${notif.identifier}: ${notif.content.title}`);
  });
}
}

export const notificationService = NotificationService.getInstance();