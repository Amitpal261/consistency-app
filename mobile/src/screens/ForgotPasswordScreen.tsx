import { useEffect, useRef, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DotGridBackground from "../components/DotGridBackground";
import { requestPasswordReset } from "../lib/api";
import { colors, radius, spacing, typography } from "../theme/colors";

function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.8)).current;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.8,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    scaleAnimation.start();
    opacityAnimation.start();

    return () => {
      scaleAnimation.stop();
      opacityAnimation.stop();
    };
  }, [orbOpacity, orbScale]);

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.main}>
            <View style={styles.orbWrap}>
              <Animated.View
                style={[
                  styles.orbGlow,
                  {
                    transform: [{ scale: orbScale }],
                    opacity: orbOpacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.orb,
                  {
                    transform: [{ scale: orbScale }],
                    opacity: orbOpacity,
                  },
                ]}
              >
                <MaterialIcons name="mail-outline" size={36} color={colors.onPrimaryContainer} />
              </Animated.View>
            </View>

            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Reset your password</Text>
              <Text style={styles.heroSubtitle}>
                Enter the email associated with your account and we’ll send a reset link.
              </Text>
            </View>

            <View style={styles.formCard}>
              {success ? (
                <View style={styles.successPanel}>
                  <MaterialIcons name="check-circle" size={40} color={colors.primary} />
                  <Text style={styles.successTitle}>Check your email</Text>
                  <Text style={styles.successText}>
                    If that email is registered, we sent a password reset link to it.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Email Address</Text>
                    <View style={styles.inputRow}>
                      <MaterialIcons
                        name="mail-outline"
                        size={20}
                        color={colors.onSurfaceVariant}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="name@example.com"
                        placeholderTextColor={colorWithAlpha(colors.outlineVariant, 0.5)}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        style={styles.input}
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Pressable
                    onPress={handleSubmit}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.submitButton,
                      pressed && styles.submitButtonPressed,
                      loading && styles.submitButtonDisabled,
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.onPrimaryContainer} />
                    ) : (
                      <Text style={styles.submitButtonText}>Send reset link</Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>

            <View style={styles.footerRow}>
              <Pressable onPress={onBackToLogin} style={styles.backButton}>
                <Text style={styles.backText}>Back to login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.sm,
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  orbWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  orbGlow: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    opacity: 0.2,
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  heroText: {
    alignItems: "center",
    gap: spacing.xs,
    width: "100%",
  },
  heroTitle: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    letterSpacing: -0.5,
    textAlign: "center",
    color: colors.onSurface,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  formCard: {
    width: "100%",
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: colorWithAlpha(colors.primaryContainer, 0.3),
    gap: spacing.lg,
    shadowColor: colors.surfaceContainerLowest,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: spacing.xs,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: spacing.xs,
    backgroundColor: "transparent",
  },
  error: {
    ...typography.bodyMd,
    color: colors.error,
    fontSize: 14,
  },
  submitButton: {
    width: "100%",
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  submitButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  submitButtonDisabled: {
    opacity: 0.75,
  },
  submitButtonText: {
    ...typography.headlineLgMobile,
    fontSize: 18,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  successPanel: {
    alignItems: "center",
    gap: spacing.sm,
  },
  successTitle: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    textAlign: "center",
    color: colors.onSurface,
  },
  successText: {
    ...typography.bodyMd,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  footerRow: {
    width: "100%",
    alignItems: "center",
  },
  backButton: {
    paddingVertical: spacing.sm,
  },
  backText: {
    ...typography.labelCaps,
    color: colors.primary,
    letterSpacing: 1.2,
  },
});
