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
  const { style, ...rest } = props;

  return (
    <TextInput
      placeholderTextColor={"rgba(255, 255, 255, 0.7)"}
      selectionColor="#FFFFFF"
      underlineColorAndroid="transparent"
      style={[
        {
          backgroundColor: "rgba(255,255,255,0.08)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.16)",
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