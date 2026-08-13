import { useEffect, useRef } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from "react-native";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

export function SplashScreen() {
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;
  const orbLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.12,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const opacityAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(orbOpacity, {
          toValue: 0.75,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbOpacity, {
          toValue: 0.45,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(orbLift, {
          toValue: -10,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbLift, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();
    opacityAnim.start();
    float.start();

    return () => {
      pulse.stop();
      opacityAnim.stop();
      float.stop();
    };
  }, [orbLift, orbOpacity, orbScale]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <View style={styles.container}>
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
          <Animated.View
            style={[
              styles.orb,
              {
                transform: [
                  { scale: orbScale },
                  { translateY: orbLift },
                ],
              },
            ]}
          >
            <View style={styles.orbSurface}>
              <MaterialIcons name="auto-awesome" size={28} color={colors.onPrimaryContainer} />
            </View>
          </Animated.View>
        </View>

        <View style={styles.branding}>
          <Text style={styles.appTitle}>Consistency</Text>
          <Text style={styles.appSubtitle}>Disciplined Serenity</Text>
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
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.marginEdge,
  },
  orbWrap: {
    width: 192,
    height: 192,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  orbGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    opacity: 0.5,
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 168,
    height: 168,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  orbSurface: {
    width: 136,
    height: 136,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  branding: {
    alignItems: "center",
    gap: spacing.xs,
  },
  appTitle: {
    ...typography.labelCaps,
    color: colors.onSurface,
    letterSpacing: 12,
    textTransform: "uppercase",
  },
  appSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});