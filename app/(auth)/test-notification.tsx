// screens/DebugNotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Button, StyleSheet, Alert } from 'react-native';
import { notificationService } from '@/services/notificationService';
import { useStockNotifications } from '@/hooks/useStockNotifications';

export default function DebugNotificationsScreen() {
  const [permissionStatus, setPermissionStatus] = useState<string>('');
  const [scheduledCount, setScheduledCount] = useState<number>(0);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  
  // This will initialize the notification hook (but won't trigger automatically)
  useStockNotifications();

  useEffect(() => {
    refreshStatus();
  }, []);

  const refreshStatus = async () => {
    const status = await notificationService.getNotificationStatus();
    setPermissionStatus(status);
    
    const scheduled = await notificationService.getAllScheduledNotifications();
    setScheduledCount(scheduled.length);
    
    const badge = await notificationService.getBadgeCountAsync();
    setBadgeCount(badge);
  };

  const requestPermissions = async () => {
    const initialized = await notificationService.initialize();
    if (initialized) {
      Alert.alert('Success', 'Notification permissions granted!');
      refreshStatus();
    } else {
      Alert.alert('Error', 'Failed to get notification permissions');
    }
  };

  const sendTestNotification = async () => {
    await notificationService.sendTestNotification();
    Alert.alert('Test', 'Test notifications scheduled! Check notification tray.');
    refreshStatus();
  };

  const sendStockAlertTest = async () => {
    await notificationService.sendLocalNotification({
      variant: 'warning',
      title: '⚠️ Stock Faible (Test)',
      message: 'Ceci est un test de notification de stock faible',
      data: { productId: 'test-123', type: 'low_stock', test: true },
      channelId: 'stock-alerts',
      priority: 'high',
    });
    
    Alert.alert('Test', 'Stock alert test sent!');
  };

  const cancelAll = async () => {
    await notificationService.cancelAllNotifications();
    Alert.alert('Cancelled', 'All scheduled notifications cancelled');
    refreshStatus();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>🔔 Notification Debug</Text>
        
        <View style={styles.status}>
          <Text>Permission Status: </Text>
          <Text style={styles.badge}>{permissionStatus || 'Unknown'}</Text>
        </View>
        
        <View style={styles.status}>
          <Text>Scheduled Notifications: </Text>
          <Text style={styles.badge}>{scheduledCount}</Text>
        </View>
        
        <View style={styles.status}>
          <Text>Badge Count: </Text>
          <Text style={styles.badge}>{badgeCount}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Permissions</Text>
        <Button title="Request Permissions" onPress={requestPermissions} />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Test Notifications</Text>
        <Button title="Send Simple Test" onPress={sendTestNotification} />
        <View style={styles.spacer} />
        <Button title="Send Stock Alert Test" onPress={sendStockAlertTest} />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>Management</Text>
        <Button title="Cancel All Notifications" onPress={cancelAll} color="#dc2626" />
        <View style={styles.spacer} />
        <Button title="Refresh Status" onPress={refreshStatus} />
      </View>

      <View style={styles.section}>
        <Text style={styles.subtitle}>⚠️ Note</Text>
        <Text style={styles.note}>
          • For stock notifications to trigger, you need products with stock_quantity {'>'} 0 and {'<='} threshold{'\n'}
          • Out of stock triggers when stock_quantity = 0{'\n'}
          • Notifications only fire once every 24 hours per product
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  badge: {
    fontWeight: 'bold',
    color: '#0ea5e9',
  },
  spacer: {
    height: 10,
  },
  note: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});