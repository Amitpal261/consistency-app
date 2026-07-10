import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { login, signup } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AppButton } from "../components/AppButton";
import { AppTextInput } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

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
      const res = isSignup ? await signup(name, email, password) : await login(email, password);
      setToken(res.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.lg, gap: spacing.md }}>
      <Text style={{ fontSize: 40, marginBottom: spacing.xs }}>🔥</Text>
      <Text style={typography.h1}>{isSignup ? "Start your streak" : "Welcome back"}</Text>
      <Text style={[typography.body, { marginBottom: spacing.md }]}>
        {isSignup ? "Consistency starts with day one." : "Your streak is waiting for you."}
      </Text>

      {isSignup ? <AppTextInput placeholder="Full name" value={name} onChangeText={setName} /> : null}
      <AppTextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <AppTextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <AppButton title={isSignup ? "Sign up" : "Log in"} onPress={handleSubmit} loading={loading} style={{ marginTop: spacing.sm }} />

      <Pressable onPress={() => setIsSignup((v) => !v)} style={{ marginTop: spacing.md, alignItems: "center" }}>
        <Text style={{ color: colors.primary, fontWeight: "600" }}>
          {isSignup ? "Already have an account? Log in" : "New here? Create an account"}
        </Text>
      </Pressable>
    </View>
  );
}