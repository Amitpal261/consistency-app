import React, { useRef } from "react";
import { Animated, Pressable, ActivityIndicator, Text, View, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "danger" | "ghost" | "glass";
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function AppButton({
  title,
  onPress,
  loading,
  disabled,
  variant = "primary",
  icon,
  style,
  textStyle,
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }

  const getGradientColors = (): readonly [string, string, ...string[]] | null => {
    if (variant === "primary") return ["#3f51b5", "#293ca0"] as const;
    if (variant === "tertiary") return ["#fabd00", "#745600"] as const;
    return null;
  };

  const getSolidBackground = () => {
    if (variant === "secondary") return "rgba(255, 255, 255, 0.08)";
    if (variant === "glass") return "rgba(28, 27, 27, 0.8)";
    if (variant === "danger") return "rgba(147, 0, 10, 0.2)";
    if (variant === "ghost") return "transparent";
    return colors.primaryContainer;
  };

  const getTextColor = () => {
    if (variant === "primary") return "#FFFFFF";
    if (variant === "tertiary") return "#261a00";
    if (variant === "danger") return colors.error;
    if (variant === "ghost") return colors.primary;
    return colors.onSurface;
  };

  const getShadowStyle = () => {
    if (variant === "primary") {
      return {
        shadowColor: "#3f51b5",
        shadowOpacity: 0.5,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      };
    }
    if (variant === "tertiary") {
      return {
        shadowColor: "#fabd00",
        shadowOpacity: 0.4,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      };
    }
    return {};
  };

  const gradient = getGradientColors();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={{
          borderRadius: radius.full,
          overflow: "hidden",
          opacity: disabled ? 0.45 : 1,
          borderWidth: variant === "glass" || variant === "secondary" ? 1 : 0,
          borderColor: variant === "glass" ? "rgba(186, 195, 255, 0.2)" : "rgba(255, 255, 255, 0.1)",
          ...getShadowStyle(),
        }}
      >
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingVertical: 16,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color={getTextColor()} />
            ) : (
              <>
                {icon}
                <Text style={[{ color: getTextColor(), fontWeight: "700", fontSize: 15, letterSpacing: 0.3 }, textStyle]}>
                  {title}
                </Text>
              </>
            )}
          </LinearGradient>
        ) : (
          <View
            style={{
              backgroundColor: getSolidBackground(),
              paddingVertical: 16,
              paddingHorizontal: 24,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? (
              <ActivityIndicator color={getTextColor()} />
            ) : (
              <>
                {icon}
                <Text style={[{ color: getTextColor(), fontWeight: "700", fontSize: 15, letterSpacing: 0.3 }, textStyle]}>
                  {title}
                </Text>
              </>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}