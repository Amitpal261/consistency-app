import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { submitCheckIn } from "../lib/api";

export function CheckInScreen({ habitType = "wake_up" as const }: { habitType?: "wake_up" | "library" | "custom" }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleCheckIn() {
    if (!token) return;
    setLoading(true);
    setResult(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location needed", "Please allow location access to check in.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      // Android exposes whether the location came from a mock/fake-GPS
      // provider — this is a real device signal, not a guess, and it's the
      // cheapest first line of defense against spoofed check-ins.
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
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>Ready to check in?</Text>
      <Pressable
        onPress={handleCheckIn}
        disabled={loading}
        style={{
          backgroundColor: "#0f766e",
          paddingVertical: 16,
          paddingHorizontal: 32,
          borderRadius: 14,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Check in now</Text>
        )}
      </Pressable>
      {result ? <Text style={{ marginTop: 12 }}>{result}</Text> : null}
    </View>
  );
}
