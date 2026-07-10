import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { AlarmSettingsScreen } from "./src/screens/AlarmSettingsScreen";
import { colors } from "./src/theme/colors";
import { setupNotificationChannels, wasOpenedFromAlarm, onAlarmPressedInForeground } from "./src/lib/alarm";
import { BuddyScreen } from "./src/screens/BuddyScreen";
function TabBarButton({
  icon,
  label,
  active,
  onPress,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  const tint = color ?? (active ? colors.primary : colors.textMuted);
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 }}>
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={{ color: tint, fontSize: 12, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

function Tabs() {
  const [tab, setTab] = useState<"home" | "checkin" | "alarm" | "buddy">("home");
  const { setToken } = useAuth();

  useEffect(() => {
    setupNotificationChannels();

    wasOpenedFromAlarm().then((fromAlarm) => {
      if (fromAlarm) setTab("checkin");
    });

    const unsubscribe = onAlarmPressedInForeground(() => setTab("checkin"));
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {tab === "home" ? (
          <HomeScreen />
        ) : tab === "checkin" ? (
          <CheckInScreen habitType="wake_up" />
        ) : tab === "alarm" ? (
          <AlarmSettingsScreen />
        ) : (
          <BuddyScreen />
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TabBarButton icon="flame" label="Streaks" active={tab === "home"} onPress={() => setTab("home")} />
        <TabBarButton
          icon="checkmark-circle"
          label="Check in"
          active={tab === "checkin"}
          onPress={() => setTab("checkin")}
        />
        <TabBarButton icon="alarm" label="Alarm" active={tab === "alarm"} onPress={() => setTab("alarm")} />
        <TabBarButton icon="people" label="Buddy" active={tab === "buddy"} onPress={() => setTab("buddy")} />
        <TabBarButton
          icon="log-out-outline"
          label="Log out"
          active={false}
          color={colors.danger}
          onPress={() => setToken(null)}
        />
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