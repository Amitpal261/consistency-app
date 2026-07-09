import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { login, signup } from "../lib/api";
import { useAuth } from "../context/AuthContext";

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
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: "700", marginBottom: 16 }}>
        {isSignup ? "Create account" : "Welcome back"}
      </Text>

      {isSignup ? (
        <TextInput
          placeholder="Full name"
          value={name}
          onChangeText={setName}
          style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12 }}
        />
      ) : null}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 10, padding: 12 }}
      />

      {error ? <Text style={{ color: "#dc2626" }}>{error}</Text> : null}

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        style={{ backgroundColor: "#0f766e", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 }}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "600" }}>
          {isSignup ? "Sign up" : "Log in"}
        </Text>}
      </Pressable>

      <Pressable onPress={() => setIsSignup((v) => !v)} style={{ marginTop: 12, alignItems: "center" }}>
        <Text style={{ color: "#0f766e" }}>
          {isSignup ? "Already have an account? Log in" : "New here? Create an account"}
        </Text>
      </Pressable>
    </View>
  );
}
