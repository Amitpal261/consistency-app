import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { SplashScreen } from "./src/screens/SplashScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { HabitDetailScreen } from "./src/screens/HabitDetailScreen";
import { CreateHabitScreen } from "./src/screens/CreateHabitScreen";
import { BuddyScreen } from "./src/screens/BuddyScreen";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AccountPrivacyScreen } from "./src/screens/AccountPrivacyScreen";
import { colors } from "./src/theme/colors";
import { setupNotificationChannels, getHabitIdFromAlarmLaunch, onHabitAlarmForegroundEvent } from "./src/lib/alarm";
import { getPendingAlarmHabitId } from "./src/lib/nativeAlarm";
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

type Screen =
  | { name: "habits" }
  | { name: "buddy" }
  | { name: "achievements" }
  | { name: "settings" }
  | { name: "accountPrivacy" }
  | { name: "createHabit" }
  | { name: "habitDetail"; habit: Habit }
  | { name: "checkin"; habit: Habit }
  | { name: "forgotPassword" }
  | { name: "login" };

function Tabs() {
  const { token, setToken } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "habits" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setupNotificationChannels();

    (async () => {
      if (!token) return;
      // Two possible sources for "which habit should I open right now?":
      // 1) the user tapped the notifee notification / opened via its
      //    fullScreenAction (getHabitIdFromAlarmLaunch)
      // 2) our own native AlarmActivity launched MainActivity directly
      //    (getPendingAlarmHabitId) — this can happen when the alarm's
      //    full-screen wake UI opens the app before any notifee tap.
      const notifeeHabitId = await getHabitIdFromAlarmLaunch();
      const nativeHabitId = await getPendingAlarmHabitId();
      const habitId = notifeeHabitId ?? nativeHabitId;
      if (!habitId) return;

      const res = await getHabitsWithStreaks(token);
      const habit = res.habits.find((h) => h._id === habitId);
      if (habit) setScreen({ name: "checkin", habit });
    })();

    const unsubscribe = onHabitAlarmForegroundEvent(async (habitId) => {
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

  const activeTab =
    screen.name === "checkin" || screen.name === "createHabit" || screen.name === "habitDetail"
      ? "habits"
      : screen.name === "accountPrivacy"
      ? "settings"
      : screen.name;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        {screen.name === "habits" ? (
          <HomeScreen
            key={refreshKey}
            onSelectHabit={(habit) => setScreen({ name: "habitDetail", habit })}
            onAddHabit={() => setScreen({ name: "createHabit" })}
          />
        ) : screen.name === "createHabit" ? (
          <CreateHabitScreen
            onCreated={() => {
              setRefreshKey((k) => k + 1);
              setScreen({ name: "habits" });
            }}
          />
        ) : screen.name === "habitDetail" ? (
          <HabitDetailScreen
            habit={screen.habit}
            onBack={() => setScreen({ name: "habits" })}
            onCheckIn={() => setScreen({ name: "checkin", habit: screen.habit })}
          />
        ) : screen.name === "checkin" ? (
          <CheckInScreen
            habit={screen.habit}
            onDone={() => {
              setRefreshKey((k) => k + 1);
              setScreen({ name: "habits" });
            }}
          />
        ) : screen.name === "achievements" ? (
          <AchievementsScreen />
        ) : screen.name === "settings" ? (
          <SettingsScreen onOpenAccountPrivacy={() => setScreen({ name: "accountPrivacy" })} />
        ) : screen.name === "accountPrivacy" ? (
          <AccountPrivacyScreen onBack={() => setScreen({ name: "settings" })} />
        ) : (
          <BuddyScreen />
        )}
      </View>
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
        <TabBarButton icon="flame" label="Habits" active={activeTab === "habits"} onPress={() => setScreen({ name: "habits" })} />
        <TabBarButton icon="trophy" label="Achievements" active={activeTab === "achievements"} onPress={() => setScreen({ name: "achievements" })} />
        <TabBarButton icon="people" label="Buddy" active={activeTab === "buddy"} onPress={() => setScreen({ name: "buddy" })} />
        <TabBarButton icon="settings-outline" label="Settings" active={activeTab === "settings"} onPress={() => setScreen({ name: "settings" })} />
      </View>
    </SafeAreaView>
  );
}

const ONBOARDING_STORAGE_KEY = "hasSeenOnboarding";

function Root() {
  const { token, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "login" });
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setHasSeenOnboarding(value === "true"))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  if (loading || hasSeenOnboarding === null) return <SplashScreen />;
  if (token) return <Tabs />;
  if (!hasSeenOnboarding) {
    return (
      <OnboardingScreen
        onContinue={async () => {
          await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
          setHasSeenOnboarding(true);
        }}
      />
    );
  }

  return screen.name === "forgotPassword" ? (
    <ForgotPasswordScreen onBackToLogin={() => setScreen({ name: "login" })} />
  ) : (
    <LoginScreen onForgotPassword={() => setScreen({ name: "forgotPassword" })} />
  );
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