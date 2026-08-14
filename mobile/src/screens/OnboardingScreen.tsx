import React, { useEffect, useRef } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Animated, Easing, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

type OnboardingScreenProps = {
  onContinue: () => void;
};

export function OnboardingScreen({ onContinue }: OnboardingScreenProps) {
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const scale = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.12,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const opacity = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, {
          toValue: 0.75,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.45,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scale.start();
    opacity.start();

    return () => {
      scale.stop();
      opacity.stop();
    };
  }, [orbOpacity, orbScale]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.orbWrap}>
              <Animated.View
                style={[
                  styles.orbGlow,
                  {
                    transform: [{ scale: orbScale }],
                    opacity: orbOpacity,
                  },
                ]}
              />
              <LinearGradient
                colors={["#3f51b5", "#08218a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.orb}
              >
                <MaterialIcons name="verified-user" size={36} color={colors.surfaceTint} />
              </LinearGradient>
            </View>

            <Text style={styles.kicker}>THE VERIFICATION ENGINE</Text>
            <Text style={styles.title}>Prove you did it.{"\n"}Don't just check a box.</Text>
            <Text style={styles.subtitle}>
              Existing habit trackers rely on honor system taps. Consistency adds real proof: location, camera, and AI buddy verification.
            </Text>
          </View>

          <AppCard variant="glass" style={styles.card}>
            <View style={styles.valueRow}>
              <LinearGradient colors={["#fabd00", "#745600"]} style={styles.iconCircle}>
                <MaterialIcons name="whatshot" size={22} color="#261a00" />
              </LinearGradient>
              <View style={styles.valueTextGroup}>
                <Text style={styles.valueTitle}>True Streak Proof</Text>
                <Text style={styles.valueDescription}>
                  GPS & photo evidence guarantee that your streaks represent genuine hard work and real effort.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.valueRow}>
              <LinearGradient colors={["#3f51b5", "#293ca0"]} style={styles.iconCircle}>
                <MaterialIcons name="people-alt" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.valueTextGroup}>
                <Text style={styles.valueTitle}>Buddy Review Layer</Text>
                <Text style={styles.valueDescription}>
                  AI pre-screens your proof. If flagged or ambiguous, your paired accountability buddy signs off.
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.valueRow}>
              <LinearGradient colors={["#10B981", "#047857"]} style={styles.iconCircle}>
                <MaterialIcons name="timer" size={22} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.valueTextGroup}>
                <Text style={styles.valueTitle}>Dwell & Alarm Triggers</Text>
                <Text style={styles.valueDescription}>
                  Auto-detect arrival at gym/library for required dwell duration, or wake up to blaring proof-silenced alarms.
                </Text>
              </View>
            </View>
          </AppCard>

          <View style={styles.actionWrap}>
            <AppButton title="Get Started — Prove It" onPress={onContinue} variant="primary" style={styles.button} />
            <Text style={styles.disclaimer}>No credit card required • Solo or buddy mode</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.lg,
  },
  header: {
    alignItems: "center",
    gap: spacing.xs,
    width: "100%",
  },
  orbWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
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
    width: 120,
    height: 120,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.3)",
    elevation: 10,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    letterSpacing: 2,
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
    lineHeight: 34,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 330,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  card: {
    width: "100%",
    gap: spacing.md,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  valueTextGroup: {
    flex: 1,
    gap: 2,
  },
  valueTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  valueDescription: {
    ...typography.bodyMd,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurfaceVariant,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  actionWrap: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xs,
  },
  button: {
    width: "100%",
  },
  disclaimer: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.outline,
  },
});