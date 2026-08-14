import { TextInput, View, type TextInputProps, type ViewProps } from "react-native";
import { colors, radius } from "../theme/colors";

export function AppCard({ children, style, ...rest }: ViewProps & { children: React.ReactNode }) {
  return (
    <View
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.04)",
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          padding: 18,
          shadowColor: colors.surfaceContainerLowest,
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
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
      placeholderTextColor={"rgba(255, 255, 255, 0.4)"}
      selectionColor={colors.primary}
      underlineColorAndroid="transparent"
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.14)",
          borderRadius: radius.md,
          padding: 14,
          color: "#FFFFFF",
          fontSize: 15,
        },
        style,
      ]}
      {...rest}
    />
  );
}