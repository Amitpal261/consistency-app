import { useEffect, useRef } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import DotGridBackground from "../components/DotGridBackground";
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
      ]),
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
      ]),
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
              <View style={styles.orb}>
                <MaterialIcons name="verified" size={32} color={colors.onPrimaryContainer} />
              </View>
            </View>
            <Text style={styles.title}>Disciplined Serenity</Text>
            <Text style={styles.subtitle}>
              Build streaks that matter with verified accountability and simple progress.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.valueRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="whatshot" size={20} color={colors.onSurface} />
              </View>
              <View style={styles.valueTextGroup}>
                <Text style={styles.valueTitle}>Streak momentum</Text>
                <Text style={styles.valueDescription}>
                  Keep your daily progress visible and rewarded with consistent habit streaks.
                </Text>
              </View>
            </View>

            <View style={styles.valueRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="people" size={20} color={colors.onSurface} />
              </View>
              <View style={styles.valueTextGroup}>
                <Text style={styles.valueTitle}>Buddy verification</Text>
                <Text style={styles.valueDescription}>
                  Share accountability with a trusted buddy and verify each check-in together.
                </Text>
              </View>
            </View>

            <View style={styles.valueRow}>
              <View style={styles.iconCircle}>
                <MaterialIcons name="check-circle" size={20} color={colors.onSurface} />
              </View>
              <View style={styles.valueTextGroup}>
                <Text style={styles.valueTitle}>Focus with purpose</Text>
                <Text style={styles.valueDescription}>
                  Turn intention into action with reliably tracked habits and gentle reminders.
                </Text>
              </View>
            </View>
          </View>

          <Pressable onPress={onContinue} style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}>
            <Text style={styles.actionButtonText}>Get Started</Text>
          </Pressable>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xl,
  },
  header: {
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
  },
  orbWrap: {
    width: 152,
    height: 152,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  orbGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    opacity: 0.25,
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 36,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 152,
    height: 152,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    shadowColor: colors.surfaceContainerLowest,
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  valueTextGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  valueTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  valueDescription: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs / 2,
  },
  actionButton: {
    width: "100%",
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  actionButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  actionButtonText: {
    ...typography.headlineLgMobile,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onPrimaryContainer,
  },
});