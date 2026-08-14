import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, type Habit } from "../lib/api";
import { ACHIEVEMENTS, type AchievementDef } from "../lib/achievements";
import { colors, radius, spacing, typography } from "../theme/colors";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";

export function AchievementsScreen({ onBack }: { onBack?: () => void }) {
  const { token } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!token) return;
    setLoading(true);
    getHabitsWithStreaks(token)
      .then((res) => {
        if (mounted) setHabits(res.habits);
      })
      .catch((err) => console.error("Failed to load habits for achievements:", err))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [token]);

  const maxBestStreak = useMemo(() => {
    if (!habits || habits.length === 0) return 0;
    return habits.reduce((max, h) => Math.max(max, h.bestStreak ?? 0), 0);
  }, [habits]);

  const items = useMemo(() => {
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      unlocked: maxBestStreak >= a.requiredStreak,
    }));
  }, [maxBestStreak]);

  const unlockedCount = items.filter((i) => i.unlocked).length;
  const nextGoal = items.find((i) => !i.unlocked);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.kicker}>HALL OF MASTERY</Text>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Achievements</Text>
            <LinearGradient colors={["#745600", "#3f2e00"]} style={styles.badgeCount}>
              <MaterialIcons name="emoji-events" size={14} color="#fabd00" />
              <Text style={styles.badgeCountText}>
                {unlockedCount}/{items.length}
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Milestone Progress Hero Card */}
        {nextGoal ? (
          <AppCard variant="hero" style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View>
                <Text style={styles.heroKicker}>NEXT MILESTONE</Text>
                <Text style={styles.heroTitle}>{nextGoal.label}</Text>
              </View>
              <Text style={styles.heroStreakText}>
                {maxBestStreak}/{nextGoal.requiredStreak} days
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <LinearGradient
                colors={["#fabd00", "#745600"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (maxBestStreak / nextGoal.requiredStreak) * 100)}%` },
                ]}
              />
            </View>
          </AppCard>
        ) : (
          <AppCard variant="hero" style={styles.heroCard}>
            <View style={{ alignItems: "center", gap: spacing.xs }}>
              <MaterialIcons name="emoji-events" size={32} color="#fabd00" />
              <Text style={styles.heroTitle}>Grandmaster Titan Unlocked 🎉</Text>
              <Text style={styles.heroStreakText}>You have achieved every single streak milestone!</Text>
            </View>
          </AppCard>
        )}

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          renderItem={({ item }) => <Badge item={item} unlocked={item.unlocked} />}
        />
      </View>
    </SafeAreaView>
  );
}

function Badge({ item, unlocked }: { item: AchievementDef; unlocked: boolean }) {
  return (
    <AppCard
      variant="glass"
      style={[styles.badgeCard, unlocked ? styles.unlockedCard : styles.lockedCard]}
    >
      <LinearGradient
        colors={unlocked ? ["#745600", "#3f2e00"] : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
        style={styles.iconCircle}
      >
        <MaterialIcons
          name={(item.icon as any) ?? "emoji-events"}
          size={28}
          color={unlocked ? "#fabd00" : colors.outline}
        />
      </LinearGradient>
      <Text style={[styles.badgeTitle, !unlocked && styles.lockedText]}>{item.label}</Text>
      <Text style={styles.badgeReq}>
        {item.requiredStreak} Day{item.requiredStreak > 1 ? "s" : ""} Streak
      </Text>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
    gap: 2,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
  },
  badgeCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(250, 189, 0, 0.3)",
  },
  badgeCountText: {
    ...typography.bodyMd,
    fontSize: 12,
    fontWeight: "700",
    color: "#fabd00",
  },
  heroCard: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  heroKicker: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
  },
  heroTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 16,
  },
  heroStreakText: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: "700",
    color: "#fabd00",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  badgeCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    gap: 4,
  },
  unlockedCard: {
    borderColor: "rgba(250, 189, 0, 0.35)",
  },
  lockedCard: {
    opacity: 0.45,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  badgeTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
    fontSize: 14,
  },
  lockedText: {
    color: colors.outline,
  },
  badgeReq: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});