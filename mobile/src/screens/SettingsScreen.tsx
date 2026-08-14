import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
    <Pressable onPress={onPress}>
      <AppCard variant="glass" style={styles.menuRow}>
        <LinearGradient
          colors={danger ? ["#93000a", "#690005"] : ["#3f51b5", "#08218a"]}
          style={styles.menuIconCircle}
        >
          <MaterialIcons name={icon} size={20} color={danger ? colors.error : colors.surfaceTint} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.menuLabel, danger && styles.dangerText]}>{label}</Text>
          {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
        </View>
        {!danger ? <MaterialIcons name="chevron-right" size={20} color={colors.outline} /> : null}
      </AppCard>
    </Pressable>
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
  }

  function handleLogout() {
    Alert.alert("Log out of Consistency?", "You will need to sign back in to access your habit streaks.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => setToken(null) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>SYSTEM PREFERENCES</Text>
          <Text style={styles.title}>Settings & Configuration</Text>
        </View>

        {/* Alarm Switch Card */}
        <AppCard variant="glass" style={styles.menuRow}>
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.menuIconCircle}>
            <MaterialIcons name="notifications-active" size={20} color={colors.surfaceTint} />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Habit STREAM_ALARM</Text>
            <Text style={styles.menuSub}>Loud DND-bypassing alarm audio triggers</Text>
          </View>
          <Switch
            value={alarmsEnabled}
            onValueChange={toggleAlarms}
            trackColor={{ true: colors.primaryContainer, false: "rgba(255,255,255,0.1)" }}
            thumbColor={alarmsEnabled ? colors.primary : colors.outline}
          />
        </AppCard>

        {/* Navigation Section */}
        <MenuRow
          icon="security"
          label="Account & Privacy"
          subtitle="Manage credentials, export data, and privacy"
          onPress={onOpenAccountPrivacy}
        />

        <MenuRow
          icon="help-outline"
          label="Help & Support"
          subtitle="Documentation, contact support, and app info"
          onPress={() => Linking.openURL("mailto:support@consistency-app.com")}
        />

        <MenuRow icon="logout" label="Log Out" subtitle="Sign out of current account" onPress={handleLogout} danger />

        {/* App Version Branding Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Consistency App • v1.0.0 (Native Alarm Build)</Text>
          <Text style={styles.footerSub}>Disciplined Serenity • GPS & Photo Verification Engine</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    gap: 2,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 14,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 15,
  },
  dangerText: {
    color: colors.error,
  },
  menuSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.lg,
    gap: 2,
  },
  footerText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.outline,
    fontWeight: "600",
  },
  footerSub: {
    ...typography.bodyMd,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    opacity: 0.6,
  },
});