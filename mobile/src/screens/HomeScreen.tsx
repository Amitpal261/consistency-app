import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, type Habit } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

function flameColor(streak: number) {
  if (streak >= 14) return colors.accent;
  if (streak >= 3) return colors.warning;
  return colors.textMuted;
}

function taskTypeLabel(habit: Habit): string {
  if (habit.taskType === "time" && habit.timeWindow) {
    const h = String(habit.timeWindow.hour).padStart(2, "0");
    const m = String(habit.timeWindow.minute).padStart(2, "0");
    return `Daily at ${h}:${m}`;
  }
  if (habit.taskType === "location_duration") return `${habit.requiredDurationMinutes ?? 0} min at location`;
  return "Location check-in";
}

export function HomeScreen({ onSelectHabit, onAddHabit }: { onSelectHabit: (habit: Habit) => void; onAddHabit: () => void }) {
  const { token } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await getHabitsWithStreaks(token);
    setHabits(res.habits);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={typography.h1}>Your habits</Text>
        <AppButton title="+ Add" onPress={onAddHabit} style={{ paddingHorizontal: spacing.md }} />
      </View>
      <FlatList
        data={habits}
        keyExtractor={(item) => item._id}
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
            <Text style={typography.body}>No habits yet — tap "+ Add" to create your first one.</Text>
          </AppCard>
        }
        renderItem={({ item }) => (
          <AppCard
            onTouchEnd={() => onSelectHabit(item)}
            style={{ marginBottom: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
          >
            <View style={{ flex: 1 }}>
              <Text style={typography.h2}>{item.name}</Text>
              <Text style={typography.label}>{taskTypeLabel(item).toUpperCase()}</Text>
              <Text style={[typography.body, { marginTop: 4 }]}>Best: {item.bestStreak} days</Text>
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