import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login, signup } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AppTextInput } from "../components/AppCard";
import { colors, spacing } from "../theme/colors";

const { height } = Dimensions.get("window");
const HERO_HEIGHT = height * 0.5;

export function LoginScreen() {
  const { setToken } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* HERO SECTION */}
          <View style={styles.heroWrap}>
            <Image
              source={require("../../assets/loginBackground5.jpeg")}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroOverlay} />

            <View style={styles.heroContent}>
              <Text style={styles.eyebrow}>Consistency App</Text>
              <Text style={styles.heroTitle}>
                {isSignup ? "Build Your Routine" : "Welcome Back"}
              </Text>
              <Text style={styles.heroSubtitle}>
                {isSignup
                  ? "Turn small daily actions into powerful habits."
                  : "Continue your streak and stay consistent."}
              </Text>
            </View>
          </View>

          {/* CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isSignup ? "Create Account" : "Sign In"}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isSignup
                  ? "Start building better habits today."
                  : "Login to continue your journey."}
              </Text>
            </View>

            {isSignup && (
              <AppTextInput
                placeholder="Full name"
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            )}

            <AppTextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />

            <AppTextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            {error && <Text style={styles.error}>{error}</Text>}
            <Pressable onPress={handleSubmit} disabled={loading} style={styles.gradientButton}>
              <LinearGradient
                colors={["#D4AF37", "#F6E27A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradientFill, loading && styles.gradientDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <Text style={styles.primaryText}>{isSignup ? "Create Account" : "Login"}</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => setIsSignup((v) => !v)}
              style={styles.switchRow}
            >
              <Text style={styles.switchText}>
                {isSignup
                  ? "Already have an account? Log in"
                  : "New here? Create an account"}
              </Text>
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
    backgroundColor: "#05070F",
    height: "100%",
  },

  scrollContent: {
    flexGrow: 1,
  },

  heroWrap: {
    height: HERO_HEIGHT,
    position: "relative",
  },

  heroImage: {
    width: "100%",
    height: "100%",
  },

  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.21)",
  },

  heroContent: {
    position: "absolute",
    bottom: 90,
    left: 24,
    right: 24,
  },

  eyebrow: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "600",
    marginBottom: 6,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
    lineHeight: 22,
  },

  /* 🔥 GLASS CARD */
  card: {
    flex: 1,
    marginTop: -60,
    marginBottom: 120,
    marginHorizontal: spacing.lg,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: "rgba(8, 10, 16, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },

  cardHeader: {
    marginBottom: spacing.md,
  },

  cardTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
  },

  cardSubtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 4,
  },

  input: {
    marginBottom: spacing.sm,
  },

  /* 🔥 BUTTON ROW */
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },

  /* 🟡 GOLD PRIMARY BUTTON */
  gradientButton: {
    marginTop: spacing.sm,
    borderRadius: 14,
    overflow: "hidden",
  },

  gradientFill: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#D4AF37",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  gradientDisabled: {
    opacity: 0.75,
  },

  primaryText: {
    color: "#1A1A1A",
    fontWeight: "900",
    letterSpacing: 1,
    fontSize: 15,
  },

  /* ⚫ GLASS SECONDARY BUTTON */
  secondaryBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",

    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },

  secondaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },

  /* ERROR */
  error: {
    color: "#FF4D4F",
    marginBottom: spacing.sm,
    fontSize: 13,
  },

  /* SWITCH */
  switchRow: {
    alignItems: "center",
    marginTop: spacing.md,
  },

  switchText: {
    color: "#D4AF37", // match gold theme
    fontWeight: "600",
    fontSize: 14,
  },
});