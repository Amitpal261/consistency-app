import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, getMyProfile, type Habit } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);

function taskTypeIcon(habit: Habit): keyof typeof MaterialIcons.glyphMap {
  if (habit.taskType === "time") return "alarm";
  if (habit.taskType === "location_duration") return "timer";
  return "location-on";
}

function taskTypeLabel(habit: Habit): string {
  if (habit.taskType === "time" && habit.timeWindow) {
    const h = String(habit.timeWindow.hour).padStart(2, "0");
    const m = String(habit.timeWindow.minute).padStart(2, "0");
    return `Daily at ${h}:${m}`;
  }
  if (habit.taskType === "location_duration") return `${habit.requiredDurationMinutes ?? 0} min dwell time`;
  return "Location arrival check-in";
}

function todayKeyLocal(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "NIGHT FOCUS";
  if (hour < 12) return "MORNING ROUTINE";
  if (hour < 17) return "AFTERNOON FLOW";
  if (hour < 21) return "EVENING REVIEW";
  return "NIGHT DISCIPLINE";
}

export function HomeScreen({
  onSelectHabit,
  onAddHabit,
  onOpenDigest,
  onOpenFlow,
  onOpenFocusTimer,
  onOpenGeofence,
}: {
  onSelectHabit: (habit: Habit) => void;
  onAddHabit: () => void;
  onOpenDigest?: () => void;
  onOpenFlow?: () => void;
  onOpenFocusTimer?: (habit?: Habit) => void;
  onOpenGeofence?: (habit?: Habit) => void;
}) {
  const { token } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "time" | "location" | "dwell">("all");

  const load = useCallback(async () => {
    if (!token) return;
    const res = await getHabitsWithStreaks(token);
    setHabits(res.habits);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load, token]);

  useEffect(() => {
    if (!token) return;
    getMyProfile(token)
      .then((res) => setFirstName(res.user.name.split(" ")[0]))
      .catch(() => {});
  }, [token]);

  const filteredHabits = useMemo(() => {
    if (filter === "time") return habits.filter((h) => h.taskType === "time");
    if (filter === "location") return habits.filter((h) => h.taskType === "location");
    if (filter === "dwell") return habits.filter((h) => h.taskType === "location_duration");
    return habits;
  }, [filter, habits]);

  const topHabit = useMemo(() => {
    return habits.reduce<Habit | null>((best, habit) => {
      if (!best || habit.currentStreak > best.currentStreak) return habit;
      return best;
    }, null);
  }, [habits]);

  const todayKey = todayKeyLocal();
  const checkedInToday = useMemo(
    () => habits.filter((h) => h.lastCheckInDateKey === todayKey).length,
    [habits, todayKey]
  );
  const totalCurrentStreakDays = useMemo(
    () => habits.reduce((sum, h) => sum + (h.currentStreak ?? 0), 0),
    [habits]
  );

  // Animations
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.12, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const opacityAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, { toValue: 0.8, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbOpacity, { toValue: 0.4, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    animation.start();
    opacityAnim.start();
    return () => {
      animation.stop();
      opacityAnim.stop();
    };
  }, [orbOpacity, orbScale]);

  return (
    <View style={styles.container}>
      <DotGridBackground />

      <View style={styles.content}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>{greetingForHour(new Date().getHours())}</Text>
            <Text style={styles.headerTitle}>
              {firstName ? `${firstName}'s Dashboard` : "Consistency"}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <LinearGradient colors={["#745600", "#3f2e00"]} style={styles.streakBadge}>
              <MaterialIcons name="whatshot" size={16} color="#fabd00" />
              <Text style={styles.streakBadgeText}>{topHabit?.currentStreak ?? 0}d</Text>
            </LinearGradient>
            <AppButton title="+ Habit" onPress={onAddHabit} variant="primary" style={styles.addButton} />
          </View>
        </View>

        <AnimatedFlatList
          data={filteredHabits}
          keyExtractor={(item: Habit) => item._id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
          ListHeaderComponent={
            habits.length > 0 ? (
              <View style={styles.headerSection}>
                {/* Hero Dashboard Progress Card */}
                <Pressable onPress={onOpenDigest}>
                  <AppCard variant="hero" style={styles.heroCard}>
                  <View style={styles.heroHeader}>
                    <View>
                      <Text style={styles.heroTitle}>Disciplined Momentum</Text>
                      <Text style={styles.heroSubtitle}>Verified proof habits active</Text>
                    </View>
                    <View style={styles.verifiedTag}>
                      <MaterialIcons name="verified" size={14} color="#10B981" />
                      <Text style={styles.verifiedTagText}>PROVED</Text>
                    </View>
                  </View>

                  {/* Central Progress Orb */}
                  <View style={styles.orbArea}>
                    <Animated.View
                      style={[
                        styles.orbGlow,
                        { transform: [{ scale: orbScale }], opacity: orbOpacity },
                      ]}
                    />
                    <LinearGradient
                      colors={["#3f51b5", "#08218a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.orb}
                    >
                      <MaterialIcons name="whatshot" size={32} color="#fabd00" />
                      <Text style={styles.orbValue}>{topHabit?.currentStreak ?? 0}</Text>
                      <Text style={styles.orbLabel}>DAY STREAK</Text>
                    </LinearGradient>
                  </View>

                  {/* Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statCell}>
                      <Text style={styles.statLabel}>COMPLETED TODAY</Text>
                      <Text style={styles.statValue}>
                        {checkedInToday}/{habits.length}
                      </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCell}>
                      <Text style={styles.statLabel}>BEST STREAK</Text>
                      <Text style={styles.statValue}>{topHabit?.bestStreak ?? 0}d</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statCell}>
                      <Text style={styles.statLabel}>TOTAL DAYS</Text>
                      <Text style={styles.statValue}>{totalCurrentStreakDays}d</Text>
                    </View>
                  </View>
                  </AppCard>
                </Pressable>

                {/* Filter Tabs */}
                <View style={styles.filterRow}>
                  <Pressable
                    onPress={() => setFilter("all")}
                    style={[styles.filterPill, filter === "all" && styles.filterPillActive]}
                  >
                    <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
                      All ({habits.length})
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFilter("time")}
                    style={[styles.filterPill, filter === "time" && styles.filterPillActive]}
                  >
                    <MaterialIcons name="alarm" size={14} color={filter === "time" ? colors.primary : colors.outline} />
                    <Text style={[styles.filterText, filter === "time" && styles.filterTextActive]}>Alarm</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFilter("location")}
                    style={[styles.filterPill, filter === "location" && styles.filterPillActive]}
                  >
                    <MaterialIcons name="location-on" size={14} color={filter === "location" ? colors.primary : colors.outline} />
                    <Text style={[styles.filterText, filter === "location" && styles.filterTextActive]}>GPS</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setFilter("dwell")}
                    style={[styles.filterPill, filter === "dwell" && styles.filterPillActive]}
                  >
                    <MaterialIcons name="timer" size={14} color={filter === "dwell" ? colors.primary : colors.outline} />
                    <Text style={[styles.filterText, filter === "dwell" && styles.filterTextActive]}>Dwell</Text>
                  </Pressable>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyStateContainer}>
                <View style={styles.emptyOrbWrapper}>
                  <Animated.View style={[styles.emptyOrbGlow, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
                  <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.emptyOrb}>
                    <MaterialIcons name="add-task" size={40} color={colors.surfaceTint} />
                  </LinearGradient>
                </View>

                <Text style={styles.emptyTitle}>The first step is the hardest.</Text>
                <Text style={styles.emptyText}>
                  No habits set up yet. Create your first commitment — whether a wake-up alarm, gym arrival, or library study session.
                </Text>
                <AppButton title="Create Your First Commitment" onPress={onAddHabit} variant="primary" style={styles.emptyButton} />
              </View>
            ) : null
          }
          renderItem={({ item, index }: { item: Habit; index: number }) => (
            <HabitRow item={item} index={index} onSelectHabit={onSelectHabit} todayKey={todayKey} />
          )}
        />
      </View>
    </View>
  );
}

function HabitRow({
  item,
  index,
  onSelectHabit,
  todayKey,
}: {
  item: Habit;
  index: number;
  onSelectHabit: (habit: Habit) => void;
  todayKey: string;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 400,
      delay: Math.min(index, 6) * 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  const doneToday = item.lastCheckInDateKey === todayKey;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();
  }

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [
          { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          { scale },
        ],
      }}
    >
      <Pressable onPress={() => onSelectHabit(item)} onPressIn={pressIn} onPressOut={pressOut}>
        <AppCard variant="glass" style={styles.habitCard}>
          <View style={styles.habitMainRow}>
            {/* Task Type Icon Badge */}
            <LinearGradient
              colors={doneToday ? ["#10B981", "#047857"] : ["#3f51b5", "#293ca0"]}
              style={styles.habitIconCircle}
            >
              <MaterialIcons name={taskTypeIcon(item)} size={22} color="#FFFFFF" />
            </LinearGradient>

            {/* Habit Details */}
            <View style={styles.habitDetails}>
              <View style={styles.habitTitleRow}>
                <Text style={styles.habitName} numberOfLines={1}>
                  {item.name}
                </Text>
                {doneToday ? (
                  <View style={styles.statusDoneBadge}>
                    <MaterialIcons name="check" size={12} color="#10B981" />
                    <Text style={styles.statusDoneText}>PROVED TODAY</Text>
                  </View>
                ) : (
                  <View style={styles.statusPendingBadge}>
                    <MaterialIcons name="schedule" size={12} color="#fabd00" />
                    <Text style={styles.statusPendingText}>DUE TODAY</Text>
                  </View>
                )}
              </View>

              <Text style={styles.habitMeta}>{taskTypeLabel(item)}</Text>

              {/* Dwell time progress indicator if location_duration */}
              {item.taskType === "location_duration" && (
                <View style={styles.dwellProgressWrap}>
                  <View style={styles.dwellProgressBar}>
                    <View style={[styles.dwellProgressFill, { width: `${Math.min(100, (item.currentDwellMinutes ?? 0) / (item.requiredDurationMinutes ?? 1) * 100)}%` }]} />
                  </View>
                  <Text style={styles.dwellProgressText}>
                    {item.currentDwellMinutes ?? 0}/{item.requiredDurationMinutes}m
                  </Text>
                </View>
              )}
            </View>

            {/* Flame Streak Badge */}
            <View style={styles.streakWrap}>
              <MaterialIcons name="whatshot" size={24} color={item.currentStreak > 0 ? "#fabd00" : colors.outline} />
              <Text style={[styles.streakNumber, item.currentStreak > 0 && styles.streakActive]}>
                {item.currentStreak}
              </Text>
            </View>
          </View>
        </AppCard>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  headerTitle: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(250, 189, 0, 0.3)",
  },
  streakBadgeText: {
    ...typography.bodyMd,
    fontSize: 12,
    fontWeight: "700",
    color: "#fabd00",
  },
  addButton: {
    paddingHorizontal: 14,
  },
  headerSection: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 16,
  },
  heroSubtitle: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  verifiedTagText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: "#10B981",
  },
  orbArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
  },
  orbGlow: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.4)",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.5,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 130,
    height: 130,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.3)",
    elevation: 8,
  },
  orbValue: {
    ...typography.displayOrb,
    fontSize: 40,
    color: colors.onSurface,
    lineHeight: 44,
  },
  orbLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.surfaceTint,
    letterSpacing: 1.5,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: radius.default,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  statCell: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 1,
  },
  statValue: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  filterRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  filterPillActive: {
    backgroundColor: "rgba(63, 81, 181, 0.25)",
    borderColor: "rgba(186, 195, 255, 0.35)",
  },
  filterText: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.outline,
    fontWeight: "500",
  },
  filterTextActive: {
    color: colors.onSurface,
    fontWeight: "700",
  },
  habitCard: {
    marginBottom: spacing.xs,
  },
  habitMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  habitIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  habitDetails: {
    flex: 1,
    gap: 2,
  },
  habitTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  habitName: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 15,
    flex: 1,
  },
  statusDoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusDoneText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: "#10B981",
  },
  statusPendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(250, 189, 0, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusPendingText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: "#fabd00",
  },
  habitMeta: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  dwellProgressWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  dwellProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  dwellProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  dwellProgressText: {
    ...typography.bodyMd,
    fontSize: 11,
    color: colors.outline,
  },
  streakWrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
  },
  streakNumber: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: "700",
    color: colors.outline,
  },
  streakActive: {
    color: "#fabd00",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  emptyOrbWrapper: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyOrbGlow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.3)",
  },
  emptyOrb: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.25)",
  },
  emptyTitle: {
    ...typography.headlineLgMobile,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  emptyText: {
    ...typography.bodyMd,
    textAlign: "center",
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
    maxWidth: 320,
  },
  emptyButton: {
    width: "100%",
    maxWidth: 320,
  },
});