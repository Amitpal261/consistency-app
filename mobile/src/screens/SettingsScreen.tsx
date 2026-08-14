import { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../context/AuthContext";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

const NOTIF_PREF_KEY = "settings.alarmNotificationsEnabled";

function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
  danger,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <AppCard
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}
      onTouchEnd={onPress}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: danger ? "rgba(239,68,68,0.12)" : "rgba(186,195,255,0.12)",
        }}
      >
        <MaterialIcons name={icon} size={20} color={danger ? colors.error : colors.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: spacing.sm }}>
        <Text style={{ color: danger ? colors.error : colors.onSurface, fontWeight: "600", fontSize: 15 }}>
          {label}
        </Text>
        {subtitle ? (
          <Text style={[typography.bodyMd, { fontSize: 12, marginTop: 1 }]}>{subtitle}</Text>
        ) : null}
      </View>
      {!danger ? <MaterialIcons name="chevron-right" size={22} color={colors.outline} /> : null}
    </AppCard>
  );
}

export function SettingsScreen({ onOpenAccountPrivacy }: { onOpenAccountPrivacy: () => void }) {
  const { setToken } = useAuth();
  const [alarmsEnabled, setAlarmsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREF_KEY).then((v) => setAlarmsEnabled(v !== "false"));
  }, []);

  async function toggleAlarms(value: boolean) {
    setAlarmsEnabled(value);
    await AsyncStorage.setItem(NOTIF_PREF_KEY, value ? "true" : "false");
    // Note: this only persists the preference locally for now. Actually
    // suppressing/re-enabling scheduled alarms based on this flag needs to
    // be wired into scheduleHabitAlarm/cancelHabitAlarm in lib/alarm.ts —
    // flagging this so it isn't mistaken for already being fully wired up.
  }

  function handleLogout() {
    Alert.alert("Log out?", "You'll need to log back in to see your habits.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => setToken(null) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DotGridBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.marginEdge, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={typography.h1}>Settings</Text>

        <AppCard style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(186,195,255,0.12)",
            }}
          >
            <MaterialIcons name="notifications-active" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={{ color: colors.onSurface, fontWeight: "600", fontSize: 15 }}>Habit alarms</Text>
            <Text style={[typography.bodyMd, { fontSize: 12, marginTop: 1 }]}>
              Loud alarm when a time-based habit is due
            </Text>
          </View>
          <Switch
            value={alarmsEnabled}
            onValueChange={toggleAlarms}
            trackColor={{ true: colors.primaryContainer, false: colors.surfaceContainerHigh }}
            thumbColor="#fff"
          />
        </AppCard>

        <MenuRow
          icon="lock-outline"
          label="Account & Privacy"
          subtitle="Manage your data and account"
          onPress={onOpenAccountPrivacy}
        />

        <MenuRow
          icon="help-outline"
          label="Help & About"
          subtitle="Support and app information"
          onPress={() => Linking.openURL("mailto:support@example.com")}
        />

        <MenuRow icon="logout" label="Log out" onPress={handleLogout} danger />
      </ScrollView>
    </SafeAreaView>
  );
}