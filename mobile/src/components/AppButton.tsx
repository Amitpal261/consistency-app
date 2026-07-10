import { ActivityIndicator, Pressable, Text, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius } from "../theme/colors";

type Props = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
};

export function AppButton({ title, onPress, loading, disabled, variant = "primary", style }: Props) {
  const bg =
    variant === "primary" ? colors.primary : variant === "danger" ? "transparent" : colors.surfaceElevated;
  const textColor = variant === "danger" ? colors.danger : variant === "primary" ? "#fff" : colors.textPrimary;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: bg,
          paddingVertical: 15,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
          borderWidth: variant === "danger" ? 1 : 0,
          borderColor: colors.danger,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ color: textColor, fontWeight: "700", fontSize: 15 }}>{title}</Text>
      )}
    </Pressable>
  );
}