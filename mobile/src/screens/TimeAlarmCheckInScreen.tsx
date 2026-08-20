import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import { getTodayPrompt, submitCheckIn, type Habit } from "../lib/api";
import { stopNativeAlarm } from "../lib/nativeAlarm";
import { getCurrentPositionSafe } from "../lib/location";
import { useAuth } from "../context/AuthContext";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, spacing, typography } from "../theme/colors";

export function TimeAlarmCheckInScreen({ habit, onDone }: { habit: Habit; onDone: () => void }) {
  const { token } = useAuth();
  const [prompt, setPrompt] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [now, setNow] = useState(new Date());
  const [stage, setStage] = useState<"idle" | "submitting" | "success" | "pending">("idle");
  const [resultStreak, setResultStreak] = useState<number | null>(null);

  // update clock every minute
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!token) return;
    getTodayPrompt(token).then((res) => setPrompt(res.prompt)).catch(() => {});
  }, [token]);

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

    const finalPhotoBase64 = manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : undefined;
    if (finalPhotoBase64) setPhotoBase64(finalPhotoBase64);
    setCameraOpen(false);

    // stop any native alarm
    stopNativeAlarm();
    setStage("submitting");

    // submit check-in with photo
    try {
      let location;
      // time task still may require gps server-side for some legacy records; attempt to get location if possible
      try {
        const pos = await getCurrentPositionSafe();
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracyMeters: pos.coords.accuracy ?? undefined };
      } catch (e) {
        location = undefined;
      }

      if (!token) throw new Error("Not authenticated");
      const res = await submitCheckIn(token, { habitId: habit._id, photoBase64: finalPhotoBase64, location });
      const isPending = res.reviewStatus === "pending" || res.reviewStatus === "flagged";
      setResultStreak(res.currentStreak);
      setStage(isPending ? "pending" : "success");
      setTimeout(onDone, isPending ? 2200 : 1800);
    } catch (err) {
      setStage("idle");
      Alert.alert("Check-in failed", err instanceof Error ? err.message : "Failed to submit check-in");
    }
  }

  if (cameraOpen) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

        <SafeAreaView style={{ position: "absolute", top: 12, left: 12, right: 12 }}>
          <AppCard variant="hero" style={{ padding: 12 }}>
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant }}>TODAY'S PROOF</Text>
            <Text style={{ fontSize: 16, color: colors.onSurface }}>{prompt ?? "Hold up proof indicator"}</Text>
          </AppCard>
        </SafeAreaView>

        <View style={{ position: "absolute", bottom: 28, left: 24, right: 24 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onPress={() => setCameraOpen(false)} style={{ padding: 10 }}>
              <MaterialIcons name="close" size={28} color="#fff" />
            </Pressable>
            <Pressable onPress={handleCapture} style={{ alignItems: "center" }}>
              <LinearGradient colors={["#3f51b5", "#08218a"]} style={{ padding: 18, borderRadius: 999 }}>
                <MaterialIcons name="photo-camera" size={28} color="#fff" />
              </LinearGradient>
            </Pressable>
            <View style={{ width: 44 }} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DotGridBackground />
      <View style={{ padding: spacing.marginEdge, flex: 1 }}>
        {stage === "submitting" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md }}>
            <MaterialIcons name="hourglass-top" size={40} color={colors.primary} />
            <Text style={{ ...typography.bodyMd, color: colors.onSurfaceVariant }}>Verifying your check-in…</Text>
          </View>
        ) : stage === "success" || stage === "pending" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm }}>
            <MaterialIcons
              name={stage === "success" ? "check-circle" : "hourglass-top"}
              size={56}
              color={stage === "success" ? colors.success : colors.warning}
            />
            <Text style={{ ...typography.h1, textAlign: "center" }}>
              {stage === "success" ? "Nice work!" : "Sent for review"}
            </Text>
            <Text style={{ ...typography.bodyMd, textAlign: "center" }}>
              {stage === "success" && resultStreak != null
                ? `Streak: ${resultStreak} 🔥`
                : "Your buddy will review this shortly."}
            </Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ ...typography.h1, color: colors.onSurface }}>{habit.name}</Text>
              <Text style={{ ...typography.bodyMd, color: colors.onSurfaceVariant }}>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>

            <Text style={{ marginTop: 8, color: colors.onSurfaceVariant }}>
              {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
            </Text>

            <View style={{ marginTop: 24 }}>
              <AppCard variant="hero">
                <Text style={{ ...typography.labelCaps, color: colors.primary }}>TODAY'S PROOF</Text>
                <Text style={{ marginTop: 8, color: colors.onSurface }}>{prompt ?? "Take a quick photo to prove you're up"}</Text>

                <AppButton title="I'm up — Take Photo" onPress={handleOpenCamera} style={{ marginTop: 12 }} />
              </AppCard>
            </View>

            <View style={{ flex: 1 }} />

            <View style={{ alignItems: "center", marginBottom: 24 }}>
              <Text style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>No snooze — this alarm requires a photo to verify</Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
