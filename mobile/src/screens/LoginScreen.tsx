import React, { useEffect, useRef, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
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
import { LinearGradient } from "expo-linear-gradient";
import { login, signup } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DotGridBackground from "../components/DotGridBackground";
import { AppCard } from "../components/AppCard";
import { AppButton } from "../components/AppButton";
import { colors, radius, spacing, typography } from "../theme/colors";

export function LoginScreen({ onForgotPassword }: { onForgotPassword?: () => void }) {
  const { setToken } = useAuth();
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.7)).current;

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<"name" | "email" | "password" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.08,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, {
          toValue: 0.9,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.6,
          duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    opacityAnimation.start();

    return () => {
      animation.stop();
      opacityAnimation.stop();
    };
  }, [orbOpacity, orbScale]);

  async function handleSubmit() {
    if (!email || !password || (isSignup && !name)) {
      setError("Please fill out all required fields.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = isSignup ? await signup(name, email, password) : await login(email, password);
      setToken(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.main}>
            {/* Top Atmospheric Glowing Orb */}
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
              <LinearGradient
                colors={["#3f51b5", "#08218a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.orb}
              >
                <MaterialIcons name="lock-clock" size={36} color={colors.surfaceTint} />
              </LinearGradient>
            </View>

            {/* Header Text */}
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>{isSignup ? "Create Account" : "Welcome Back"}</Text>
              <Text style={styles.heroSubtitle}>
                {isSignup
                  ? "Start proving your goals with zero friction & full accountability."
                  : "Sign in to access your habits, streaks, and buddy proof inbox."}
              </Text>
            </View>

            {/* Mode Switcher Tabs */}
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => {
                  setIsSignup(false);
                  setError(null);
                }}
                style={[styles.tabButton, !isSignup && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, !isSignup && styles.activeTabText]}>Sign In</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setIsSignup(true);
                  setError(null);
                }}
                style={[styles.tabButton, isSignup && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, isSignup && styles.activeTabText]}>Sign Up</Text>
              </Pressable>
            </View>

            {/* Form Card */}
            <AppCard variant="glass" style={styles.formCard}>
              <View style={styles.fieldGroup}>
                {isSignup && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>FULL NAME</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        focusedField === "name" && styles.inputContainerFocused,
                      ]}
                    >
                      <MaterialIcons
                        name="person"
                        size={20}
                        color={focusedField === "name" ? colors.primary : colors.onSurfaceVariant}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Alex Morgan"
                        placeholderTextColor="rgba(229, 226, 225, 0.35)"
                        value={name}
                        onChangeText={setName}
                        onFocus={() => setFocusedField("name")}
                        onBlur={() => setFocusedField(null)}
                        style={styles.input}
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === "email" && styles.inputContainerFocused,
                    ]}
                  >
                    <MaterialIcons
                      name="email"
                      size={20}
                      color={focusedField === "email" ? colors.primary : colors.onSurfaceVariant}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="alex@example.com"
                      placeholderTextColor="rgba(229, 226, 225, 0.35)"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField("email")}
                      onBlur={() => setFocusedField(null)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={styles.input}
                      selectionColor={colors.primary}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>PASSWORD</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === "password" && styles.inputContainerFocused,
                    ]}
                  >
                    <MaterialIcons
                      name="vpn-key"
                      size={20}
                      color={focusedField === "password" ? colors.primary : colors.onSurfaceVariant}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="••••••••••••"
                      placeholderTextColor="rgba(229, 226, 225, 0.35)"
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField("password")}
                      onBlur={() => setFocusedField(null)}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      selectionColor={colors.primary}
                    />
                    <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn}>
                      <MaterialIcons
                        name={showPassword ? "visibility-off" : "visibility"}
                        size={20}
                        color={colors.onSurfaceVariant}
                      />
                    </Pressable>
                  </View>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBanner}>
                  <MaterialIcons name="error-outline" size={18} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <AppButton
                title={isSignup ? "Create Account" : "Sign In to App"}
                onPress={handleSubmit}
                loading={loading}
                variant="primary"
                style={styles.submitButton}
              />

              {!isSignup && (
                <Pressable style={styles.forgotPassword} onPress={onForgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                </Pressable>
              )}
            </AppCard>

            <Text style={styles.footerNote}>
              Disciplined Serenity • GPS & Photo Proof Engine
            </Text>
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
  },
  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    maxWidth: 420,
    width: "100%",
    alignSelf: "center",
  },
  orbWrap: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  orbGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.4)",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.5,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
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
    gap: spacing.xs,
    width: "100%",
  },
  heroTitle: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  heroSubtitle: {
    ...typography.bodyMd,
    textAlign: "center",
    color: colors.onSurfaceVariant,
    fontSize: 14,
    maxWidth: 320,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    width: "100%",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radius.full,
  },
  activeTabButton: {
    backgroundColor: "rgba(63, 81, 181, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.3)",
  },
  tabText: {
    ...typography.bodyMd,
    fontSize: 14,
    fontWeight: "600",
    color: colors.onSurfaceVariant,
  },
  activeTabText: {
    color: colors.onSurface,
    fontWeight: "700",
  },
  formCard: {
    width: "100%",
    gap: spacing.md,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.default,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: "rgba(63, 81, 181, 0.12)",
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    padding: 0,
    fontSize: 15,
  },
  eyeBtn: {
    padding: 4,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    flex: 1,
  },
  submitButton: {
    width: "100%",
    marginTop: spacing.xs,
  },
  forgotPassword: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  forgotPasswordText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  footerNote: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.outline,
    textAlign: "center",
    marginTop: spacing.xs,
  },
});

