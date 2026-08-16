import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getStoredItem, setStoredItem } from "./src/lib/storage";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AuthProvider, useAuth } from "./src/context/AuthContext";

import { SplashScreen } from "./src/screens/SplashScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";

import { HomeScreen } from "./src/screens/HomeScreen";
import { CreateHabitScreen } from "./src/screens/CreateHabitScreen";
import { CheckInScreen } from "./src/screens/CheckInScreen";
import { HabitDetailScreen } from "./src/screens/HabitDetailScreen";
import { BuddyScreen } from "./src/screens/BuddyScreen";
import { InviteBuddyScreen } from "./src/screens/InviteBuddyScreen";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { AccountPrivacyScreen } from "./src/screens/AccountPrivacyScreen";
import { FocusTimerScreen } from "./src/screens/FocusTimerScreen";
import { MissedDayRecoveryScreen } from "./src/screens/MissedDayRecoveryScreen";
import { SummaryDigestScreen } from "./src/screens/SummaryDigestScreen";
import { GeofenceArrivalScreen } from "./src/screens/GeofenceArrivalScreen";
import { LocationArrivalScreen } from "./src/screens/LocationArrivalScreen";
import { TimeAlarmCheckInScreen } from "./src/screens/TimeAlarmCheckInScreen";
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

const ONBOARDING_STORAGE_KEY = "hasSeenOnboarding";

type AuthStackParamList = {
  onboarding: undefined;
  login: undefined;
  forgotPassword: undefined;
};

type HabitsStackParamList = {
  home: undefined;
  createHabit: undefined;
  habitDetail: { habit: Habit };
  timeCheckin: { habit: Habit };
  // legacy checkin route kept for compatibility but habitDetail now routes by taskType
  checkin: { habit: Habit };
  missedDayRecovery: { habit?: Habit };
  focusTimer: { habit?: Habit };
  locationArrival: { habit: Habit };
  summaryDigest: undefined;
  productivityFlow: undefined;
};

type BuddyStackParamList = {
  buddy: undefined;
  inviteBuddy: undefined;
};

type SettingsStackParamList = {
  settings: undefined;
  accountPrivacy: undefined;
};

type AppTabParamList = {
  habits: undefined;
  achievements: undefined;
  buddy: undefined;
  settings: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HabitsStack = createNativeStackNavigator<HabitsStackParamList>();
const BuddyStack = createNativeStackNavigator<BuddyStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

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
      <Pressable onPress={() => setVisible(true)} style={devStyles.fab}>
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
                onPress={() => {
                  s.action();
                  setVisible(false);
                }}
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

function TabBarButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const tint = active ? colors.primary : colors.textMuted;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: "center", paddingVertical: 12, gap: 2 }}>
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={{ color: tint, fontSize: 12, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

function HomeRoute() {
  const navigation = useNavigation<NativeStackNavigationProp<HabitsStackParamList>>();

  return (
    <View style={{ flex: 1 }}>
      <HomeScreen
        onSelectHabit={(habit) => navigation.navigate("habitDetail", { habit })}
        onAddHabit={() => navigation.navigate("createHabit")}
        onOpenDigest={() => navigation.navigate("summaryDigest")}
        onOpenFlow={() => navigation.navigate("productivityFlow")}
        onOpenFocusTimer={(habit) => navigation.navigate("focusTimer", { habit })}
        onOpenGeofence={(habit) => habit && navigation.navigate("locationArrival", { habit })}
      />

      <DevMenu
        screens={[
          {
            label: "TimeAlarmCheckInScreen",
            emoji: "📸",
            action: () =>
              navigation.navigate("timeCheckin", {
                habit: {
                  _id: "dev-habit-1",
                  name: "Morning Gym Session",
                  taskType: "time",
                  verificationMethod: "photo",
                  currentStreak: 7,
                  bestStreak: 14,
                  lastCheckInDateKey: "",
                  timeWindow: { hour: 6, minute: 0, windowMinutes: 45 },
                  requiredDurationMinutes: 60,
                  daysOfWeek: [1, 2, 3, 4, 5],
                } as Habit,
              }),
          },
          {
            label: "FocusTimerScreen",
            emoji: "⏱️",
            action: () =>
              navigation.navigate("focusTimer", {
                habit: {
                  _id: "dev-habit-2",
                  name: "Study at Library",
                  taskType: "location_duration",
                  requiredDurationMinutes: 120,
                  currentStreak: 4,
                  bestStreak: 9,
                  daysOfWeek: [1, 2, 3, 4, 5],
                } as Habit,
              }),
          },
          {
            label: "MissedDayRecoveryScreen",
            emoji: "🔥",
            action: () =>
              navigation.navigate("missedDayRecovery", {
                habit: {
                  _id: "dev-habit-3",
                  name: "Evening Run",
                  currentStreak: 14,
                  bestStreak: 21,
                  taskType: "time",
                  verificationMethod: "gps",
                  daysOfWeek: [1, 2, 3, 4, 5, 6, 0],
                } as Habit,
              }),
          },
          {
            label: "LocationArrivalScreen",
            emoji: "📍",
            action: () =>
              navigation.navigate("locationArrival", {
                habit: {
                  _id: "dev-habit-4",
                  name: "Gym Arrival",
                  taskType: "location",
                  verificationMethod: "gps",
                  currentStreak: 5,
                  bestStreak: 12,
                  daysOfWeek: [1, 3, 5],
                  timeWindow: {
                    hour: new Date().getHours(),
                    minute: new Date().getMinutes() + 30,
                    windowMinutes: 60,
                  },
                  location: { lat: 40.758, lng: -73.9855, radiusMeters: 150 },
                } as Habit,
              }),
          },
          {
            label: "SummaryDigestScreen",
            emoji: "📊",
            action: () => navigation.navigate("summaryDigest"),
          },
          {
            label: "ProductivityFlowScreen",
            emoji: "⚡",
            action: () => navigation.navigate("productivityFlow"),
          },
          {
            label: "CreateHabitScreen",
            emoji: "✨",
            action: () => navigation.navigate("createHabit"),
          },
        ]}
      />
    </View>
  );
}

function HabitsNavigator() {
  return (
    <HabitsStack.Navigator screenOptions={{ headerShown: false }}>
      <HabitsStack.Screen name="home" component={HomeRoute} />
      <HabitsStack.Screen name="createHabit">
        {({ navigation }) => <CreateHabitScreen onCreated={() => navigation.navigate("home")} />}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="habitDetail">
        {({ route, navigation }) => (
          <HabitDetailScreen
            habit={route.params.habit}
            onBack={() => navigation.goBack()}
            onCheckIn={() => {
              // route to screen by taskType
              const t = route.params.habit.taskType;
              if (t === "time") navigation.navigate("timeCheckin", { habit: route.params.habit });
              else if (t === "location") navigation.navigate("locationArrival", { habit: route.params.habit });
              else navigation.navigate("focusTimer", { habit: route.params.habit });
            }}
          />
        )}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="timeCheckin">
        {({ route, navigation }) => (
          <TimeAlarmCheckInScreen habit={route.params.habit} onDone={() => navigation.navigate("home")} />
        )}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="locationArrival">
        {({ route, navigation }) => (
          <LocationArrivalScreen habit={route.params.habit} onCheckIn={() => navigation.navigate("home")} onCancel={() => navigation.navigate("home")} />
        )}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="checkin">
        {({ route, navigation }) => (
          <CheckInScreen habit={route.params.habit} onDone={() => navigation.navigate("home")} />
        )}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="missedDayRecovery">
        {({ route, navigation }) => (
          <MissedDayRecoveryScreen
            habitName={route.params.habit?.name}
            previousStreak={route.params.habit?.currentStreak ?? 0}
            onResetStreak={() => navigation.navigate("home")}
            onUseFreeze={() => navigation.navigate("home")}
            onCancel={() => navigation.navigate("home")}
          />
        )}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="focusTimer">
        {({ route, navigation }) => (
          <FocusTimerScreen
            habitName={route.params.habit?.name}
            targetMinutes={route.params.habit?.requiredDurationMinutes ?? 60}
            initialDwellMinutes={route.params.habit?.currentDwellMinutes ?? 0}
            onDone={() => navigation.navigate("home")}
          />
        )}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="summaryDigest">
        {({ navigation }) => <SummaryDigestScreen onBack={() => navigation.goBack()} />}
      </HabitsStack.Screen>
      <HabitsStack.Screen name="productivityFlow">
        {({ navigation }) => (
          <ProductivityFlowScreen
            onSelectHabit={() => navigation.navigate("home")}
            onBack={() => navigation.goBack()}
          />
        )}
      </HabitsStack.Screen>
    </HabitsStack.Navigator>
  );
}

function BuddyNavigator() {
  return (
    <BuddyStack.Navigator screenOptions={{ headerShown: false }}>
      <BuddyStack.Screen name="buddy">
        {({ navigation }) => <BuddyScreen onInviteBuddy={() => navigation.navigate("inviteBuddy")} />}
      </BuddyStack.Screen>
      <BuddyStack.Screen name="inviteBuddy">
        {({ navigation }) => <InviteBuddyScreen onBack={() => navigation.goBack()} />}
      </BuddyStack.Screen>
    </BuddyStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="settings">
        {({ navigation }) => <SettingsScreen onOpenAccountPrivacy={() => navigation.navigate("accountPrivacy")} />}
      </SettingsStack.Screen>
      <SettingsStack.Screen name="accountPrivacy">
        {({ navigation }) => <AccountPrivacyScreen onBack={() => navigation.goBack()} />}
      </SettingsStack.Screen>
    </SettingsStack.Navigator>
  );
}

function AppTabsNavigator() {
  return (
    <AppTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            habits: "flame",
            achievements: "trophy",
            buddy: "people",
            settings: "settings-outline",
          };
          return <Ionicons name={iconMap[route.name]} size={size} color={color} />;
        },
      })}
    >
      <AppTabs.Screen name="habits" component={HabitsNavigator} options={{ title: "Habits" }} />
      <AppTabs.Screen name="achievements" component={AchievementsScreen} options={{ title: "Progress" }} />
      <AppTabs.Screen name="buddy" component={BuddyNavigator} options={{ title: "Buddy" }} />
      <AppTabs.Screen name="settings" component={SettingsNavigator} options={{ title: "Settings" }} />
    </AppTabs.Navigator>
  );
}

function AuthNavigator() {
  const [didLoadOnboarding, setDidLoadOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    getStoredItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setDidLoadOnboarding(value === "true"))
      .catch(() => setDidLoadOnboarding(false));
  }, []);

  if (didLoadOnboarding === null) {
    return <SplashScreen />;
  }

  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }} initialRouteName={didLoadOnboarding ? "login" : "onboarding"}>
      <AuthStack.Screen name="onboarding">
        {({ navigation }) => (
          <OnboardingScreen
            onContinue={async () => {
              await setStoredItem(ONBOARDING_STORAGE_KEY, "true");
              setDidLoadOnboarding(true);
              navigation.navigate("login");
            }}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen name="login">
        {({ navigation }) => <LoginScreen onForgotPassword={() => navigation.navigate("forgotPassword")} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="forgotPassword">
        {({ navigation }) => <ForgotPasswordScreen onBackToLogin={() => navigation.navigate("login")} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

function RootNavigator() {
  const { token, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  if (token) {
    return <AppTabsNavigator />;
  }

  return <AuthNavigator />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
