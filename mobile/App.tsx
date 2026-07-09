import { useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Pressable, Text, View } from "react-native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";

function Tabs() {
  const [tab, setTab] = useState<"home" | "checkin">("home");
  const { setToken } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{tab === "home" ? <HomeScreen /> : <CheckInScreen habitType="wake_up" />}</View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: "#eee" }}>
        <Pressable onPress={() => setTab("home")} style={{ flex: 1, padding: 16, alignItems: "center" }}>
          <Text style={{ fontWeight: tab === "home" ? "700" : "400" }}>Streaks</Text>
        </Pressable>
        <Pressable onPress={() => setTab("checkin")} style={{ flex: 1, padding: 16, alignItems: "center" }}>
          <Text style={{ fontWeight: tab === "checkin" ? "700" : "400" }}>Check in</Text>
        </Pressable>
        <Pressable onPress={() => setToken(null)} style={{ flex: 1, padding: 16, alignItems: "center" }}>
          <Text style={{ color: "#dc2626" }}>Log out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Root() {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <Tabs /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
    <AuthProvider>
      <Root />
    </AuthProvider>
    </SafeAreaProvider>
  );
}
