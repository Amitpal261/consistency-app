import React, { useEffect, useRef } from "react";
import { Animated, Easing, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

export function SplashScreen() {
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbGlowOpacity = useRef(new Animated.Value(0.4)).current;
  const orbLift = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, {
          toValue: 1.15,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbScale, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowOpacity = Animated.loop(
      Animated.sequence([
        Animated.timing(orbGlowOpacity, {
          toValue: 0.8,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbGlowOpacity, {
          toValue: 0.4,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(orbLift, {
          toValue: -12,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(orbLift, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const revealText = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 1200,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 1200,
        delay: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]);

    pulse.start();
    glowOpacity.start();
    float.start();
    revealText.start();

    return () => {
      pulse.stop();
      glowOpacity.stop();
      float.stop();
    };
  }, [orbGlowOpacity, orbLift, orbScale, textOpacity, textTranslateY]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <View style={styles.container}>
        {/* Central Orb Container */}
        <View style={styles.orbWrap}>
          {/* Outer Atmospheric Gaussian Glow */}
          <Animated.View
            style={[
              styles.orbOuterGlow,
              {
                transform: [{ scale: orbScale }],
                opacity: orbGlowOpacity,
              },
            ]}
          />
          {/* Secondary Layer Glow */}
          <Animated.View
            style={[
              styles.orbInnerGlow,
              {
                transform: [{ scale: orbScale }],
                opacity: Animated.multiply(orbGlowOpacity, 0.6),
              },
            ]}
          />

          {/* Central Main Orb Surface */}
          <Animated.View
            style={[
              styles.orb,
              {
                transform: [{ scale: orbScale }, { translateY: orbLift }],
              },
            ]}
          >
            <LinearGradient
              colors={["#3f51b5", "#08218a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbGradient}
            >
              <View style={styles.orbRefraction}>
                <MaterialIcons name="auto-awesome" size={32} color={colors.surfaceTint} />
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Branding Typography */}
        <Animated.View
          style={[
            styles.branding,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          <Text style={styles.appTitle}>CONSISTENCY</Text>
          <Text style={styles.appSubtitle}>Disciplined Serenity</Text>
        </Animated.View>
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
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  orbOuterGlow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.45)",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.6,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
  },
  orbInnerGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: radius.full,
    backgroundColor: "rgba(186, 195, 255, 0.3)",
    shadowColor: colors.surfaceTint,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 144,
    height: 144,
    borderRadius: radius.full,
    shadowColor: colors.surfaceTint,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.25)",
    overflow: "hidden",
  },
  orbGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  orbRefraction: {
    width: 112,
    height: 112,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  branding: {
    alignItems: "center",
    gap: spacing.xs,
  },
  appTitle: {
    ...typography.labelCaps,
    color: colors.onSurface,
    fontSize: 14,
    letterSpacing: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  appSubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    opacity: 0.6,
    textAlign: "center",
    letterSpacing: 1.2,
    marginTop: spacing.xs,
  },
});