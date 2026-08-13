import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, RefreshControl, StyleSheet, Text, View, TouchableWithoutFeedback } from "react-native";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList as any);
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getHabitsWithStreaks, type Habit } from "../lib/api";
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

export function HomeScreen({ onSelectHabit, onAddHabit }: { onSelectHabit: (habit: Habit) => void; onAddHabit: () => void }) {
  const { token } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const res = await getHabitsWithStreaks(token);
    setHabits(res.habits);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const topHabit = useMemo(() => {
    return habits.reduce<Habit | null>((best, habit) => {
      if (!best || habit.currentStreak > best.currentStreak) return habit;
      return best;
    }, null);
  }, [habits]);

  // Animations
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.85)).current;
  const orbGlowScale = useRef(new Animated.Value(1)).current;
  const cardEntrance = useRef(new Animated.Value(0)).current;
  const currentDayPulse = useRef(new Animated.Value(1)).current;

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

    // Card entrance animation
    Animated.timing(cardEntrance, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    // Current-day heatmap pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(currentDayPulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(currentDayPulse, { toValue: 1.0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [orbScale, orbOpacity, orbGlowScale, cardEntrance, currentDayPulse]);

  // touch handlers (small nudge on press)
  const onOrbPressIn = () => {
    Animated.spring(touchNudge, { toValue: { x: -6, y: -6 }, useNativeDriver: true }).start();
  };
  const onOrbPressOut = () => {
    Animated.spring(touchNudge, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
  };

  // Heatmap sample data (35 cells: 5 weeks x 7 days)
  const heatmap = useMemo(() => {
    // Derive simplistic intensity from habit counts if available; otherwise fallback to mock pattern
    const values: number[] = [];
    for (let i = 0; i < 35; i++) {
      // map some variation using modulo and habit counts
      const base = habits.length ? (habits.length + (i % 5)) % 5 : (i % 5);
      values.push(base);
    }
    return values;
  }, [habits]);

  // helpers for color intensity
  const heatColor = (level: number) => {
    // level 0..4 produce colors from muted to full primary
    switch (level) {
      case 0:
        return "rgba(255,255,255,0.03)";
      case 1:
        return "rgba(186,195,255,0.14)";
      case 2:
        return "rgba(186,195,255,0.28)";
      case 3:
        return "rgba(186,195,255,0.56)";
      default:
        return "rgba(186,195,255,0.9)";
    }
  };

  return (
    <View style={styles.container}>
      {/* Dot grid background (design reference uses a subtle radial dot pattern) */}
      <DotGridBackground />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={typography.h1}>Your habits</Text>
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
          ListHeaderComponent={habits.length > 0 ? (
            <View>
              {/* Streak Progress Orb + summary */}
              <AppCard style={styles.progressCard}>
                <Text style={styles.progressHeader}>Streak progress</Text>
                <Text style={styles.progressSubheader}>Track your momentum, one verified streak at a time.</Text>

                <View style={styles.orbArea}>
                  <Animated.View
                    style={[
                      styles.orbGlow,
                      {
                        transform: [{ scale: orbGlowScale } as any],
                        opacity: orbOpacity,
                      },
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

                {/* Summary cards row (animated entrance) */}
                <Animated.View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: spacing.md,
                    opacity: cardEntrance,
                    transform: [
                      {
                        translateY: cardEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) as any,
                      },
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

              {/* Activity History / heatmap */}
              <AppCard style={styles.heatmapCard}>
                <View style={styles.heatmapHeaderRow}>
                  <Text style={styles.heatmapHeader}>Activity History</Text>
                  <View style={styles.heatmapLegendRow}>
                    <View style={[styles.legendDot, { backgroundColor: heatColor(1) }]} />
                    <View style={[styles.legendDot, { backgroundColor: heatColor(3) }]} />
                    <View style={[styles.legendDot, { backgroundColor: heatColor(4) }]} />
                  </View>
                </View>

                <View style={styles.heatmapGrid}>
                  {heatmap.map((v: number, i: number) => {
                    const isCurrent = i === heatmap.length - 1;
                    if (isCurrent) {
                      return (
                        <Animated.View
                          key={`cell-${i}`}
                          style={[styles.heatCell, { backgroundColor: heatColor(v), opacity: currentDayPulse }]}
                        />
                      );
                    }
                    return <View key={`cell-${i}`} style={[styles.heatCell, { backgroundColor: heatColor(v) }]} />;
                  })}
                </View>

                <View style={styles.heatmapFooter}>
                  <View>
                    <Text style={styles.heatmapFooterLabel}>NEXT MILESTONE</Text>
                    <Text style={styles.heatmapFooterValue}>30 DAYS</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.heatmapFooterLabel}>PERCENTAGE</Text>
                    <Text style={styles.heatmapFooterValueSecondary}>94%</Text>
                  </View>
                </View>
              </AppCard>

              {/* Pills row */}
              <View style={styles.pillsRow}>
                <AppCard style={styles.pillCard}>
                  <View style={styles.pillInner}>
                    <View style={styles.pillIconWrap}>
                      <MaterialIcons name="verified" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.pillLabel}>STATUS</Text>
                      <Text style={styles.pillValue}>Verified</Text>
                    </View>
                  </View>
                </AppCard>

                <AppCard style={styles.pillCard}>
                  <View style={styles.pillInner}>
                    <View style={styles.pillIconWrapAlt}>
                      <MaterialIcons name="schedule" size={18} color={colors.tertiary} />
                    </View>
                    <View>
                      <Text style={styles.pillLabel}>AVERAGE</Text>
                      <Text style={styles.pillValue}>06:15 AM</Text>
                    </View>
                  </View>
                </AppCard>
              </View>
            </View>
          ) : null}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Animated.View style={[styles.emptyOrbWrapper, { opacity: cardEntrance }]}> 
                <Animated.View style={[styles.emptyOrbGlow, { transform: [{ scale: orbGlowScale } as any], opacity: orbOpacity }]} />
                <Animated.View style={[styles.emptyOrb, { transform: [{ scale: orbScale } as any] }] }>
                  <MaterialIcons name={"offline_bolt" as any} size={32} color={colors.onPrimaryContainer} />
                </Animated.View>
              </Animated.View>

              <Text style={styles.emptyTitle}>The first step is the hardest.</Text>
              <Text style={styles.emptyText}>
                Empty space is just room for your future self to grow. Start by defining one simple habit today.
              </Text>
              <AppButton title="Create Your First Commitment" onPress={onAddHabit} style={styles.emptyButton} />

              <View style={styles.emptyStatsRow}>
                <AppCard style={styles.emptyStatCard}>
                  <Text style={styles.emptyStatValue}>0</Text>
                  <Text style={styles.emptyStatLabel}>Active commitments</Text>
                </AppCard>
                <AppCard style={styles.emptyStatCard}>
                  <Text style={styles.emptyStatValue}>--</Text>
                  <Text style={styles.emptyStatLabel}>Next verification</Text>
                </AppCard>
              </View>
            </View>
          }
          renderItem={({ item }: { item: Habit }) => (
            <AppCard
              onTouchEnd={() => onSelectHabit(item)}
              style={styles.habitCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={typography.h2}>{item.name}</Text>
                <Text style={typography.label}>{taskTypeLabel(item).toUpperCase()}</Text>
                <Text style={[typography.body, { marginTop: spacing.xs }]}>Best: {item.bestStreak} days</Text>
              </View>
              <View style={styles.habitStreakContainer}>
                <Text style={styles.flameIcon}>🔥</Text>
                <Text style={[styles.streakValue, { color: flameColor(item.currentStreak) }]}>{item.currentStreak}</Text>
              </View>
            </AppCard>
          )}
        />
      </View>
    </View>
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
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  progressCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 0, // Remove border for a cleaner look
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
  heatmapCard: {
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  heatmapHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  heatmapHeader: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
  },
  heatmapLegendRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heatmapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: CELL_SIZE * 7 + spacing.sm * 6,
  },
  heatCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  heatmapFooter: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  heatmapFooterLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  heatmapFooterValue: {
    ...typography.timerNumeric,
    color: colors.primary,
  },
  heatmapFooterValueSecondary: {
    ...typography.timerNumeric,
    color: colors.tertiary,
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
  emptyStatsRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  emptyStatCard: {
    flex: 1,
    padding: spacing.sm,
    alignItems: "center",
  },
  emptyStatValue: {
    ...typography.timerNumeric,
    color: colors.primaryFixed,
  },
  emptyStatLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
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