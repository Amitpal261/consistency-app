import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, RefreshControl, StyleSheet, Text, View, TouchableWithoutFeedback } from "react-native";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, getMyProfile, type Habit } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

function flameColor(streak: number) {
  if (streak >= 14) return colors.accent;
  if (streak >= 3) return colors.warning;
  return colors.textMuted;
}

function taskTypeLabel(habit: Habit): string {
  if (habit.taskType === "time" && habit.timeWindow) {
    const h = String(habit.timeWindow.hour).padStart(2, "0");
    const m = String(habit.timeWindow.minute).padStart(2, "0");
    return `Daily at ${h}:${m}`;
  }
  if (habit.taskType === "location_duration") return `${habit.requiredDurationMinutes ?? 0} min at location`;
  return "Location check-in";
}

// Matches the backend's YYYY-MM-DD date-key format closely enough for a
// cosmetic "checked in today" indicator (backend uses the user's stored
// timezone; this uses the device's local timezone — fine for a UI hint,
// not used for anything that affects streak logic itself).
function todayKeyLocal(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Still up?";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export function HomeScreen({ onSelectHabit, onAddHabit }: { onSelectHabit: (habit: Habit) => void; onAddHabit: () => void }) {
  const { token } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);

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
  const orbOpacity = useRef(new Animated.Value(0.85)).current;
  const orbGlowScale = useRef(new Animated.Value(1)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;

  // Parallax / touch nudges
  const scrollY = useRef(new Animated.Value(0)).current;
  const touchNudge = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    // Orb pulse: scale + opacity loop
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.12, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 1.0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orbOpacity, { toValue: 1.0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(orbOpacity, { toValue: 0.85, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orbGlowScale, { toValue: 1.15, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(orbGlowScale, { toValue: 1.0, duration: 3500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
      ])
    ).start();

    Animated.timing(cardEntrance, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [orbScale, orbOpacity, orbGlowScale, cardEntrance]);

  const onOrbPressIn = () => {
    Animated.spring(touchNudge, { toValue: { x: -6, y: -6 }, useNativeDriver: true }).start();
  };
  const onOrbPressOut = () => {
    Animated.spring(touchNudge, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.container}>
      <DotGridBackground />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>
              {greetingForHour(new Date().getHours())}
              {firstName ? `, ${firstName}` : ""}
            </Text>
            <Text style={typography.h1}>Your habits</Text>
          </View>
          <AppButton title="+ Add" onPress={onAddHabit} style={{ paddingHorizontal: spacing.md }} />
        </View>

        <AnimatedFlatList
          data={habits}
          keyExtractor={(item: Habit) => item._id}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
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
              <View>
                <AppCard style={styles.progressCard}>
                  <Text style={styles.progressHeader}>Streak progress</Text>
                  <Text style={styles.progressSubheader}>Track your momentum, one verified streak at a time.</Text>

                  <View style={styles.orbArea}>
                    <Animated.View
                      style={[
                        styles.orbGlow,
                        { transform: [{ scale: orbGlowScale } as any], opacity: orbOpacity },
                      ]}
                    />
                    <TouchableWithoutFeedback onPressIn={onOrbPressIn} onPressOut={onOrbPressOut}>
                      <Animated.View
                        style={[
                          styles.orb,
                          {
                            transform: [
                              { translateY: Animated.add(Animated.multiply(scrollY, -0.03), touchNudge.y) as any },
                              { translateX: touchNudge.x as any },
                              { scale: orbScale } as any,
                            ],
                          },
                        ]}
                      >
                        <MaterialIcons name="whatshot" size={28} color={colors.onPrimaryContainer} />
                        <Text style={styles.orbValue}>{topHabit?.currentStreak ?? 0}</Text>
                        <Text style={styles.orbLabel}>Top streak</Text>
                      </Animated.View>
                    </TouchableWithoutFeedback>
                  </View>

                  <Animated.View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: spacing.md,
                      opacity: cardEntrance,
                      transform: [
                        { translateY: cardEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) as any },
                      ],
                    }}
                  >
                    <AppCard style={styles.summaryCard}>
                      <Text style={styles.summaryLabel}>Active habits</Text>
                      <Text style={styles.summaryValue}>{habits.length}</Text>
                    </AppCard>
                    <AppCard style={[styles.summaryCard, { marginLeft: spacing.sm }]}>
                      <Text style={styles.summaryLabel}>Best streak</Text>
                      <Text style={styles.summaryValue}>{topHabit?.bestStreak ?? 0}</Text>
                    </AppCard>
                  </Animated.View>
                </AppCard>

                {/* Real "today" summary — replaces the previous mock heatmap/percentage,
                    which showed randomly-generated cells and a hardcoded 94%/06:15 AM
                    that had no connection to actual data. */}
                <View style={styles.pillsRow}>
                  <AppCard style={styles.pillCard}>
                    <View style={styles.pillInner}>
                      <View style={styles.pillIconWrap}>
                        <MaterialIcons name="check-circle" size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.pillLabel}>TODAY</Text>
                        <Text style={styles.pillValue}>
                          {checkedInToday}/{habits.length} done
                        </Text>
                      </View>
                    </View>
                  </AppCard>

                  <AppCard style={styles.pillCard}>
                    <View style={styles.pillInner}>
                      <View style={styles.pillIconWrapAlt}>
                        <MaterialIcons name="local-fire-department" size={18} color={colors.tertiary} />
                      </View>
                      <View>
                        <Text style={styles.pillLabel}>COMBINED STREAK</Text>
                        <Text style={styles.pillValue}>{totalCurrentStreakDays} days</Text>
                      </View>
                    </View>
                  </AppCard>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            // Guarded by `loading` so existing users don't see a flash of
            // "you have 0 habits" while their real data is still loading.
            !loading ? (
              <View style={styles.emptyStateContainer}>
                <Animated.View style={[styles.emptyOrbWrapper, { opacity: cardEntrance }]}>
                  <Animated.View style={[styles.emptyOrbGlow, { transform: [{ scale: orbGlowScale } as any], opacity: orbOpacity }]} />
                  <Animated.View style={[styles.emptyOrb, { transform: [{ scale: orbScale } as any] }]}>
                    <MaterialIcons name={"offline_bolt" as any} size={32} color={colors.onPrimaryContainer} />
                  </Animated.View>
                </Animated.View>

                <Text style={styles.emptyTitle}>The first step is the hardest.</Text>
                <Text style={styles.emptyText}>
                  Empty space is just room for your future self to grow. Start by defining one simple habit today.
                </Text>
                <AppButton title="Create Your First Commitment" onPress={onAddHabit} style={styles.emptyButton} />
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

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 6) * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  const doneToday = item.lastCheckInDateKey === todayKey;

  return (
    <Animated.View
      style={{
        opacity: entrance,
        transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <AppCard onTouchEnd={() => onSelectHabit(item)} style={styles.habitCard}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={typography.h2}>{item.name}</Text>
            {doneToday ? <MaterialIcons name="check-circle" size={16} color={colors.success} /> : null}
          </View>
          <Text style={typography.label}>{taskTypeLabel(item).toUpperCase()}</Text>
          <Text style={[typography.body, { marginTop: spacing.xs }]}>Best: {item.bestStreak} days</Text>
        </View>
        <View style={styles.habitStreakContainer}>
          <Text style={styles.flameIcon}>🔥</Text>
          <Text style={[styles.streakValue, { color: flameColor(item.currentStreak) }]}>{item.currentStreak}</Text>
        </View>
      </AppCard>
    </Animated.View>
  );
}

const CELL_SIZE = 24;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  progressCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 0,
  },
  progressHeader: {
    ...typography.h2,
    marginBottom: spacing.xs,
    color: colors.onSurface,
  },
  progressSubheader: {
    ...typography.bodyMd,
    marginBottom: spacing.md,
    color: colors.onSurfaceVariant,
  },
  orbArea: {
    alignItems: "center",
    justifyContent: "center",
    height: 180,
  },
  orbGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
  },
  orb: {
    width: 140,
    height: 140,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh || colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
    zIndex: 2,
  },
  orbValue: {
    ...typography.displayOrb,
    color: colors.onSurface,
    marginTop: spacing.sm,
  },
  orbLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.md,
  },
  summaryLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    ...typography.timerNumeric,
    color: colors.primary,
  },
  pillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pillCard: {
    flex: 1,
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  pillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pillIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(186,195,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillIconWrapAlt: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(250,189,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  pillLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  pillValue: {
    ...typography.bodyMd,
    fontWeight: "600",
    color: colors.onSurface,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  emptyOrbWrapper: {
    width: 184,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyOrbGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: colors.primaryContainer,
    opacity: 0.16,
  },
  emptyOrb: {
    width: 140,
    height: 140,
    borderRadius: 140,
    backgroundColor: colors.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    ...typography.h2,
    textAlign: "center",
    color: colors.onSurface,
    marginBottom: spacing.sm,
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
  habitCard: {
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  habitStreakContainer: {
    alignItems: "center",
  },
  flameIcon: {
    fontSize: 28,
  },
  streakValue: {
    fontWeight: "800",
    fontSize: 20,
  },
});