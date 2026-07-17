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
import { login, signup } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

function colorWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function LoginScreen() {
  const { setToken } = useAuth();
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.8)).current;

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const animation = Animated.loop(
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

    animation.start();
    opacityAnimation.start();

    return () => {
      animation.stop();
      opacityAnimation.stop();
    };
  }, [orbOpacity, orbScale]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = isSignup
        ? await signup(name, email, password)
        : await login(email, password);
      setToken(res.token);
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
                <MaterialIcons name="lock" size={36} color={colors.onPrimaryContainer} />
              </Animated.View>
            </View>

            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>
                {isSignup ? "Create account" : "Welcome back"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isSignup
                  ? "Start building better habits today."
                  : "Resume your journey of focus."}
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.fieldGroup}>
                {isSignup && (
                  <View style={styles.field}>
                    <Text style={styles.fieldLabel}>Full Name</Text>
                    <View style={styles.inputRow}>
                      <MaterialIcons
                        name="person-outline"
                        size={20}
                        color={colors.onSurfaceVariant}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Jane Doe"
                        placeholderTextColor={colorWithAlpha(colors.outlineVariant, 0.5)}
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        selectionColor={colors.primary}
                      />
                    </View>
                  </View>
                )}

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
                      keyboardType="email-address"
                      style={styles.input}
                      selectionColor={colors.primary}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputRow}>
                    <MaterialIcons
                      name="vpn-key"
                      size={20}
                      color={colors.onSurfaceVariant}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="••••••••"
                      placeholderTextColor={colorWithAlpha(colors.outlineVariant, 0.5)}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      style={styles.input}
                      selectionColor={colors.primary}
                    />
                    <MaterialIcons
                      name="visibility"
                      size={20}
                      color={colors.onSurfaceVariant}
                    />
                  </View>
                </View>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.loginButtonPressed,
                  loading && styles.loginButtonDisabled,
                ]}
              >
                {loading ? (
                  <ActivityIndicator color={colors.onPrimaryContainer} />
                ) : (
                  <Text style={styles.loginButtonText}>
                    {isSignup ? "Create Account" : "Login"}
                  </Text>
                )}
              </Pressable>

              {!isSignup && (
                <Pressable style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.signupRow}>
              <Text style={styles.signupPrompt}>
                {isSignup ? "Already have an account? " : "New to Consistency? "}
              </Text>
              <Pressable onPress={() => setIsSignup((v) => !v)}>
                <Text style={styles.signupLink}>
                  {isSignup ? "Log in" : "Create Account"}
                </Text>
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

  streakBadge: {
    ...typography.labelCaps,
    color: colors.primary,
    letterSpacing: 1.2,
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
  fieldGroup: {
    gap: spacing.md,
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
  loginButton: {
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
  loginButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loginButtonText: {
    ...typography.headlineLgMobile,
    fontSize: 18,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
  forgotPassword: {
    alignItems: "center",
  },
  forgotPasswordText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    letterSpacing: 2,
  },
  signupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  signupPrompt: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  signupLink: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: "600",
  },
});
