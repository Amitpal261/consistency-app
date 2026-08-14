import React, { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

export function GeofenceArrivalScreen({
  habitName = "Gym Arrival Session",
  radiusMeters = 150,
  onCheckIn,
  onCancel,
}: {
  habitName?: string;
  radiusMeters?: number;
  onCheckIn?: () => void;
  onCancel?: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerBack}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Geofence Location Arrival</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.container}>
        {/* Geofence Radar Pulse Orb */}
        <View style={styles.orbWrap}>
          <View style={styles.orbGlow} />
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.orb}>
            <MaterialIcons name="my-location" size={44} color={colors.surfaceTint} />
          </LinearGradient>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.kicker}>GEOFENCE DETECTED</Text>
          <Text style={styles.title}>Inside Target Zone</Text>
          <Text style={styles.subtitle}>
            Your phone GPS coordinates match the <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{habitName}</Text> {radiusMeters}m geofence radius.
          </Text>
        </View>

        {/* Location Status Card */}
        <AppCard variant="hero" style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="location-on" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{habitName}</Text>
              <Text style={styles.cardSub}>GPS Accuracy: High • Radius: {radiusMeters}m</Text>
            </View>
            <View style={styles.activeBadge}>
              <Text style={styles.activeText}>INSIDE ZONE</Text>
            </View>
          </View>

          <AppButton
            title="Complete Geofence Check-In"
            onPress={onCheckIn || (() => {})}
            variant="primary"
            icon={<MaterialIcons name="check-circle" size={20} color="#FFFFFF" />}
            style={{ width: "100%", marginTop: spacing.xs }}
          />
        </AppCard>
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
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  orbWrap: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.35)",
  },
  orb: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.25)",
    elevation: 10,
  },
  titleArea: {
    alignItems: "center",
    gap: 4,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
  },
  card: {
    width: "100%",
    gap: spacing.sm,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 15,
  },
  cardSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  activeBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: "#10B981",
  },
});
