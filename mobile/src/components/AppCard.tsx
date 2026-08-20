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
    if (active) return "rgba(99, 102, 241, 0.16)";

    if (variant === "glass") {
      return "rgba(255, 255, 255, 0.055)";
    }

    if (variant === "hero") {
      return "rgba(255, 255, 255, 0.075)";
    }

    if (variant === "subtle") {
      return "rgba(255, 255, 255, 0.025)";
    }

    return "rgba(255, 255, 255, 0.045)";
  };

  const getBorderColor = () => {
    if (active) return "rgba(186, 195, 255, 0.38)";

    if (variant === "glass") {
      return "rgba(255, 255, 255, 0.14)";
    }

    if (variant === "hero") {
      return "rgba(255, 255, 255, 0.16)";
    }

    if (variant === "bordered") {
      return "rgba(186, 195, 255, 0.22)";
    }

    return "rgba(255, 255, 255, 0.09)";
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

          // Soft floating glass shadow
          shadowColor: "#000000",
          shadowOpacity: 0.28,
          shadowRadius: 24,
          shadowOffset: {
            width: 0,
            height: 12,
          },

          elevation: 7,

          // Helps create a slightly softer glass surface
          overflow: "hidden",
        },
        style,
      ]}
      {...rest}
    >
      {/* Soft glass highlight */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: "rgba(255, 255, 255, 0.28)",
        }}
      />

      {/* Subtle inner glow */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -1,
          left: -1,
          right: -1,
          height: -1,
          backgroundColor: "rgba(15, 99, 225, 0.9)",
          borderRadius: radius.default,
        }}
      />

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
          backgroundColor: "rgba(255, 255, 255, 0.045)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.12)",
          borderRadius: radius.default,
          paddingHorizontal: 16,
          paddingVertical: 14,
          color: colors.onSurface,
          fontSize: 15,

          shadowColor: "#000000",
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: {
            width: 0,
            height: 5,
          },

          elevation: 2,
        },
        style,
      ]}
      {...rest}
    />
  );
}