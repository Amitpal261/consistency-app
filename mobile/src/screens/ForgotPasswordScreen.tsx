import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { requestPasswordReset } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard, AppTextInput } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

export function ForgotPasswordScreen({ onBackToLogin }: ForgotPasswordScreenProps) {
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.7)).current;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [orbScale]);

  async function handleSubmit() {
    setError(null);
    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.main}>
            {/* Orb Banner */}
            <View style={styles.orbWrap}>
              <Animated.View style={[styles.orbGlow, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
              <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.orb}>
                <MaterialIcons name="lock-reset" size={36} color={colors.surfaceTint} />
              </LinearGradient>
            </View>

            {/* Title Section */}
            <View style={styles.heroText}>
              <Text style={styles.kicker}>SECURITY RECOVERY</Text>
              <Text style={styles.heroTitle}>Reset Password</Text>
              <Text style={styles.heroSubtitle}>
                Enter your account email address. We'll send an authentication recovery link to reset your key.
              </Text>
            </View>

            {/* Form Card */}
            <AppCard variant="hero" style={styles.formCard}>
              {success ? (
                <View style={styles.successPanel}>
                  <MaterialIcons name="mark-email-read" size={44} color="#10B981" />
                  <Text style={styles.successTitle}>Check Your Inbox</Text>
                  <Text style={styles.successText}>
                    A password reset link has been dispatched to <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{email}</Text>.
                  </Text>
                  <AppButton title="Return to Sign In" onPress={onBackToLogin} variant="primary" style={{ width: "100%", marginTop: spacing.xs }} />
                </View>
              ) : (
                <>
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>REGISTERED EMAIL ADDRESS</Text>
                    <AppTextInput
                      placeholder="name@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      autoComplete="email"
                      keyboardType="email-address"
                    />
                  </View>

                  {error ? (
                    <View style={styles.errorBanner}>
                      <MaterialIcons name="error-outline" size={16} color={colors.error} />
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  ) : null}

                  <AppButton
                    title="Send Reset Link"
                    onPress={handleSubmit}
                    loading={loading}
                    variant="primary"
                    style={{ width: "100%" }}
                  />
                </>
              )}
            </AppCard>

            <Pressable onPress={onBackToLogin} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={16} color={colors.primary} />
              <Text style={styles.backText}>BACK TO SIGN IN</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.marginEdge,
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  main: {
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    gap: spacing.md,
  },
  orbWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xs,
  },
  orbGlow: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.4)",
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.25)",
    elevation: 10,
  },
  heroText: {
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  heroTitle: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    textAlign: "center",
    color: colors.onSurface,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  formCard: {
    width: "100%",
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(147, 0, 10, 0.2)",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: 10,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    fontSize: 13,
  },
  successPanel: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  successTitle: {
    ...typography.headlineLgMobile,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
  },
  successText: {
    ...typography.bodyMd,
    fontSize: 13,
    textAlign: "center",
    color: colors.onSurfaceVariant,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 1.2,
  },
});

