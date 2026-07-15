import { TextInput, View, type TextInputProps, type ViewProps } from "react-native";
import { colors, radius } from "../theme/colors";

export function AppCard({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 18,
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
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      style={[
        {
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: 14,
          color: colors.textPrimary,
          fontSize: 15,
        },
        props.style,
      ]}
      {...props}
    />
  );
}