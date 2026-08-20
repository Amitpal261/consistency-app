import React, { useEffect, useRef, useState } from "react";
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
import { getCurrentPositionSafe } from "../lib/location";

function formatHMS(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function DwellSessionScreen({ habit, onDone }: { habit: Habit; onDone: () => void }) {
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
  const [exiting, setExiting] = useState(false);
  const [starting, setStarting] = useState(false);

  // Grace countdown ticks locally every second between 5s polls, so the
  // "10 minutes to come back" number visibly counts down in real time
  // instead of jumping in 5-second steps — this matters specifically here
  // because grace period is the moment of highest anxiety in this flow.
  const [displayGraceSeconds, setDisplayGraceSeconds] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCelebratedRef = useRef(false);

  const pulse = useRef(new Animated.Value(1)).current;
  const completeScale = useRef(new Animated.Value(0.6)).current;

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

  const fetchStatus = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await getDwellStatus(token, habit._id);
      setStatus(res);
      setDisplayGraceSeconds(res.graceSecondsRemaining);
      setLoading(false);
      setError(null);
    } catch (e) {
      console.warn("dwell status poll failed", e);
      setError(e instanceof Error ? e.message : "Could not check session status");
      setLoading(false);
    }
  }, [token, habit._id]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  // Local 1-second grace countdown, resynced to the server's true value on
  // every poll (so drift never accumulates beyond ~5 seconds).
  useEffect(() => {
    if (status?.isInGrace) {
      graceTickRef.current = setInterval(() => {
        setDisplayGraceSeconds((s) => Math.max(0, s - 1));
      }, 1000);
    }
    return () => {
      if (graceTickRef.current) clearInterval(graceTickRef.current);
    };
  }, [status?.isInGrace]);

  // Celebrate + leave automatically once the goal is reached — no dead-end
  // "ready to submit" text with nothing to press.
  useEffect(() => {
    if (status?.isCompleted && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      Animated.spring(completeScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 10 }).start();
      const timer = setTimeout(onDone, 2200);
      return () => clearTimeout(timer);
    }
  }, [status?.isCompleted, completeScale, onDone]);

  // Manual fallback for when background geofencing hasn't fired yet (it can
  // genuinely take a minute or more on Android even when you're standing
  // right there). Unlike before, this now sends real GPS — the backend
  // verifies you're actually within the habit's radius before starting,
  // so this can't be used to fake a session.
  async function handleStartManually() {
    if (!token) return;
    setStarting(true);
    setError(null);
    try {
      const pos = await getCurrentPositionSafe();
      await startDwell(token, habit._id, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      await fetchStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start — make sure location is enabled.");
    } finally {
      setStarting(false);
    }
  }

  // Ending the session early is a legitimate manual action (the user
  // choosing to stop), unlike a manual "start" would have been without
  // GPS proof — so this still sends real current GPS for an honest,
  // consistent record, but doesn't let anyone fake having been there.
  async function handleExitEarly() {
    if (!token) return;
    setExiting(true);
    try {
      const pos = await getCurrentPositionSafe();
      await exitDwell(token, habit._id, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not end session");
      setExiting(false);
    }
  }

  const elapsed = status?.elapsedMinutes ?? 0;
  const required = status?.requiredMinutes ?? habit.requiredDurationMinutes ?? 0;
  const progress = required > 0 ? Math.min(1, elapsed / required) : 0;
  const remainingSeconds = Math.max(0, (required - elapsed) * 60);
  const isInGrace = status?.isInGrace ?? false;
  const isCompleted = status?.isCompleted ?? false;
  const hasStarted = elapsed > 0 || isInGrace;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        <Pressable onPress={onDone} style={styles.headerBack}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{isCompleted ? "Session Complete" : "Active Dwell Session"}</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.container}>
        {isCompleted ? (
          <Animated.View style={{ alignItems: "center", transform: [{ scale: completeScale }] }}>
            <View style={styles.completeIconWrap}>
              <MaterialIcons name="check-circle" size={56} color={colors.success} />
            </View>
            <Text style={[typography.h1, { marginTop: spacing.md, textAlign: "center" }]}>Goal reached!</Text>
            <Text style={[typography.bodyMd, { marginTop: spacing.xs, textAlign: "center" }]}>
              {required} minutes at {habit.name} — streak updated.
            </Text>
          </Animated.View>
        ) : (
          <>
            <View style={styles.timerOrbWrap}>
              <Animated.View style={[styles.orbGlow, { transform: [{ scale: pulse }] }]} />
              <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.timerOrb}>
                <Text style={styles.timerDisplay}>{formatHMS(remainingSeconds)}</Text>
                <Text style={styles.timerSub}>TIME REMAINING</Text>
              </LinearGradient>
            </View>

            <AppCard variant="hero" style={styles.habitCard}>
              <View style={styles.habitHeader}>
                <MaterialIcons name="timer" size={24} color={colors.tertiary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.habitName}>{habit.name}</Text>
                  <Text style={styles.habitTarget}>Goal: {required} minutes at this location</Text>
                </View>
                <Text style={styles.percentText}>{Math.round(progress * 100)}%</Text>
              </View>

              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={["#fabd00", "#745600"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]}
                />
              </View>

              <View style={{ marginTop: spacing.sm }}>
                {loading ? <Text style={{ color: colors.onSurfaceVariant }}>Checking your session…</Text> : null}
                {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

                {!loading && !hasStarted ? (
                  <View style={{ gap: spacing.sm }}>
                    <Text style={{ color: colors.onSurfaceVariant }}>
                      Tracking usually starts automatically when you arrive — if it hasn't picked you up yet
                      (background detection can take a minute), tap below once you're there.
                    </Text>
                    <AppButton
                      title="I'm here — start tracking"
                      onPress={handleStartManually}
                      loading={starting}
                      style={{ width: "100%" }}
                    />
                  </View>
                ) : null}

                {isInGrace ? (
                  <View style={styles.graceBanner}>
                    <MaterialIcons name="hourglass-top" size={16} color={colors.warning} />
                    <Text style={styles.graceText}>
                      You stepped out — {formatHMS(displayGraceSeconds)} to come back before this session resets
                    </Text>
                  </View>
                ) : null}
              </View>
            </AppCard>

            <AppButton
              title="End session early"
              variant="danger"
              onPress={handleExitEarly}
              loading={exiting}
              style={{ width: "100%" }}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
  },
  headerBack: { padding: 6 },
  headerTitle: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface },
  container: { flex: 1, paddingHorizontal: spacing.marginEdge, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  completeIconWrap: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: "rgba(16,185,129,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  timerOrbWrap: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  orbGlow: { position: "absolute", width: 250, height: 250, borderRadius: radius.full, backgroundColor: "rgba(63, 81, 181, 0.35)" },
  timerOrb: {
    width: 200,
    height: 200,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(186, 195, 255, 0.3)",
    elevation: 12,
  },
  timerDisplay: {
    ...typography.headlineLgMobile,
    fontSize: 32,
    fontWeight: "800",
    color: colors.onSurface,
    fontVariant: ["tabular-nums"],
  },
  timerSub: { ...typography.labelCaps, color: colors.primary, fontSize: 10, letterSpacing: 1.5, marginTop: 4 },
  habitCard: { width: "100%", gap: spacing.sm },
  habitHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  habitName: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface, fontSize: 16 },
  habitTarget: { ...typography.bodyMd, fontSize: 12, color: colors.onSurfaceVariant },
  percentText: { ...typography.bodyMd, fontSize: 18, fontWeight: "800", color: colors.tertiary },
  progressTrack: { height: 8, backgroundColor: "rgba(255, 255, 255, 0.1)", borderRadius: radius.full, overflow: "hidden", marginTop: 8 },
  progressFill: { height: "100%", borderRadius: radius.full },
  graceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,193,7,0.1)",
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  graceText: { color: colors.onSurface, fontSize: 12, flex: 1 },
});