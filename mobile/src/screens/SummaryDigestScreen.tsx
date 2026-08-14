import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

export function SummaryDigestScreen({ onBack }: { onBack?: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Weekly Performance Digest</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleArea}>
          <Text style={styles.kicker}>CONSISTENCY REPORT</Text>
          <Text style={styles.title}>Weekly Digest</Text>
          <Text style={styles.subtitle}>7-day performance overview & streak analysis</Text>
        </View>

        {/* Hero Score Card */}
        <AppCard variant="hero" style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View>
              <Text style={styles.scoreLabel}>COMPLETION RATE</Text>
              <Text style={styles.scoreVal}>92%</Text>
            </View>
            <LinearGradient colors={["#10B981", "#047857"]} style={styles.scoreBadge}>
              <MaterialIcons name="trending-up" size={16} color="#FFFFFF" />
              <Text style={styles.scoreBadgeText}>+14% vs last week</Text>
            </LinearGradient>
          </View>

          {/* Bar Chart Bars */}
          <View style={styles.chartRow}>
            {[
              { day: "M", height: "85%", status: "done" },
              { day: "T", height: "100%", status: "done" },
              { day: "W", height: "70%", status: "done" },
              { day: "T", height: "100%", status: "done" },
              { day: "F", height: "90%", status: "done" },
              { day: "S", height: "40%", status: "partial" },
              { day: "S", height: "100%", status: "done" },
            ].map((bar, i) => (
              <View key={i} style={styles.chartCol}>
                <View style={styles.barTrack}>
                  <LinearGradient
                    colors={bar.status === "done" ? ["#3f51b5", "#08218a"] : ["#fabd00", "#745600"]}
                    style={[styles.barFill, { height: bar.height as `${number}%` }]}
                  />
                </View>
                <Text style={styles.barDayText}>{bar.day}</Text>
              </View>
            ))}
          </View>
        </AppCard>

        {/* Summary Grid Stats */}
        <View style={styles.statsGrid}>
          <AppCard variant="glass" style={styles.statCard}>
            <MaterialIcons name="local-fire-department" size={24} color="#fabd00" />
            <Text style={styles.statVal}>18 Days</Text>
            <Text style={styles.statLabel}>BEST ACTIVE STREAK</Text>
          </AppCard>

          <AppCard variant="glass" style={styles.statCard}>
            <MaterialIcons name="verified" size={24} color="#10B981" />
            <Text style={styles.statVal}>28 / 30</Text>
            <Text style={styles.statLabel}>PROOFS VERIFIED</Text>
          </AppCard>
        </View>

        {/* Breakdown Card */}
        <AppCard variant="glass" style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>VERIFICATION BREAKDOWN</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownKey}>Instant AI Pre-screen Pass</Text>
            <Text style={styles.breakdownVal}>24 Check-ins (85%)</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownKey}>Buddy Approved Reviews</Text>
            <Text style={styles.breakdownVal}>4 Check-ins (15%)</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownKey}>Flagged / Unreviewed</Text>
            <Text style={styles.breakdownVal}>0 Check-ins (0%)</Text>
          </View>
        </AppCard>
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
  scoreCard: {
    gap: spacing.md,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scoreLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
  },
  scoreVal: {
    ...typography.headlineLgMobile,
    fontSize: 32,
    fontWeight: "800",
    color: colors.onSurface,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  scoreBadgeText: {
    ...typography.bodyMd,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 120,
    paddingTop: 10,
  },
  chartCol: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: radius.full,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: radius.full,
  },
  barDayText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
  },
  statsGrid: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.md,
  },
  statVal: {
    ...typography.bodyMd,
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
  },
  statLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    textAlign: "center",
  },
  breakdownCard: {
    gap: spacing.sm,
  },
  breakdownTitle: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownKey: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  breakdownVal: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
});
