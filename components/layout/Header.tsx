// components/layout/Header.tsx
import React, { useState } from 'react';
import { View, TouchableOpacity, Text, TextInput, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// Types
interface HeaderProps {
  title?: string;
  subtitle?: string; // e.g., "Owner • Bujumbura"
  showBack?: boolean;
  showUser?: boolean;
  showNotification?: boolean;
  rightAction?: React.ReactNode;
  onNotificationPress?: () => void;
  searchable?: boolean;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = true,
  showUser = true,
  showNotification = false,
  rightAction,
  onNotificationPress,
  searchable = false,
  onSearch,
  searchPlaceholder = "Rechercher un produit...",
  className = '',
}) => {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { user } = useAuth();

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    onSearch?.(text);
  };

  const clearSearch = () => {
    setSearchQuery('');
    onSearch?.('');
  };


  // get initials 
  const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = '';
    for (let i = 0; i < names.length; i++) {
      initials += names[i].charAt(0).toLocaleUpperCase();
    }
    return initials;
  };

  // Get user context from your auth system (mocked here for clarity)
  // In real app: const { user, currentShop } = useAuth();
  const mockUser = { initials: getInitials(user?.displayName || ''), role: 'Propriétaire' };

  return (
    <>
      {/* Status bar — always matches surface */}
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0f172a' : '#ffffff'}
        translucent={Platform.OS === 'android'}
      />


      <View
        className={cn(
          'w-full px-4 flex-row items-center justify-between py-3',
          'bg-surface dark:bg-dark-surface',
          'border-b border-border dark:border-dark-border',
          className
        )}
      >
        {/* Left: Back + Title */}
        <View className="flex-1 flex-row items-center">
          {showBack && router.canGoBack() && (
            <TouchableOpacity
              onPress={handleBack}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-border dark:bg-dark-border mr-4"
              accessibilityLabel="Retour"
            >
              <Ionicons name="arrow-back-outline" size={22} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          )}

          {!isSearching && (
            <View className="flex-1">
              {title && (
                <Text
                  className={cn(
                    'text-lg font-inter-semibold text-text dark:text-dark-text',
                    'line-clamp-1'
                  )}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {title}
                </Text>
              )}
            </View>
          )}

          {/* Search Bar (full-width when active) */}
          {searchable && isSearching && (
            <View className="absolute left-0 right-0 top-0 z-10 bg-surface dark:bg-dark-surface px-4 py-3">
              <View className="flex-row items-center bg-surface-soft dark:bg-dark-surface-soft rounded-lg px-3 py-2 border border-border dark:border-dark-border">
                <Ionicons name="search" size={18} color={isDark ? '#94a3b8' : '#64748b'} />
                <TextInput
                  value={searchQuery}
                  onChangeText={handleSearch}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                  className="flex-1 ml-2 text-text dark:text-dark-text font-inter-regular"
                  autoFocus
                  returnKeyType="search"
                  onSubmitEditing={() => onSearch?.(searchQuery)}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={clearSearch} className="ml-2 p-1">
                    <Ionicons name="close-circle" size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Right: Actions */}
        <View className="flex-row items-center gap-2">
          {/* Search Toggle */}
          {searchable && !isSearching && (
            <TouchableOpacity
              onPress={() => setIsSearching(true)}
              className="p-2 rounded-full active:bg-surface-muted dark:active:bg-dark-surface-muted"
            >
              <Ionicons name="search" size={22} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          )}

          {/* Close Search */}
          {isSearching && (
            <TouchableOpacity
              onPress={() => {
                setIsSearching(false);
                clearSearch();
              }}
              className="p-2 rounded-full active:bg-surface-muted dark:active:bg-dark-surface-muted"
            >
              <Ionicons name="close" size={22} color={isDark ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>
          )}

          {/* Notification (optional) */}
          {showNotification && !isSearching && (
            <TouchableOpacity
              onPress={onNotificationPress}
              className="p-2 rounded-full relative active:bg-surface-muted dark:active:bg-dark-surface-muted"
            >
              <Ionicons name="notifications-outline" size={22} color={isDark ? '#cbd5e1' : '#475569'} />
              {/* Dot indicator */}
              <View className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
            </TouchableOpacity>
          )}

          {/* Right Action (e.g., Edit, Save) */}
          {!isSearching && rightAction}

          {/* User Identity */}
          {!isSearching && showUser && (
            <View className="flex-row items-center space-x-2 ml-2">
              <View className="w-8 h-8 rounded-full bg-brand/10 dark:bg-dark-brand/20 flex items-center justify-center">
                <Text className="text-sm font-inter-medium text-brand dark:text-dark-brand">
                  {mockUser.initials}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </>
  );
};

// Export variants if needed
export default Header;