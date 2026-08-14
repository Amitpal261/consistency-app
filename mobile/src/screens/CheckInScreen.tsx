import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as ImageManipulator from "expo-image-manipulator";
import { getCurrentPositionSafe } from "../lib/location";
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
  location: "location-on",
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
  const successScale = useRef(new Animated.Value(0.5)).current;
  const scanLine = useRef(new Animated.Value(0)).current;

  const needsPhoto = habit.verificationMethod !== "gps";
  const needsGps = habit.verificationMethod !== "photo";

  useEffect(() => {
    if (!token || !needsPhoto) return;
    getTodayPrompt(token).then((res) => setPrompt(res.prompt));
  }, [token, needsPhoto]);

  // Pulse loop for alarm halo
  useEffect(() => {
    if (stage !== "idle") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [stage, pulse]);

  // AI scanning animation loop
  useEffect(() => {
    if (stage !== "submitting") return;
    const scan = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(scanLine, { toValue: 0, duration: 1400, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    scan.start();
    return () => scan.stop();
  }, [stage, scanLine]);

  // Spring animation for verdict
  useEffect(() => {
    if (stage === "success" || stage === "pending") {
      successScale.setValue(0.5);
      Animated.spring(successScale, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 12 }).start();
    }
  }, [stage, successScale]);

  async function handleOpenCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Camera Permission Required", "Camera access is needed to take verification photos.");
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

    // Stop native blaring alarm instantly on photo capture
    stopNativeAlarm();
  }

  async function handleCheckIn() {
    if (!token) return;
    stopNativeAlarm();
    setStage("submitting");
    try {
      let location: { lat: number; lng: number; accuracyMeters?: number; isMockLocation?: boolean } | undefined;

      if (needsGps) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Location Permission Required", "Location access is needed to check in.");
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
          : `Streak Increased to ${res.currentStreak} Days 🔥`
      );
      setStage(isPending ? "pending" : "success");
      setTimeout(onDone, isPending ? 2200 : 1800);
    } catch (err) {
      setResultText(err instanceof Error ? err.message : "Check-in failed");
      setStage("error");
    }
  }

  // --- Camera Capture View ---
  if (cameraOpen) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

        {/* Top Floating Prompt Overlay */}
        <SafeAreaView style={styles.cameraTopArea}>
          <AppCard variant="hero" style={styles.promptCard}>
            <View style={styles.promptBadge}>
              <MaterialIcons name="camera" size={14} color="#fabd00" />
              <Text style={styles.promptBadgeText}>PROOFSPEC PROMPT</Text>
            </View>
            <Text style={styles.promptText}>{prompt || "Hold up proof indicator"}</Text>
          </AppCard>
        </SafeAreaView>

        {/* Bottom Shutter Action Bar */}
        <View style={styles.cameraBottomBar}>
          <Pressable onPress={() => setCameraOpen(false)} style={styles.cameraCancelBtn}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </Pressable>

          <Pressable onPress={handleCapture} style={styles.shutterOuter}>
            <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.shutterInner}>
              <MaterialIcons name="photo-camera" size={32} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.container}>
        {/* SUCCESS / VERDICT STAGE */}
        {stage === "success" || stage === "pending" ? (
          <Animated.View style={[styles.verdictWrap, { transform: [{ scale: successScale }] }]}>
            <View style={styles.orbWrap}>
              <View
                style={[
                  styles.verdictOrbGlow,
                  { backgroundColor: stage === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(250, 189, 0, 0.4)" },
                ]}
              />
              <LinearGradient
                colors={stage === "success" ? ["#10B981", "#047857"] : ["#fabd00", "#745600"]}
                style={styles.verdictOrb}
              >
                <MaterialIcons
                  name={stage === "success" ? "verified" : "hourglass-top"}
                  size={48}
                  color={stage === "success" ? "#FFFFFF" : "#261a00"}
                />
              </LinearGradient>
            </View>

            <Text style={styles.verdictTitle}>
              {stage === "success" ? "Verification Passed!" : "Sent to Buddy Review"}
            </Text>
            <Text style={styles.verdictSubtitle}>{resultText}</Text>
          </Animated.View>
        ) : stage === "submitting" ? (
          /* AI SCANNING STAGE */
          <View style={styles.verdictWrap}>
            <View style={styles.orbWrap}>
              <Animated.View style={[styles.orbGlow, { transform: [{ scale: pulse }], opacity: 0.6 }]} />
              <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.verdictOrb}>
                <MaterialIcons name="auto-awesome" size={44} color={colors.surfaceTint} />
              </LinearGradient>
            </View>

            <Text style={styles.verdictTitle}>AI Pre-screening Proof...</Text>
            <Text style={styles.verdictSubtitle}>Validating GPS coordinates & photo integrity</Text>
          </View>
        ) : (
          /* IDLE / CHECK-IN STAGE */
          <AppCard variant="hero" style={styles.mainCard}>
            <View style={styles.orbWrap}>
              <Animated.View
                style={[
                  styles.orbGlow,
                  {
                    transform: [{ scale: pulse }],
                    backgroundColor: habit.taskType === "time" ? "rgba(250, 189, 0, 0.35)" : "rgba(63, 81, 181, 0.4)",
                  },
                ]}
              />
              <LinearGradient
                colors={habit.taskType === "time" ? ["#fabd00", "#745600"] : ["#3f51b5", "#08218a"]}
                style={styles.checkinOrb}
              >
                <MaterialIcons
                  name={TASK_ICON[habit.taskType]}
                  size={40}
                  color={habit.taskType === "time" ? "#261a00" : "#FFFFFF"}
                />
              </LinearGradient>
            </View>

            <Text style={styles.habitTitle}>{habit.name}</Text>
            <Text style={styles.habitMeta}>PROOF MODE: {habit.verificationMethod.toUpperCase()}</Text>

            {needsPhoto && prompt ? (
              <View style={styles.promptBanner}>
                <Text style={styles.promptLabel}>TODAY'S REQUIRED PROMPT:</Text>
                <Text style={styles.promptVal}>{prompt}</Text>
              </View>
            ) : null}

            {needsPhoto ? (
              photoBase64 ? (
                <View style={styles.photoCapturedBadge}>
                  <MaterialIcons name="check-circle" size={18} color="#10B981" />
                  <Text style={styles.photoCapturedText}>Photo Proof Captured</Text>
                </View>
              ) : (
                <AppButton
                  title="Capture Photo Proof"
                  variant="tertiary"
                  icon={<MaterialIcons name="photo-camera" size={20} color="#261a00" />}
                  onPress={handleOpenCamera}
                  style={styles.fullBtn}
                />
              )
            ) : null}

            <AppButton
              title="Submit Proof & Check In"
              onPress={handleCheckIn}
              disabled={needsPhoto && !photoBase64}
              variant="primary"
              style={styles.fullBtn}
            />

            {stage === "error" && resultText ? (
              <View style={styles.errorBanner}>
                <MaterialIcons name="error-outline" size={16} color={colors.error} />
                <Text style={styles.errorText}>{resultText}</Text>
              </View>
            ) : null}
          </AppCard>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraTopArea: {
    position: "absolute",
    top: spacing.md,
    left: spacing.marginEdge,
    right: spacing.marginEdge,
    zIndex: 20,
  },
  promptCard: {
    alignItems: "center",
    gap: 4,
  },
  promptBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  promptBadgeText: {
    ...typography.labelCaps,
    color: "#fabd00",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  promptText: {
    ...typography.headlineLgMobile,
    fontSize: 18,
    color: colors.onSurface,
    textAlign: "center",
  },
  cameraBottomBar: {
    position: "absolute",
    bottom: spacing.xl,
    left: spacing.marginEdge,
    right: spacing.marginEdge,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cameraCancelBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    padding: 3,
  },
  shutterInner: {
    flex: 1,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  verdictWrap: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    width: "100%",
  },
  verdictOrbGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: radius.full,
  },
  verdictOrb: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    elevation: 12,
  },
  verdictTitle: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  verdictSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 300,
  },
  mainCard: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
  },
  orbWrap: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  orbGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: radius.full,
  },
  checkinOrb: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    elevation: 10,
  },
  habitTitle: {
    ...typography.headlineLgMobile,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  habitMeta: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  promptBanner: {
    backgroundColor: "rgba(250, 189, 0, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(250, 189, 0, 0.3)",
    borderRadius: radius.default,
    padding: 12,
    alignItems: "center",
    width: "100%",
    gap: 4,
  },
  promptLabel: {
    ...typography.labelCaps,
    color: "#fabd00",
    fontSize: 10,
  },
  promptVal: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  photoCapturedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoCapturedText: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  fullBtn: {
    width: "100%",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(147, 0, 10, 0.2)",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    fontSize: 13,
  },
});