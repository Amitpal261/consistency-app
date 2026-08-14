import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";

// Auth / Onboarding
import { SplashScreen } from "./src/screens/SplashScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";

// Core app screens
import { HomeScreen } from "./src/screens/HomeScreen";
import { CreateHabitScreen } from "./src/screens/CreateHabitScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { HabitDetailScreen } from "./src/screens/HabitDetailScreen";

// Buddy
import { BuddyScreen } from "./src/screens/BuddyScreen";
import { InviteBuddyScreen } from "./src/screens/InviteBuddyScreen";

// Achievements
import { AchievementsScreen } from "./src/screens/AchievementsScreen";

// Settings / Account
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AccountPrivacyScreen } from "./src/screens/AccountPrivacyScreen";

// New feature screens
import { FocusTimerScreen } from "./src/screens/FocusTimerScreen";
import { MissedDayRecoveryScreen } from "./src/screens/MissedDayRecoveryScreen";
import { SummaryDigestScreen } from "./src/screens/SummaryDigestScreen";
import { GeofenceArrivalScreen } from "./src/screens/GeofenceArrivalScreen";
import { ProductivityFlowScreen } from "./src/screens/ProductivityFlowScreen";

import { colors } from "./src/theme/colors";
import {
  setupNotificationChannels,
  getHabitIdFromAlarmLaunch,
  onHabitAlarmForegroundEvent,
} from "./src/lib/alarm";
import { getPendingAlarmHabitId } from "./src/lib/nativeAlarm";
import { getHabitsWithStreaks, type Habit } from "./src/lib/api";
import { setupGeofencing } from "./src/lib/geofence";

// ─── DEV MENU (only visible in __DEV__ mode) ──────────────────────────────────

type DevScreen = {
  label: string;
  emoji: string;
  action: () => void;
};

function DevMenu({ screens }: { screens: DevScreen[] }) {
  const [visible, setVisible] = useState(false);
  if (!__DEV__) return null;
  return (
    <>
      {/* Floating bug icon */}
      <Pressable
        onPress={() => setVisible(true)}
        style={devStyles.fab}
      >
        <Text style={{ fontSize: 20 }}>🧪</Text>
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={devStyles.overlay} onPress={() => setVisible(false)} />
        <View style={devStyles.sheet}>
          <Text style={devStyles.sheetTitle}>🧪 Dev Screen Navigator</Text>
          <Text style={devStyles.sheetSub}>Tap any screen to test it directly</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {screens.map((s) => (
              <Pressable
                key={s.label}
                style={devStyles.row}
                onPress={() => { s.action(); setVisible(false); }}
              >
                <Text style={devStyles.rowEmoji}>{s.emoji}</Text>
                <Text style={devStyles.rowLabel}>{s.label}</Text>
                <Text style={devStyles.rowArrow}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const devStyles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 16,
    zIndex: 999,
    backgroundColor: "#1c1b1b",
    borderWidth: 1,
    borderColor: "rgba(186,195,255,0.25)",
    borderRadius: 999,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    elevation: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    backgroundColor: "#1c1b1b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: "75%",
    borderTopWidth: 1,
    borderColor: "rgba(186,195,255,0.15)",
  },
  sheetTitle: {
    color: "#bac3ff",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  sheetSub: {
    color: "#888",
    fontSize: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  rowEmoji: { fontSize: 20, width: 30 },
  rowLabel: { flex: 1, color: "#e0e0e0", fontSize: 15, fontWeight: "600" },
  rowArrow: { color: "#555", fontSize: 20 },
});

// ─── Tab bar button ────────────────────────────────────────────────────────────

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
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 }}
    >
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={{ color: tint, fontSize: 12, fontWeight: active ? "700" : "500" }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Screen union type ─────────────────────────────────────────────────────────

type Screen =
  // Bottom-tab roots
  | { name: "habits" }
  | { name: "achievements" }
  | { name: "buddy" }
  | { name: "settings" }
  // Habits stack
  | { name: "createHabit" }
  | { name: "habitDetail"; habit: Habit }
  | { name: "checkin"; habit: Habit }
  | { name: "missedDayRecovery"; habit?: Habit }
  // Focus / location sub-screens
  | { name: "focusTimer"; habit?: Habit }
  | { name: "geofenceArrival"; habit?: Habit }
  // Buddy stack
  | { name: "inviteBuddy" }
  // Analytics
  | { name: "summaryDigest" }
  | { name: "productivityFlow" }
  // Settings stack
  | { name: "accountPrivacy" }
  // Auth
  | { name: "login" }
  | { name: "forgotPassword" };

// ─── Tabs (authenticated shell) ────────────────────────────────────────────────

function Tabs() {
  const { token } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: "habits" });
  const [refreshKey, setRefreshKey] = useState(0);

  // Handle alarm launch → open CheckIn immediately
  useEffect(() => {
    setupNotificationChannels();

    (async () => {
      if (!token) return;
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

  // Setup geofencing whenever habits change
  useEffect(() => {
    if (!token) return;
    getHabitsWithStreaks(token)
      .then((res) => setupGeofencing(res.habits))
      .catch((err) => console.error("Failed to setup geofencing:", err));
  }, [token, refreshKey]);

  // Determine which tab is "active" for tab-bar highlighting
  const activeTab: Screen["name"] =
    screen.name === "checkin" ||
    screen.name === "createHabit" ||
    screen.name === "habitDetail" ||
    screen.name === "missedDayRecovery" ||
    screen.name === "focusTimer" ||
    screen.name === "geofenceArrival" ||
    screen.name === "summaryDigest" ||
    screen.name === "productivityFlow"
      ? "habits"
      : screen.name === "accountPrivacy"
      ? "settings"
      : screen.name === "inviteBuddy"
      ? "buddy"
      : screen.name;

  function goHome() {
    setRefreshKey((k) => k + 1);
    setScreen({ name: "habits" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Screen content ── */}
      <View style={{ flex: 1 }}>
        {/* ── Habits stack ── */}
        {screen.name === "habits" ? (
          <HomeScreen
            key={refreshKey}
            onSelectHabit={(habit) => setScreen({ name: "habitDetail", habit })}
            onAddHabit={() => setScreen({ name: "createHabit" })}
            onOpenDigest={() => setScreen({ name: "summaryDigest" })}
            onOpenFlow={() => setScreen({ name: "productivityFlow" })}
            onOpenFocusTimer={(habit) => setScreen({ name: "focusTimer", habit })}
            onOpenGeofence={(habit) => setScreen({ name: "geofenceArrival", habit })}
          />
        ) : screen.name === "createHabit" ? (
          <CreateHabitScreen
            onCreated={goHome}
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
            onDone={goHome}
          />
        ) : screen.name === "missedDayRecovery" ? (
          <MissedDayRecoveryScreen
            habitName={screen.habit?.name}
            previousStreak={screen.habit?.currentStreak ?? 0}
            onResetStreak={goHome}
            onUseFreeze={goHome}
            onCancel={() => setScreen({ name: "habits" })}
          />
        ) : screen.name === "focusTimer" ? (
          <FocusTimerScreen
            habitName={screen.habit?.name}
            targetMinutes={screen.habit?.requiredDurationMinutes ?? 60}
            initialDwellMinutes={screen.habit?.currentDwellMinutes ?? 0}
            onDone={goHome}
          />
        ) : screen.name === "geofenceArrival" ? (
          <GeofenceArrivalScreen
            habitName={screen.habit?.name}
            onCheckIn={goHome}
            onCancel={() => setScreen({ name: "habits" })}
          />
        ) : screen.name === "summaryDigest" ? (
          <SummaryDigestScreen onBack={() => setScreen({ name: "habits" })} />
        ) : screen.name === "productivityFlow" ? (
          <ProductivityFlowScreen
            onSelectHabit={(habitId) => {
              // Navigate back to home; the HomeScreen will show the right habit
              setScreen({ name: "habits" });
            }}
            onBack={() => setScreen({ name: "habits" })}
          />

        /* ── Achievements ── */
        ) : screen.name === "achievements" ? (
          <AchievementsScreen />

        /* ── Buddy stack ── */
        ) : screen.name === "buddy" ? (
          <BuddyScreen
            onInviteBuddy={() => setScreen({ name: "inviteBuddy" })}
          />
        ) : screen.name === "inviteBuddy" ? (
          <InviteBuddyScreen onBack={() => setScreen({ name: "buddy" })} />

        /* ── Settings stack ── */
        ) : screen.name === "settings" ? (
          <SettingsScreen
            onOpenAccountPrivacy={() => setScreen({ name: "accountPrivacy" })}
          />
        ) : screen.name === "accountPrivacy" ? (
          <AccountPrivacyScreen onBack={() => setScreen({ name: "settings" })} />
        ) : null}
      </View>

      {/* ── Bottom Tab Bar ── */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <TabBarButton
          icon="flame"
          label="Habits"
          active={activeTab === "habits"}
          onPress={() => setScreen({ name: "habits" })}
        />
        <TabBarButton
          icon="trophy"
          label="Progress"
          active={activeTab === "achievements"}
          onPress={() => setScreen({ name: "achievements" })}
        />
        <TabBarButton
          icon="people"
          label="Buddy"
          active={activeTab === "buddy"}
          onPress={() => setScreen({ name: "buddy" })}
        />
        <TabBarButton
          icon="settings-outline"
          label="Settings"
          active={activeTab === "settings"}
          onPress={() => setScreen({ name: "settings" })}
        />
      </View>

      {/* ── DEV MENU: Floating test launcher ── */}
      <DevMenu
        screens={[
          {
            label: "CheckInScreen (Photo Verify)",
            emoji: "📸",
            action: () =>
              setScreen({
                name: "checkin",
                habit: {
                  _id: "dev-habit-1",
                  name: "Morning Gym Session",
                  taskType: "time",
                  verificationMethod: "photo",
                  currentStreak: 7,
                  bestStreak: 14,
                  lastCheckInDateKey: "",
                  timeWindow: { hour: 6, minute: 0 },
                  requiredDurationMinutes: 60,
                  currentDwellMinutes: 0,
                } as any,
              }),
          },
          {
            label: "FocusTimerScreen (Dwell Session)",
            emoji: "⏱️",
            action: () =>
              setScreen({
                name: "focusTimer",
                habit: {
                  _id: "dev-habit-2",
                  name: "Study at Library",
                  taskType: "location_duration",
                  requiredDurationMinutes: 120,
                  currentDwellMinutes: 45,
                } as any,
              }),
          },
          {
            label: "MissedDayRecoveryScreen",
            emoji: "🔥",
            action: () =>
              setScreen({
                name: "missedDayRecovery",
                habit: {
                  _id: "dev-habit-3",
                  name: "Evening Run",
                  currentStreak: 14,
                } as any,
              }),
          },
          {
            label: "GeofenceArrivalScreen",
            emoji: "📍",
            action: () =>
              setScreen({
                name: "geofenceArrival",
                habit: {
                  _id: "dev-habit-4",
                  name: "Gym Arrival",
                  taskType: "location",
                } as any,
              }),
          },
          {
            label: "SummaryDigestScreen",
            emoji: "📊",
            action: () => setScreen({ name: "summaryDigest" }),
          },
          {
            label: "ProductivityFlowScreen",
            emoji: "⚡",
            action: () => setScreen({ name: "productivityFlow" }),
          },
          {
            label: "InviteBuddyScreen",
            emoji: "🔗",
            action: () => setScreen({ name: "inviteBuddy" }),
          },
          {
            label: "CreateHabitScreen",
            emoji: "✨",
            action: () => setScreen({ name: "createHabit" }),
          },
          {
            label: "AchievementsScreen",
            emoji: "🏆",
            action: () => setScreen({ name: "achievements" }),
          },
        ]}
      />
    </SafeAreaView>
  );
}

// ─── Root (auth gate) ──────────────────────────────────────────────────────────

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

  // Loading / splash
  if (loading || hasSeenOnboarding === null) return <SplashScreen />;

  // Authenticated → go to main app
  if (token) return <Tabs />;

  // First-time launch → onboarding
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

  // Auth screens
  return screen.name === "forgotPassword" ? (
    <ForgotPasswordScreen onBackToLogin={() => setScreen({ name: "login" })} />
  ) : (
    <LoginScreen onForgotPassword={() => setScreen({ name: "forgotPassword" })} />
  );
}

// ─── App entry ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}