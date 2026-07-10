import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { getStreaks, submitCheckIn } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function CheckInScreen({ habitType = "wake_up" as const }: { habitType?: "wake_up" | "library" | "custom" }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [alreadyDoneToday, setAlreadyDoneToday] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    getStreaks(token).then((res) => {
      const row = res.streaks.find((s) => s.habitType === habitType);
      if (row && row.lastCheckInDateKey === todayKey()) {
        setAlreadyDoneToday(row.currentStreak);
      }
    });
  }, [token, habitType]);

  async function handleCheckIn() {
    if (!token) return;
    setLoading(true);
    setResult(null);
    setIsError(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location needed", "Please allow location access to check in.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const isMockLocation = (position.mocked as boolean | undefined) ?? false;

      const res = await submitCheckIn(token, {
        habitType,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? undefined,
          isMockLocation,
        },
      });

      setResult(`Checked in! Current streak: ${res.currentStreak} 🔥`);
      setAlreadyDoneToday(res.currentStreak);
    } catch (err) {
      setIsError(true);
      setResult(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  if (alreadyDoneToday !== null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.lg }}>
        <AppCard style={{ alignItems: "center", paddingVertical: spacing.xl }}>
          <Text style={{ fontSize: 56, marginBottom: spacing.sm }}>✅</Text>
          <Text style={[typography.h1, { marginBottom: spacing.xs, textAlign: "center" }]}>
            Already checked in today
          </Text>
          <Text style={[typography.body, { textAlign: "center" }]}>
            Nice work — streak is at {alreadyDoneToday} 🔥. Come back tomorrow.
          </Text>
        </AppCard>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.lg, gap: spacing.lg }}>
      <AppCard style={{ alignItems: "center", paddingVertical: spacing.xl }}>
        <Text style={{ fontSize: 56, marginBottom: spacing.sm }}>☀️</Text>
        <Text style={[typography.h1, { marginBottom: spacing.xs }]}>Ready to check in?</Text>
        <Text style={[typography.body, { textAlign: "center", marginBottom: spacing.lg }]}>
          We'll confirm your location to keep your streak honest.
        </Text>
        <AppButton title="Check in now" onPress={handleCheckIn} loading={loading} style={{ width: "100%" }} />
      </AppCard>

      {result ? (
        <Text style={{ textAlign: "center", color: isError ? colors.danger : colors.success, fontWeight: "600" }}>
          {result}
        </Text>
      ) : null}
    </View>
  );
}