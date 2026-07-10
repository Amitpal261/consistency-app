import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../context/AuthContext";
import { getStreaks, getTodayPrompt, submitCheckIn } from "../lib/api";
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

  const [prompt, setPrompt] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!token) return;
    getStreaks(token).then((res) => {
      const row = res.streaks.find((s) => s.habitType === habitType);
      if (row && row.lastCheckInDateKey === todayKey()) {
        setAlreadyDoneToday(row.currentStreak);
      }
    });
    getTodayPrompt(token).then((res) => setPrompt(res.prompt));
  }, [token, habitType]);

  async function handleOpenCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Camera needed", "Please allow camera access to verify your check-in.");
        return;
      }
    }
    setCameraOpen(true);
  }

  async function handleCapture() {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5 });
    if (!photo?.uri) return;

    const manipulated = await ImageManipulator.manipulateAsync(photo.uri, [{ resize: { width: 800 } }], {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    });

    if (manipulated.base64) {
      setPhotoBase64(`data:image/jpeg;base64,${manipulated.base64}`);
    }
    setCameraOpen(false);
  }

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
        photoBase64: photoBase64 ?? undefined,
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

  if (cameraOpen) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={{ position: "absolute", top: spacing.lg, left: spacing.lg, right: spacing.lg }}>
          <AppCard>
            <Text style={{ color: colors.textPrimary, fontWeight: "700", textAlign: "center" }}>{prompt}</Text>
          </AppCard>
        </View>
        <View style={{ position: "absolute", bottom: spacing.xl, left: spacing.lg, right: spacing.lg }}>
          <AppButton title="Capture photo" onPress={handleCapture} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", padding: spacing.lg, gap: spacing.lg }}>
      <AppCard style={{ alignItems: "center", paddingVertical: spacing.xl }}>
        <Text style={{ fontSize: 56, marginBottom: spacing.sm }}>☀️</Text>
        <Text style={[typography.h1, { marginBottom: spacing.xs }]}>Ready to check in?</Text>
        {prompt ? (
          <Text style={[typography.body, { textAlign: "center", marginBottom: spacing.md }]}>
            Today's verification: <Text style={{ color: colors.accent, fontWeight: "700" }}>{prompt}</Text>
          </Text>
        ) : null}

        {photoBase64 ? (
          <Text style={{ color: colors.success, fontWeight: "600", marginBottom: spacing.md }}>
            ✅ Photo captured
          </Text>
        ) : (
          <AppButton title="Take verification photo" onPress={handleOpenCamera} style={{ width: "100%", marginBottom: spacing.md }} />
        )}

        <AppButton
          title="Check in now"
          onPress={handleCheckIn}
          loading={loading}
          disabled={!photoBase64}
          style={{ width: "100%" }}
        />
      </AppCard>

      {result ? (
        <Text style={{ textAlign: "center", color: isError ? colors.danger : colors.success, fontWeight: "600" }}>
          {result}
        </Text>
      ) : null}
    </View>
  );
}