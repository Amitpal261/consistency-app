import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, type Habit } from "../lib/api";
import { ACHIEVEMENTS, type AchievementDef } from "../lib/achievements";
import { colors, spacing, typography, radius } from "../theme/colors";
import { AppCard } from "../components/AppCard";

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

  return (
    <View style={styles.screen}>
      <Text style={typography.h1}>Achievements</Text>
      <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant, marginTop: spacing.sm, marginBottom: spacing.md }]}>Track milestones earned from your streaks</Text>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <AppCard style={[styles.card, !item.unlocked && styles.lockedCard]}>
            <View style={styles.badgeInner}>
              <View style={[styles.iconWrap, !item.unlocked && styles.lockedIconWrap]}>
                <MaterialIcons name={item.icon as any} size={28} color={item.unlocked ? colors.primary : colors.onSurfaceVariant} />
              </View>
              <Text style={[typography.labelCaps, { marginTop: spacing.sm, color: item.unlocked ? colors.onSurface : colors.onSurfaceVariant }]}>
                {item.label}
              </Text>
              <Text style={[typography.body, { marginTop: spacing.xs, color: item.unlocked ? colors.onSurface : colors.onSurfaceVariant }]}>Required: {item.requiredStreak} day{item.requiredStreak > 1 ? "s" : ""}</Text>
            </View>
          </AppCard>
        )}
        ListEmptyComponent={
          <View style={{ marginTop: spacing.lg }}>
            <Text style={typography.body}>No achievements yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
  row: { justifyContent: "space-between", marginBottom: spacing.md },
  card: { flex: 1, marginRight: spacing.sm, padding: spacing.md, alignItems: "center", justifyContent: "center", minHeight: 120 },
  lockedCard: { opacity: 0.36, backgroundColor: colors.surfaceContainerLow },
  badgeInner: { alignItems: "center" },
  iconWrap: { width: 56, height: 56, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(186,195,255,0.08)" },
  lockedIconWrap: { backgroundColor: "rgba(255,255,255,0.03)" },
});
