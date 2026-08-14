import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

export function FocusTimerScreen({
  habitName = "Study at Library",
  targetMinutes = 120,
  initialDwellMinutes = 45,
  onDone,
}: {
  habitName?: string;
  targetMinutes?: number;
  initialDwellMinutes?: number;
  onDone?: () => void;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState((targetMinutes - initialDwellMinutes) * 60);
  const [isRunning, setIsRunning] = useState(true);

  const orbScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.08, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [orbScale]);

  useEffect(() => {
    if (!isRunning || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsRemaining]);

  const hours = Math.floor(secondsRemaining / 3600);
  const mins = Math.floor((secondsRemaining % 3600) / 60);
  const secs = secondsRemaining % 60;

  const totalSeconds = targetMinutes * 60;
  const elapsedSeconds = totalSeconds - secondsRemaining;
  const progressPercent = Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100));

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable onPress={onDone} style={styles.headerBack}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Active Dwell Session</Text>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>TRACKING</Text>
        </View>
      </View>

      <View style={styles.container}>
        {/* Central Timer Orb Ring */}
        <View style={styles.timerOrbWrap}>
          <Animated.View style={[styles.orbGlow, { transform: [{ scale: orbScale }] }]} />
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.timerOrb}>
            <Text style={styles.timerDisplay}>
              {String(hours).padStart(2, "0")}:{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </Text>
            <Text style={styles.timerSub}>TIME REMAINING</Text>
          </LinearGradient>
        </View>

        {/* Habit Context Card */}
        <AppCard variant="hero" style={styles.habitCard}>
          <View style={styles.habitHeader}>
            <MaterialIcons name="timer" size={24} color="#fabd00" />
            <View style={{ flex: 1 }}>
              <Text style={styles.habitName}>{habitName}</Text>
              <Text style={styles.habitTarget}>Goal: {targetMinutes} minutes required dwell</Text>
            </View>
            <Text style={styles.percentText}>{progressPercent}%</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={["#fabd00", "#745600"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
          </View>
        </AppCard>

        {/* Controls */}
        <View style={styles.controlRow}>
          <AppButton
            title={isRunning ? "Pause Session" : "Resume Session"}
            onPress={() => setIsRunning(!isRunning)}
            variant="secondary"
            icon={<MaterialIcons name={isRunning ? "pause" : "play-arrow"} size={20} color={colors.onSurface} />}
            style={{ flex: 1 }}
          />
          <AppButton
            title="Complete & Submit"
            onPress={onDone || (() => {})}
            variant="primary"
            icon={<MaterialIcons name="check" size={20} color="#FFFFFF" />}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
  },
  headerBack: {
    padding: 6,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "#10B981",
  },
  liveText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: "#10B981",
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  timerOrbWrap: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.35)",
  },
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
  timerSub: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  habitCard: {
    width: "100%",
    gap: spacing.sm,
  },
  habitHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  habitName: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 16,
  },
  habitTarget: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  percentText: {
    ...typography.bodyMd,
    fontSize: 18,
    fontWeight: "800",
    color: "#fabd00",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.full,
  },
  controlRow: {
    flexDirection: "row",
    gap: spacing.xs,
    width: "100%",
  },
});
