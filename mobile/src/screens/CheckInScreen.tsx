import { useEffect, useRef, useState } from "react";
import { Alert, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { getCurrentPositionSafe } from "../lib/location";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../context/AuthContext";
import { getTodayPrompt, submitCheckIn, type Habit } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

export function CheckInScreen({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const needsPhoto = habit.verificationMethod !== "gps";
  const needsGps = habit.verificationMethod !== "photo";

  useEffect(() => {
    if (!token || !needsPhoto) return;
    getTodayPrompt(token).then((res) => setPrompt(res.prompt));
  }, [token, needsPhoto]);

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
      let location: { lat: number; lng: number; accuracyMeters?: number; isMockLocation?: boolean } | undefined;

      if (needsGps) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location needed", "Please allow location access to check in.");
          setLoading(false);
          return;
        }
const position = await getCurrentPositionSafe();
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? undefined,
          isMockLocation: (position.mocked as boolean | undefined) ?? false,
        };
      }

      const res = await submitCheckIn(token, {
        habitId: habit._id,
        location,
        photoBase64: photoBase64 ?? undefined,
      });

      setResult(`Checked in! Current streak: ${res.currentStreak} 🔥`);
      setTimeout(onDone, 1200);
    } catch (err) {
      setIsError(true);
      setResult(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setLoading(false);
    }
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
        <Text style={[typography.h1, { marginBottom: spacing.xs, textAlign: "center" }]}>{habit.name}</Text>
        {needsPhoto && prompt ? (
          <Text style={[typography.body, { textAlign: "center", marginBottom: spacing.md }]}>
            Today's verification: <Text style={{ color: colors.accent, fontWeight: "700" }}>{prompt}</Text>
          </Text>
        ) : null}

        {needsPhoto ? (
          photoBase64 ? (
            <Text style={{ color: colors.success, fontWeight: "600", marginBottom: spacing.md }}>✅ Photo captured</Text>
          ) : (
            <AppButton title="Take verification photo" onPress={handleOpenCamera} style={{ width: "100%", marginBottom: spacing.md }} />
          )
        ) : null}

        <AppButton
          title="Check in now"
          onPress={handleCheckIn}
          loading={loading}
          disabled={needsPhoto && !photoBase64}
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