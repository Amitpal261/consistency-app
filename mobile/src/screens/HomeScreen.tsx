import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getStreaks } from "../lib/api";

type StreakRow = { habitType: string; currentStreak: number; bestStreak: number };

const HABIT_LABELS: Record<string, string> = {
  wake_up: "Wake up",
  library: "Library",
  custom: "Custom habit",
};

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
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 26, fontWeight: "700", marginBottom: 16 }}>Your streaks</Text>
      <FlatList
        data={streaks}
        keyExtractor={(item) => item.habitType}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={<Text style={{ color: "#666" }}>No check-ins yet — go complete one!</Text>}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
              borderRadius: 12,
              backgroundColor: "#f0fdfa",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: "600" }}>{HABIT_LABELS[item.habitType] ?? item.habitType}</Text>
            <Text>
              🔥 {item.currentStreak} · best {item.bestStreak}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
