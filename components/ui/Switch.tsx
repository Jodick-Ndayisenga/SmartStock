import React from "react";
import { Pressable, View, Animated, Easing } from "react-native";
import { useColorScheme } from "nativewind";
import { cn } from "../../lib/utils";

// Props
interface SwitchProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  disabled = false,
  onChange,
  size = "md",
  className,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animation
  const translateX = React.useRef(new Animated.Value(checked ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(translateX, {
      toValue: checked ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [checked]);

  // Sizes
  const sizes = {
    sm: { width: 36, height: 20, knob: 16 },
    md: { width: 44, height: 24, knob: 20 },
    lg: { width: 54, height: 30, knob: 26 },
  };

  const { width, height, knob } = sizes[size];

  const knobTranslate = translateX.interpolate({
    inputRange: [0, 1],
    outputRange: [2, width - knob - 2],
  });

  // Colors
  const trackColor = checked
    ? isDark
      ? "#4ade80" // green-400
      : "#22c55e" // green-500
    : isDark
    ? "#334155" // slate-700
    : "#e2e8f0"; // slate-200

  const knobColor = disabled
    ? isDark
      ? "#475569" // slate-600
      : "#cbd5e1" // slate-300
    : "#ffffff";

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(!checked)}
      className={cn("items-center justify-center", disabled && "opacity-50", className)}
    >
      <View
        style={{ width, height, borderRadius: height / 2, backgroundColor: trackColor }}
        className={cn("relative overflow-hidden")}
      >
        <Animated.View
          style={{
            width: knob,
            height: knob,
            borderRadius: knob / 2,
            backgroundColor: knobColor,
            transform: [{ translateX: knobTranslate }],
          }}
        />
      </View>
    </Pressable>
  );
};

/*tsx
// Switch.tsx
import React from "react";
import { Pressable, Animated, Easing, ViewStyle } from "react-native";
import { useColorScheme } from "nativewind";

interface SwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  style?: ViewStyle;
}

const sizes = {
  sm: { width: 36, height: 20, knob: 16 },
  md: { width: 44, height: 24, knob: 20 },
  lg: { width: 56, height: 32, knob: 28 },
};

export default function Switch({ checked, onChange, size = "md", disabled = false, style }: SwitchProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const config = sizes[size];

  const knobAnim = React.useRef(new Animated.Value(checked ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(knobAnim, {
      toValue: checked ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [checked]);

  const translateX = knobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, config.width - config.knob - 2],
  });

  const trackColor = checked
    ? isDark
      ? "#4ade80" // green-400
      : "#22c55e" // green-500
    : isDark
      ? "#334155" // slate-700
      : "#e2e8f0"; // slate-200

  const knobColor = disabled
    ? isDark
      ? "#475569" // muted dark
      : "#cbd5e1" // muted light
    : "#ffffff";

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      style={[{ width: config.width, height: config.height, opacity: disabled ? 0.5 : 1 }, style]}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityState={{ checked, disabled }}
    >
      <Animated.View
        style={{
          width: config.width,
          height: config.height,
          borderRadius: config.height / 2,
          backgroundColor: trackColor,
          justifyContent: "center",
          padding: 2,
        }}
      >
        <Animated.View
          style={{
            width: config.knob,
            height: config.knob,
            borderRadius: config.knob / 2,
            backgroundColor: knobColor,
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 2,
            elevation: 2,
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
```

*/