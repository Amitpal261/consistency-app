import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { getHabitHistory, type Habit } from "../lib/api";
import { ACHIEVEMENTS } from "../lib/achievements";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

function tierBadge(currentStreak: number): string | null {
  if (currentStreak >= 30) return "ELITE";
  if (currentStreak >= 14) return "STRONG";
  if (currentStreak >= 7) return "STEADY";
  if (currentStreak >= 1) return "STARTED";
  return null;
}

function taskTypeLabel(habit: Habit): string {
  if (habit.taskType === "time") return "TIME-BASED HABIT";
  if (habit.taskType === "location_duration") return "LOCATION + DURATION";
  return "LOCATION HABIT";
}

function statusColor(status: string | null) {
  if (status === "approved" || status === "auto_approved_unreviewed") return colors.primary;
  if (status === "pending") return colors.warning;
  if (status === "flagged") return colors.error;
  return "rgba(255,255,255,0.06)";
}

export function HabitDetailScreen({
  habit,
  onBack,
  onCheckIn,
  onStartFocusTimer,
  onVerifyArrival,
  onRecoverStreak,
}: {
  habit: Habit;
  onBack: () => void;
  onCheckIn: () => void;
  onStartFocusTimer?: () => void;
  onVerifyArrival?: () => void;
  onRecoverStreak?: () => void;
}) {
  const { token } = useAuth();
  const [history, setHistory] = useState<{ date: string; status: string | null }[]>([]);

  const glowScale = useRef(new Animated.Value(1)).current;
  const currentDayPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!token) return;
    getHabitHistory(token, habit._id, 21)
      .then((res) => {
        const days =
          res.days ??
          (res.history || []).map((h) => ({
            date: h.dateKey,
            status: h.checkedIn ? "approved" : null,
          }));
        setHistory(days);
      })
      .catch((err) => console.error("Failed to load habit history:", err));
  }, [token, habit._id]);

  // Glow pulse on orb
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.08,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [glowScale]);

  // Current day pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(currentDayPulse, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(currentDayPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [currentDayPulse]);

  const badge = tierBadge(habit.currentStreak);
  const percentage = useMemo(() => {
    if (!history.length) return 0;
    const done = history.filter((d) => d.status && d.status !== "flagged").length;
    return Math.round((done / history.length) * 100);
  }, [history]);

  const nextGoal = useMemo(
    () =>
      ACHIEVEMENTS.filter((a) => a.requiredStreak > habit.currentStreak).sort(
        (a, b) => a.requiredStreak - b.requiredStreak
      )[0] ?? null,
    [habit.currentStreak]
  );

  const statusLabel =
    habit.lastCheckInDateKey === new Intl.DateTimeFormat("en-CA").format(new Date())
      ? "Proved Today ✓"
      : habit.currentStreak > 0
      ? "Due Today"
      : "Streak Broken";

  const secondaryLabel =
    habit.taskType === "time" && habit.timeWindow
      ? `${String(habit.timeWindow.hour).padStart(2, "0")}:${String(habit.timeWindow.minute).padStart(2, "0")}`
      : habit.verificationMethod === "photo_gps"
      ? "Photo + GPS"
      : habit.verificationMethod === "photo"
      ? "Photo only"
      : "GPS only";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DotGridBackground />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.marginEdge,
          paddingTop: spacing.sm,
        }}
      >
        <Pressable onPress={onBack} style={{ padding: 4, marginRight: spacing.sm }}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={typography.h1}>Habit Detail</Text>
      </View>

      {/* Scrollable body */}
      <ScrollView
        contentContainerStyle={{
          padding: spacing.marginEdge,
          alignItems: "center",
          paddingBottom: spacing.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ alignItems: "center", marginBottom: spacing.md }}>
          <Text style={[typography.h1, { color: colors.primary }]}>{habit.name}</Text>
          <Text style={typography.labelCaps}>{taskTypeLabel(habit)}</Text>
        </View>

        {/* Central orb */}
        <View
          style={{
            width: 256,
            height: 256,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: spacing.xl,
          }}
        >
          <Animated.View
            style={{
              position: "absolute",
              width: 256,
              height: 256,
              borderRadius: radius.full,
              backgroundColor: colors.primaryContainer,
              opacity: 0.5,
              transform: [{ scale: glowScale }],
              shadowColor: colors.primaryContainer,
              shadowOpacity: 0.6,
              shadowRadius: 60,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <LinearGradient
            colors={["#3f51b5", "#08218a"]}
            style={{
              width: 192,
              height: 192,
              borderRadius: radius.full,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: "rgba(186,195,255,0.35)",
              elevation: 10,
            }}
          >
            <Text style={typography.displayOrb}>{habit.currentStreak}</Text>
            <Text style={[typography.labelCaps, { marginTop: 4 }]}>DAY STREAK</Text>
          </LinearGradient>

          {badge ? (
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: colors.tertiary,
                borderRadius: radius.full,
                paddingHorizontal: 12,
                paddingVertical: 4,
                shadowColor: colors.tertiary,
                shadowOpacity: 0.5,
                shadowRadius: 10,
              }}
            >
              <Text
                style={{ color: colors.onTertiary, fontWeight: "800", fontSize: 11, letterSpacing: 1 }}
              >
                {badge}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Activity history */}
        <AppCard style={{ width: "100%", marginBottom: spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.sm,
            }}
          >
            <Text style={typography.labelCaps}>Activity History</Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(186,195,255,0.2)" }}
              />
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(186,195,255,0.6)" }}
              />
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }}
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {history.map((d, i) => {
              const isLast = i === history.length - 1;
              const cell = (
                <View
                  key={d.date}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 4,
                    backgroundColor: statusColor(d.status),
                  }}
                />
              );
              return isLast ? (
                <Animated.View key={d.date} style={{ opacity: currentDayPulse }}>
                  {cell}
                </Animated.View>
              ) : (
                cell
              );
            })}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
            }}
          >
            <View>
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>NEXT MILESTONE</Text>
              <Text style={[typography.timerNumeric, { color: colors.primary }]}>
                {nextGoal ? `${nextGoal.requiredStreak} DAYS` : "MAXED"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>LAST 21 DAYS</Text>
              <Text style={[typography.timerNumeric, { color: colors.tertiary }]}>{percentage}%</Text>
            </View>
          </View>
        </AppCard>

        {/* Status pills */}
        <View style={{ flexDirection: "row", gap: spacing.sm, width: "100%" }}>
          <AppCard
            style={{ flex: 1, flexDirection: "row", alignItems: "center", padding: spacing.sm }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.full,
                backgroundColor: "rgba(186,195,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="verified" size={16} color={colors.primary} />
            </View>
            <View style={{ marginLeft: spacing.xs }}>
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>STATUS</Text>
              <Text style={{ color: colors.onSurface, fontWeight: "600" }}>{statusLabel}</Text>
            </View>
          </AppCard>

          <AppCard
            style={{ flex: 1, flexDirection: "row", alignItems: "center", padding: spacing.sm }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.full,
                backgroundColor: "rgba(250,189,0,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="schedule" size={16} color={colors.tertiary} />
            </View>
            <View style={{ marginLeft: spacing.xs }}>
              <Text style={[typography.labelCaps, { fontSize: 10 }]}>
                {habit.taskType === "time" ? "SCHEDULED" : "VERIFICATION"}
              </Text>
              <Text style={{ color: colors.onSurface, fontWeight: "600" }}>{secondaryLabel}</Text>
            </View>
          </AppCard>
        </View>
      </ScrollView>

      {/* ── Smart CTA Footer — changes based on habit taskType ── */}
      <View
        style={{
          paddingHorizontal: spacing.marginEdge,
          paddingBottom: spacing.lg,
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          backgroundColor: colors.background,
          gap: 8,
        }}
      >
        {habit.taskType === "location_duration" ? (
          <AppButton
            title="Start Focus Session"
            onPress={onStartFocusTimer ?? onCheckIn}
            variant="primary"
            icon={<MaterialIcons name="timer" size={20} color="#FFF" />}
            style={{ width: "100%" }}
          />
        ) : habit.taskType === "location" ? (
          <AppButton
            title="Verify Location Arrival"
            onPress={onVerifyArrival ?? onCheckIn}
            variant="primary"
            icon={<MaterialIcons name="my-location" size={20} color="#FFF" />}
            style={{ width: "100%" }}
          />
        ) : (
          <AppButton
            title="Capture Proof Photo"
            onPress={onCheckIn}
            variant="primary"
            icon={<MaterialIcons name="photo-camera" size={20} color="#FFF" />}
            style={{ width: "100%" }}
          />
        )}

        {habit.currentStreak === 0 && onRecoverStreak ? (
          <AppButton
            title="Recover Streak"
            onPress={onRecoverStreak}
            variant="tertiary"
            icon={<MaterialIcons name="local-fire-department" size={18} color="#fabd00" />}
            style={{ width: "100%" }}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}