// context/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ui/ThemedText';
import { useColorScheme } from 'nativewind';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationConfig = {
  success: {
    icon: 'checkmark-circle',
    bgColor: 'bg-success dark:bg-dark-success',
    textColor: 'text-white',
  },
  error: {
    icon: 'alert-circle',
    bgColor: 'bg-error dark:bg-dark-error',
    textColor: 'text-white',
  },
  warning: {
    icon: 'warning',
    bgColor: 'bg-warning dark:bg-dark-warning',
    textColor: 'text-white',
  },
  info: {
    icon: 'information-circle',
    bgColor: 'bg-info dark:bg-dark-info',
    textColor: 'text-white',
  },
};

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [newNotification, ...prev]);

    // Animate in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();

    // Auto hide after duration
    const duration = notification.duration || 3000;
    setTimeout(() => {
      hideNotification(id);
    }, duration);
  }, []);

  const hideNotification = useCallback((id: string) => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, clearAllNotifications }}>
      {children}
      
      {/* Notification Toast */}
      {notifications.length > 0 && (
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
            position: 'absolute',
            top: 50,
            left: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          {notifications.slice(0, 1).map(notification => {
            const config = notificationConfig[notification.type];
            
            return (
              <View
                key={notification.id}
                className={`${config.bgColor} rounded-xl shadow-elevated overflow-hidden`}
              >
                <View className="flex-row items-center p-4">
                  <View className="mr-3">
                    <Ionicons name={config.icon as any} size={24} color="#fff" />
                  </View>
                  
                  <View className="flex-1">
                    <ThemedText className="text-white font-semibold text-base">
                      {notification.title}
                    </ThemedText>
                    {notification.message && (
                      <ThemedText className="text-white/90 text-sm mt-0.5">
                        {notification.message}
                      </ThemedText>
                    )}
                  </View>

                  {notification.action ? (
                    <TouchableOpacity
                      onPress={notification.action.onPress}
                      className="ml-2 px-3 py-1.5 bg-white/20 rounded-lg"
                    >
                      <ThemedText className="text-white text-sm font-medium">
                        {notification.action.label}
                      </ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => hideNotification(notification.id)}
                      className="ml-2 p-1.5"
                    >
                      <Ionicons name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                
                {/* Progress bar */}
                {notification.duration && (
                  <View className="h-1 bg-white/30">
                    <Animated.View
                      className="h-full bg-white"
                      style={{
                        width: '100%',
                        // This would need an animation for progress
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}