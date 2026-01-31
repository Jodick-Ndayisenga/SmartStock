// components/FloatingTabBar.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';

const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const { isDark } = useTheme();
  
  return (
    <View style={{ 
      flexDirection: 'row',
      backgroundColor: isDark ? '#1e293b' : '#f8fafc',
      borderRadius: 20,
      marginHorizontal: 8,
      marginBottom: 16,
      marginTop: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : 'rgba(226, 232, 240, 0.6)',
      backdropFilter: 'blur(10px)',
    }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconName = getIconName(route.name, isFocused);

        return (
          <TabBarItem
            key={route.key}
            isFocused={isFocused}
            isDark={isDark}
            iconName={iconName}
            label={label}
            onPress={onPress}
            onLongPress={onLongPress}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
          />
        );
      })}
    </View>
  );
};

const TabBarItem = ({ 
  isFocused, 
  isDark, 
  iconName, 
  label, 
  onPress, 
  onLongPress, 
  accessibilityState, 
  accessibilityLabel, 
  testID 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.05 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  const activeColor = isDark ? '#38bdf8' : '#0ea5e9';
  const inactiveColor = isDark ? '#64748b' : '#94a3b8';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ 
        flex: 1, 
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: isFocused 
            ? (isDark 
                ? 'rgba(56, 189, 248, 0.15)' 
                : 'rgba(14, 165, 233, 0.1)'
              )
            : 'transparent',
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        }}
      >
        <Ionicons
          name={iconName}
          size={isFocused ? 22 : 20}
          color={isFocused ? activeColor : inactiveColor}
        />
      </Animated.View>
      
      <Text
        style={{
          fontSize: 10,
          fontWeight: isFocused ? '600' : '500',
          marginTop: 2,
          color: isFocused ? activeColor : inactiveColor,
          opacity: isFocused ? 1 : 0.9,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const getIconName = (routeName, isFocused) => {
  const baseName = isFocused ? '' : '-outline';
  switch (routeName) {
    case 'index': return `grid${baseName}`;
    case 'products': return `cube${baseName}`;
    case 'stock': return `trending-up${baseName}`;
    case 'sales': return `cart${baseName}`;
    case 'profile': return `person${baseName}`;
    default: return `help${baseName}`;
  }
};

export default FloatingTabBar;