import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, type Habit } from "../lib/api";
import { ACHIEVEMENTS, type AchievementDef } from "../lib/achievements";
import { colors, spacing, typography, radius } from "../theme/colors";
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DotGridBackground />
      <View style={{ flex: 1, paddingHorizontal: spacing.marginEdge, paddingTop: spacing.sm }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }}>
          {onBack ? (
            <View style={{ marginRight: spacing.sm }}>
              <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} onPress={onBack} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={typography.h1}>Achievements</Text>
            <Text style={[typography.bodyMd, { marginTop: 2 }]}>
              {unlockedCount} of {items.length} unlocked
            </Text>
          </View>
        </View>

        {nextGoal ? (
          <AppCard style={{ marginBottom: spacing.md, gap: spacing.xs }}>
            <Text style={typography.labelCaps}>Next milestone</Text>
            <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 16 }}>
              {nextGoal.label} · {maxBestStreak}/{nextGoal.requiredStreak} days
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (maxBestStreak / nextGoal.requiredStreak) * 100)}%` },
                ]}
              />
            </View>
          </AppCard>
        ) : items.length > 0 ? (
          <AppCard style={{ marginBottom: spacing.md, alignItems: "center" }}>
            <MaterialIcons name="emoji-events" size={28} color={colors.tertiary} />
            <Text style={{ color: colors.onSurface, fontWeight: "700", marginTop: spacing.xs }}>
              All achievements unlocked 🎉
            </Text>
          </AppCard>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          renderItem={({ item }) => <Badge item={item} unlocked={item.unlocked} />}
          ListEmptyComponent={
            !loading ? (
              <View style={{ marginTop: spacing.lg }}>
                <Text style={typography.bodyMd}>No achievements yet.</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

function Badge({ item, unlocked }: { item: AchievementDef; unlocked: boolean }) {
  return (
    <AppCard style={[styles.card, unlocked && styles.unlockedCard, !unlocked && styles.lockedCard]}>
      <View style={[styles.iconWrap, unlocked && styles.unlockedIconWrap]}>
        <MaterialIcons
          name={(item.icon as any) ?? "star"}
          size={28}
          color={unlocked ? colors.tertiary : colors.onSurfaceVariant}
        />
      </View>
      <Text
        style={[
          typography.labelCaps,
          { marginTop: spacing.sm, textAlign: "center", color: unlocked ? colors.onSurface : colors.onSurfaceVariant },
        ]}
      >
        {item.label}
      </Text>
      <Text style={[typography.bodyMd, { marginTop: spacing.xs, fontSize: 12, textAlign: "center" }]}>
        {item.requiredStreak} day{item.requiredStreak > 1 ? "s" : ""}
      </Text>
    </AppCard>
  );
}

const styles = {
  row: { justifyContent: "space-between" as const, marginBottom: spacing.md, gap: spacing.sm },
  card: {
    flex: 1,
    padding: spacing.md,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    minHeight: 130,
  },
  unlockedCard: {
    borderColor: "rgba(250,189,0,0.35)",
    shadowColor: colors.tertiary,
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  lockedCard: { opacity: 0.45 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  unlockedIconWrap: { backgroundColor: "rgba(250,189,0,0.14)" },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
};