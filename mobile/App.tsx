import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { CreateHabitScreen } from "./src/screens/CreateHabitScreen";
import { BuddyScreen } from "./src/screens/BuddyScreen";
import { colors } from "./src/theme/colors";
import { setupNotificationChannels, getHabitIdFromAlarmLaunch, onHabitAlarmPressedInForeground } from "./src/lib/alarm";
import { getHabitsWithStreaks, type Habit } from "./src/lib/api";
import { setupGeofencing } from "./src/lib/geofence";

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

type Screen = { name: "habits" } | { name: "buddy" } | { name: "createHabit" } | { name: "checkin"; habit: Habit };

function Tabs() {
  const { token, setToken } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "habits" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setupNotificationChannels();

    getHabitIdFromAlarmLaunch().then(async (habitId) => {
      if (!habitId || !token) return;
      const res = await getHabitsWithStreaks(token);
      const habit = res.habits.find((h) => h._id === habitId);
      if (habit) setScreen({ name: "checkin", habit });
    });

    const unsubscribe = onHabitAlarmPressedInForeground(async (habitId) => {
      if (!token) return;
      const res = await getHabitsWithStreaks(token);
      const habit = res.habits.find((h) => h._id === habitId);
      if (habit) setScreen({ name: "checkin", habit });
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token) return;
    getHabitsWithStreaks(token)
      .then((res) => {
        setupGeofencing(res.habits);
      })
      .catch((err) => {
        console.error("Failed to setup geofencing on boot:", err);
      });
  }, [token, refreshKey]);

  const activeTab = screen.name === "checkin" || screen.name === "createHabit" ? "habits" : screen.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {screen.name === "habits" ? (
          <HomeScreen
            key={refreshKey}
            onSelectHabit={(habit) => setScreen({ name: "checkin", habit })}
            onAddHabit={() => setScreen({ name: "createHabit" })}
          />
        ) : screen.name === "createHabit" ? (
          <CreateHabitScreen
            onCreated={() => {
              setRefreshKey((k) => k + 1);
              setScreen({ name: "habits" });
            }}
          />
        ) : screen.name === "checkin" ? (
          <CheckInScreen
            habit={screen.habit}
            onDone={() => {
              setRefreshKey((k) => k + 1);
              setScreen({ name: "habits" });
            }}
          />
        ) : (
          <BuddyScreen />
        )}
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        <TabBarButton icon="flame" label="Habits" active={activeTab === "habits"} onPress={() => setScreen({ name: "habits" })} />
        <TabBarButton icon="people" label="Buddy" active={activeTab === "buddy"} onPress={() => setScreen({ name: "buddy" })} />
        <TabBarButton icon="log-out-outline" label="Log out" active={false} color={colors.danger} onPress={() => setToken(null)} />
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