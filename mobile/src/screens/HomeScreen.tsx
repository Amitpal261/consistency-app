import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getStreaks } from "../lib/api";
import { AppCard } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

type StreakRow = { habitType: string; currentStreak: number; bestStreak: number };

const HABIT_LABELS: Record<string, string> = {
  wake_up: "Wake up",
  library: "Library",
  custom: "Custom habit",
};

function flameColor(streak: number) {
  if (streak >= 14) return colors.accent;
  if (streak >= 3) return colors.warning;
  return colors.textMuted;
}

export function HomeScreen() {
  const { token } = useAuth();
  const [streaks, setStreaks] = useState<StreakRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await getStreaks(token);
    setStreaks(res.streaks as StreakRow[]);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <Text style={[typography.h1, { marginBottom: spacing.lg }]}>Your streaks</Text>
      <FlatList
        data={streaks}
        keyExtractor={(item) => item.habitType}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <AppCard>
            <Text style={typography.body}>No check-ins yet — go complete one to start your streak 🔥</Text>
          </AppCard>
        }
        renderItem={({ item }) => (
          <AppCard style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={typography.label}>{(HABIT_LABELS[item.habitType] ?? item.habitType).toUpperCase()}</Text>
              <Text style={[typography.h2, { marginTop: 4 }]}>Best: {item.bestStreak} days</Text>
            </View>
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
              <Text style={{ color: flameColor(item.currentStreak), fontWeight: "800", fontSize: 20 }}>
                {item.currentStreak}
              </Text>
            </View>
          </AppCard>
        )}
      />
    </View>
  );
}