import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native";
import { colors, radius } from "../theme/colors";

export function AppCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
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