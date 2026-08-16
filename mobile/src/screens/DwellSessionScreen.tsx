import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";
import { getDwellStatus, startDwell, exitDwell, type Habit } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function secondsToHHMMSS(sec: number) {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DwellSessionScreen({
  habit,
  onDone,
}: {
  habit: Habit;
  onDone?: () => void;
}) {
  const { token } = useAuth();
  const [status, setStatus] = useState<{
    elapsedMinutes: number;
    requiredMinutes: number;
    isInGrace: boolean;
    graceSecondsRemaining: number;
    isCompleted?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const fetchStatus = async () => {
    if (!token) return;
    try {
      const res = await getDwellStatus(token, habit._id);
      setStatus(res);
      setLoading(false);
      setError(null);
    } catch (e: any) {
      console.warn("dwell status poll failed", e?.message ?? e);
      setError(e?.message ?? "Failed to fetch status");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000) as unknown as number;
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, habit._id]);

  const onExit = async () => {
    if (!token) return;
    try {
      await exitDwell(token, habit._id);
      // fetch updated status
      fetchStatus();
    } catch (e) {
      console.warn("exit dwell failed", e);
    }
  };

  const onStart = async () => {
    if (!token) return;
    try {
      await startDwell(token, habit._id);
      fetchStatus();
    } catch (e) {
      console.warn("start dwell failed", e);
    }
  };

  const elapsed = status?.elapsedMinutes ?? 0;
  const required = status?.requiredMinutes ?? habit.requiredDurationMinutes ?? 0;
  const progress = required > 0 ? Math.min(1, elapsed / required) : 0;

  const isInGrace = status?.isInGrace ?? false;
  const graceSeconds = status?.graceSecondsRemaining ?? 0;
  const isCompleted = status?.isCompleted ?? elapsed >= required;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        <Pressable onPress={onDone} style={styles.headerBack}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Active Dwell Session</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.container}>
        <View style={styles.timerOrbWrap}>
          <Animated.View style={[styles.orbGlow, { transform: [{ scale: pulse }] }]} />
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.timerOrb}>
            <Text style={styles.timerDisplay}>{`${String(Math.floor((required - elapsed) / 60)).padStart(2, "0")}:${String((required - elapsed) % 60).padStart(2, "0")}`}</Text>
            <Text style={styles.timerSub}>TIME REMAINING</Text>
          </LinearGradient>
        </View>

        <AppCard variant="hero" style={styles.habitCard}>
          <View style={styles.habitHeader}>
            <MaterialIcons name="timer" size={24} color="#fabd00" />
            <View style={{ flex: 1 }}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.habitTarget}>Goal: {required} minutes required dwell</Text>
            </View>
            <Text style={styles.percentText}>{Math.round(progress * 100)}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <LinearGradient colors={["#fabd00", "#745600"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>

          <View style={{ marginTop: 8 }}>
            {loading ? <Text style={{ color: colors.onSurfaceVariant }}>Loading session...</Text> : null}
            {error ? <Text style={{ color: "#ff6666" }}>{error}</Text> : null}
            {isInGrace ? (
              <Text style={{ color: colors.onSurfaceVariant }}>Grace time — come back within {secondsToHHMMSS(graceSeconds)}</Text>
            ) : null}
            {isCompleted ? <Text style={{ color: colors.primary }}>Session complete — ready to submit</Text> : null}
          </View>
        </AppCard>

        <View style={styles.controlRow}>
          <AppButton title="Start/Resume" onPress={onStart} variant="secondary" style={{ flex: 1 }} />
          <AppButton title="Exit Session" onPress={onExit} variant="primary" style={{ flex: 1 }} />
        </View>

        <AppButton title="Close" onPress={onDone} style={{ marginTop: 12 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.marginEdge, paddingTop: spacing.sm },
  headerBack: { padding: 6 },
  headerTitle: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface },
  container: { flex: 1, paddingHorizontal: spacing.marginEdge, alignItems: "center", gap: spacing.lg },
  timerOrbWrap: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  orbGlow: { position: "absolute", width: 250, height: 250, borderRadius: radius.full, backgroundColor: "rgba(63, 81, 181, 0.35)" },
  timerOrb: { width: 200, height: 200, borderRadius: radius.full, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(186, 195, 255, 0.3)", elevation: 12 },
  timerDisplay: { ...typography.headlineLgMobile, fontSize: 32, fontWeight: "800", color: colors.onSurface, fontVariant: ["tabular-nums"] },
  timerSub: { ...typography.labelCaps, color: colors.primary, fontSize: 10, letterSpacing: 1.5, marginTop: 4 },
  habitCard: { width: "100%", gap: spacing.sm },
  habitHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  habitName: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface, fontSize: 16 },
  habitTarget: { ...typography.bodyMd, fontSize: 12, color: colors.onSurfaceVariant },
  percentText: { ...typography.bodyMd, fontSize: 18, fontWeight: "800", color: "#fabd00" },
  progressTrack: { height: 8, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: radius.full, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", borderRadius: radius.full },
  controlRow: { flexDirection: "row", gap: spacing.xs, width: "100%" },
});
