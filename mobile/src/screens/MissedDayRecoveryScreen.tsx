import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

export function MissedDayRecoveryScreen({
  habitName = "Morning Gym Session",
  previousStreak = 14,
  onResetStreak,
  onUseFreeze,
  onCancel,
}: {
  habitName?: string;
  previousStreak?: number;
  onResetStreak?: () => void;
  onUseFreeze?: () => void;
  onCancel?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerBack}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Streak Recovery & Repair</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.container}>
        {/* Flame Broken Hero Orb */}
        <View style={styles.orbWrap}>
          <View style={styles.orbGlow} />
          <LinearGradient colors={["#745600", "#3f2e00"]} style={styles.orb}>
            <MaterialIcons name="local-fire-department" size={44} color="#fabd00" />
          </LinearGradient>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.kicker}>STREAK INTERRUPTED</Text>
          <Text style={styles.title}>Missed Check-In Window</Text>
          <Text style={styles.subtitle}>
            Yesterday's check-in window for <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{habitName}</Text> expired without verified proof.
          </Text>
        </View>

        {/* Options Cards */}
        <View style={styles.optionsWrap}>
          {/* Option 1: Freeze Streak */}
          <AppCard variant="hero" style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.optionIcon}>
                <MaterialIcons name="ac-unit" size={20} color={colors.surfaceTint} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Apply Streak Freeze</Text>
                <Text style={styles.optionSub}>Protect your {previousStreak}-day streak (1 Freeze remaining)</Text>
              </View>
            </View>
            <AppButton title="Use Streak Freeze" onPress={onUseFreeze || (() => {})} variant="primary" style={{ width: "100%" }} />
          </AppCard>

          {/* Option 2: Fresh Start / Reset */}
          <AppCard variant="glass" style={styles.optionCard}>
            <View style={styles.optionHeader}>
              <LinearGradient colors={["#474747", "#303030"]} style={styles.optionIcon}>
                <MaterialIcons name="refresh" size={20} color={colors.onSurface} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionTitle}>Fresh Start (Reset to Day 1)</Text>
                <Text style={styles.optionSub}>Acknowledge missed day and rebuild your discipline from today.</Text>
              </View>
            </View>
            <AppButton title="Accept Reset & Start Day 1" onPress={onResetStreak || (() => {})} variant="tertiary" style={{ width: "100%" }} />
          </AppCard>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
  },
  headerBack: {
    padding: 6,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  orbWrap: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: "rgba(250, 189, 0, 0.25)",
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(250, 189, 0, 0.3)",
    elevation: 10,
  },
  titleArea: {
    alignItems: "center",
    gap: 4,
  },
  kicker: {
    ...typography.labelCaps,
    color: "#fabd00",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
  },
  optionsWrap: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  optionCard: {
    gap: spacing.sm,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 15,
  },
  optionSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
});
