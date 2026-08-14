import React from "react";
import { TextInput, View, type TextInputProps, type ViewProps } from "react-native";
import { colors, radius, spacing } from "../theme/colors";

export type CardVariant = "default" | "glass" | "bordered" | "hero" | "subtle";

export function AppCard({
  children,
  style,
  variant = "default",
  active,
  ...rest
}: ViewProps & {
  children: React.ReactNode;
  variant?: CardVariant;
  active?: boolean;
}) {
  const getBackgroundColor = () => {
    if (active) return "rgba(63, 81, 181, 0.18)";
    if (variant === "glass") return "rgba(28, 27, 27, 0.75)";
    if (variant === "hero") return "rgba(32, 31, 31, 0.85)";
    if (variant === "subtle") return "rgba(255, 255, 255, 0.02)";
    return "rgba(28, 27, 27, 0.6)";
  };

  const getBorderColor = () => {
    if (active) return "rgba(186, 195, 255, 0.4)";
    if (variant === "glass") return "rgba(63, 81, 181, 0.25)";
    if (variant === "hero") return "rgba(186, 195, 255, 0.2)";
    return "rgba(255, 255, 255, 0.08)";
  };

  return (
    <View
      style={[
        {
          backgroundColor: getBackgroundColor(),
          borderRadius: radius.default,
          borderWidth: 1,
          borderColor: getBorderColor(),
          padding: spacing.gutter,
          shadowColor: colors.surfaceContainerLowest,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function AppTextInput(props: TextInputProps) {
  const { style, ...rest } = props;

  return (
    <TextInput
      placeholderTextColor="rgba(229, 226, 225, 0.4)"
      selectionColor={colors.primary}
      underlineColorAndroid="transparent"
      style={[
        {
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          borderWidth: 1,
          borderColor: "rgba(186, 195, 255, 0.15)",
          borderRadius: radius.default,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.onSurface,
          fontSize: 15,
        },
        style,
      ]}
      {...rest}
    />
  );
}