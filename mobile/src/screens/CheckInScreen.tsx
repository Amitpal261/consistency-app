import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { getCurrentPositionSafe } from "../lib/location";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuth } from "../context/AuthContext";
import { getTodayPrompt, submitCheckIn, type Habit } from "../lib/api";
import { stopNativeAlarm } from "../lib/nativeAlarm";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

type Stage = "idle" | "submitting" | "success" | "pending" | "error";

const TASK_ICON: Record<Habit["taskType"], keyof typeof MaterialIcons.glyphMap> = {
  time: "alarm",
  location: "place",
  location_duration: "timer",
};

export function CheckInScreen({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const { token } = useAuth();
  const [stage, setStage] = useState<Stage>("idle");
  const [resultText, setResultText] = useState<string | null>(null);

  const [prompt, setPrompt] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0.6)).current;

  const needsPhoto = habit.verificationMethod !== "gps";
  const needsGps = habit.verificationMethod !== "photo";

  useEffect(() => {
    if (!token || !needsPhoto) return;
    getTodayPrompt(token).then((res) => setPrompt(res.prompt));
  }, [token, needsPhoto]);

  // Slow "waiting for you" pulse on the idle hero icon.
  useEffect(() => {
    if (stage !== "idle") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stage, pulse]);

  useEffect(() => {
    if (stage === "success" || stage === "pending") {
      successScale.setValue(0.6);
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
    }
  }, [stage, successScale]);

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

    // Kill the loud alarm the instant proof is captured — don't wait on the
    // network request below, since that latency shouldn't keep it ringing.
    stopNativeAlarm();
  }

  async function handleCheckIn() {
    if (!token) return;
    // Covers the GPS-only habit case (no photo capture step to hook into).
    stopNativeAlarm();
    setStage("submitting");
    try {
      let location: { lat: number; lng: number; accuracyMeters?: number; isMockLocation?: boolean } | undefined;

      if (needsGps) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location needed", "Please allow location access to check in.");
          setStage("idle");
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

      const isPending = res.reviewStatus === "pending" || res.reviewStatus === "flagged";

      setResultText(
        isPending
          ? "Sent for buddy review — your streak updates once approved."
          : `Streak: ${res.currentStreak} 🔥`
      );
      setStage(isPending ? "pending" : "success");
      setTimeout(onDone, isPending ? 1800 : 1400);
    } catch (err) {
      setResultText(err instanceof Error ? err.message : "Check-in failed");
      setStage("error");
    }
  }

  // --- Camera capture state ---
  if (cameraOpen) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
        <View style={{ position: "absolute", top: spacing.xl, left: spacing.lg, right: spacing.lg }}>
          <AppCard style={{ alignItems: "center" }}>
            <Text style={[typography.labelCaps, { color: colors.primary, marginBottom: spacing.xs }]}>
              TODAY'S PROOF
            </Text>
            <Text style={{ color: colors.onSurface, fontWeight: "700", textAlign: "center", fontSize: 16 }}>
              {prompt}
            </Text>
          </AppCard>
        </View>
        <View style={{ position: "absolute", bottom: spacing.xl, left: spacing.lg, right: spacing.lg }}>
          <AppButton title="Capture photo" onPress={handleCapture} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DotGridBackground />
      <View style={{ flex: 1, padding: spacing.marginEdge, justifyContent: "center", gap: spacing.lg }}>
        {stage === "success" || stage === "pending" ? (
          <Animated.View style={{ alignItems: "center", transform: [{ scale: successScale }] }}>
            <View
              style={[
                styles.heroIconWrap,
                { backgroundColor: stage === "success" ? "rgba(16,185,129,0.14)" : "rgba(255,193,7,0.14)" },
              ]}
            >
              <MaterialIcons
                name={stage === "success" ? "check-circle" : "hourglass-top"}
                size={48}
                color={stage === "success" ? colors.success : colors.warning}
              />
            </View>
            <Text style={[typography.h1, { textAlign: "center", marginTop: spacing.md }]}>
              {stage === "success" ? "Nice work!" : "Sent for review"}
            </Text>
            <Text style={[typography.bodyMd, { textAlign: "center", marginTop: spacing.xs }]}>{resultText}</Text>
          </Animated.View>
        ) : (
          <AppCard style={{ alignItems: "center", paddingVertical: spacing.xl }}>
            <Animated.View
              style={[styles.heroIconWrap, { transform: [{ scale: stage === "idle" ? pulse : 1 }] }]}
            >
              <MaterialIcons name={TASK_ICON[habit.taskType]} size={40} color={colors.primary} />
            </Animated.View>

            <Text style={[typography.h1, { marginTop: spacing.md, marginBottom: spacing.xs, textAlign: "center" }]}>
              {habit.name}
            </Text>

            {needsPhoto && prompt ? (
              <Text style={[typography.bodyMd, { textAlign: "center", marginBottom: spacing.md }]}>
                Today's verification:{" "}
                <Text style={{ color: colors.accent, fontWeight: "700" }}>{prompt}</Text>
              </Text>
            ) : null}

            {needsPhoto ? (
              photoBase64 ? (
                <View style={[styles.chip, { marginBottom: spacing.md }]}>
                  <MaterialIcons name="check-circle" size={16} color={colors.success} />
                  <Text style={{ color: colors.success, fontWeight: "600", marginLeft: 6 }}>Photo captured</Text>
                </View>
              ) : (
                <AppButton
                  title="Take verification photo"
                  variant="secondary"
                  onPress={handleOpenCamera}
                  style={{ width: "100%", marginBottom: spacing.md }}
                />
              )
            ) : null}

            <AppButton
              title="Check in now"
              onPress={handleCheckIn}
              loading={stage === "submitting"}
              disabled={needsPhoto && !photoBase64}
              style={{ width: "100%" }}
            />

            {stage === "error" && resultText ? (
              <Text style={{ color: colors.error, marginTop: spacing.sm, textAlign: "center" }}>{resultText}</Text>
            ) : null}
          </AppCard>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = {
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: "rgba(186,195,255,0.12)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "rgba(16,185,129,0.1)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
};