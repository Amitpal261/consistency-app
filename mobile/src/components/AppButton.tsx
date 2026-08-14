import { useRef } from "react";
import { Animated, Pressable, ActivityIndicator, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared premium button: subtle glow shadow + a spring "press" scale, matching
 * the same interaction feel already used in LoginScreen's custom button.
 * Upgrading this one file lifts every screen that already uses AppButton.
 */
export function AppButton({ title, onPress, loading, disabled, variant = "primary", style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  const bg = isPrimary ? colors.primaryContainer : isDanger ? "transparent" : colors.surfaceContainerHigh;
  const textColor = isDanger ? colors.error : isPrimary ? colors.onPrimaryContainer : colors.onSurface;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  }

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={disabled || loading}
        style={{
          backgroundColor: bg,
          paddingVertical: 15,
          borderRadius: radius.full,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
          borderWidth: isDanger ? 1 : 0,
          borderColor: colors.error,
          ...(isPrimary
            ? {
                shadowColor: colors.primaryContainer,
                shadowOpacity: 0.35,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 6,
              }
            : {}),
        }}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}