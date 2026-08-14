import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

export function ProductivityFlowScreen({
  onSelectHabit,
  onBack,
}: {
  onSelectHabit?: (habitId: string) => void;
  onBack?: () => void;
}) {
  const primitives = [
    {
      id: "wake_up",
      title: "6:00 AM Wake Up Alarm",
      subtitle: "Bypasses silent mode • Silence via photo capture",
      type: "time",
      icon: "alarm",
      status: "DUE TODAY",
      statusColor: "#fabd00",
      gradient: ["#fabd00", "#745600"],
    },
    {
      id: "gym_arrival",
      title: "Gym Geofence Arrival",
      subtitle: "150m Radius • Auto-verify location",
      type: "location",
      icon: "location-on",
      status: "PROVED TODAY",
      statusColor: "#10B981",
      gradient: ["#10B981", "#047857"],
    },
    {
      id: "library_dwell",
      title: "Library Study Dwell",
      subtitle: "120 Mins Dwell Accumulator",
      type: "location_duration",
      icon: "timer",
      status: "IN PROGRESS (45/120m)",
      statusColor: "#bac3ff",
      gradient: ["#3f51b5", "#08218a"],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Productivity Primitive Flow</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleArea}>
          <Text style={styles.kicker}>DISCIPLINED SERENITY</Text>
          <Text style={styles.title}>Daily Commitment Engine</Text>
          <Text style={styles.subtitle}>
            Your daily pipeline of proof-gated accountability primitives.
          </Text>
        </View>

        {/* Primitive Stack */}
        <View style={styles.stack}>
          {primitives.map((item) => (
            <Pressable key={item.id} onPress={() => onSelectHabit?.(item.id)}>
              <AppCard variant="hero" style={styles.flowCard}>
                <View style={styles.cardHeaderRow}>
                  <LinearGradient colors={item.gradient as [string, string]} style={styles.iconCircle}>
                    <MaterialIcons name={item.icon as any} size={22} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.flowTitle}>{item.title}</Text>
                    <Text style={styles.flowSub}>{item.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.cardFooterRow}>
                  <View style={[styles.statusTag, { backgroundColor: `${item.statusColor}22` }]}>
                    <Text style={[styles.statusTagText, { color: item.statusColor }]}>{item.status}</Text>
                  </View>

                  <AppButton
                    title="Execute Check-In"
                    onPress={() => onSelectHabit?.(item.id)}
                    variant="glass"
                    style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                  />
                </View>
              </AppCard>
            </Pressable>
          ))}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleArea: {
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
  subtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  stack: {
    gap: spacing.md,
  },
  flowCard: {
    gap: spacing.md,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  flowTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 16,
  },
  flowSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusTagText: {
    ...typography.labelCaps,
    fontSize: 9,
    fontWeight: "700",
  },
});
