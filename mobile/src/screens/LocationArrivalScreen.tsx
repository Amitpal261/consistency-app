import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
// Use MapLibre where available. Require dynamically so missing native module doesn't crash the app.
let MapLibreGL: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapLibreGL = require('@maplibre/maplibre-react-native');
} catch (e) {
  MapLibreGL = undefined;
  // eslint-disable-next-line no-console
  console.warn('MapLibre native module not available', e);
}

import type { Region } from "react-native-maps"; // keep Region type for calculations
import { useAuth } from "../context/AuthContext";
import { submitCheckIn, type Habit } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

function colorWithAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function todayKeyLocal(): string {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m remaining`;
  return `${(meters / 1000).toFixed(2)} km remaining`;
}

function secondsToHHMMSS(sec: number) {
  if (sec <= 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getArrivalDeadline(habit: Habit): { hour: number; minute: number } | null {
  if (habit.timeWindow?.hour != null && habit.timeWindow?.minute != null) {
    return { hour: habit.timeWindow.hour, minute: habit.timeWindow.minute };
  }
  if (habit.locationDeadline?.hour != null && habit.locationDeadline?.minute != null) {
    return { hour: habit.locationDeadline.hour, minute: habit.locationDeadline.minute };
  }
  return null;
}

function buildMapRegion(
  target: { lat: number; lng: number },
  user: { lat: number; lng: number } | null,
  radiusMeters: number
): Region {
  const userLat = user?.lat ?? target.lat;
  const userLng = user?.lng ?? target.lng;
  const minLat = Math.min(target.lat, userLat);
  const maxLat = Math.max(target.lat, userLat);
  const minLng = Math.min(target.lng, userLng);
  const maxLng = Math.max(target.lng, userLng);
  const radiusDelta = (radiusMeters / 111_000) * 5;
  const latitudeDelta = Math.max((maxLat - minLat) * 2.8, radiusDelta, 0.006);
  const longitudeDelta = Math.max((maxLng - minLng) * 2.8, radiusDelta, 0.006);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}


function createGeoJSONCircle(lat: number, lng: number, radiusMeters: number, points = 64) {
  const coords: Array<[number, number]> = [];
  const R = 6371000; // earth radius in meters
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const d = radiusMeters / R;
  for (let i = 0; i < points; i++) {
    const bearing = (i / points) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(bearing));
    const lng2 = lngRad + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(latRad), Math.cos(d) - Math.sin(latRad) * Math.sin(lat2));
    coords.push([lng2 * (180 / Math.PI), lat2 * (180 / Math.PI)]);
  }
  if (coords.length > 0) coords.push(coords[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

function HabitMap({
  region,
  habitLocation,
  position,
}: {
  region: Region;
  habitLocation: { lat: number; lng: number; radiusMeters: number };
  position: Location.LocationObject | null;
}) {
  if (Platform.OS === "web") {
    return (
      <View style={[StyleSheet.absoluteFill, styles.webMapFallback]}>
        <MaterialIcons name="map" size={64} color={colors.onSurfaceVariant} />
        <Text style={styles.webMapText}>Map preview unavailable on web — use the Android dev build.</Text>
      </View>
    );
  }

  // If MapLibre is available, render it. Otherwise show a placeholder instructing to rebuild.
  // v11 named-export API: Map (not MapView), Camera uses initialViewState
  // instead of centerCoordinate/zoomLevel props directly.
 if (
  MapLibreGL &&
  MapLibreGL.Map &&
  MapLibreGL.Camera &&
  MapLibreGL.ShapeSource &&
  MapLibreGL.FillLayer &&
  MapLibreGL.LineLayer &&
  MapLibreGL.ViewAnnotation
)  {
    return (
      <MapLibreGL.Map style={StyleSheet.absoluteFill} mapStyle={"https://tiles.openfreemap.org/styles/liberty"}>
        <MapLibreGL.Camera
          initialViewState={{ center: [habitLocation.lng, habitLocation.lat], zoom: 15 }}
        />

        <MapLibreGL.ShapeSource id="circleSource" shape={createGeoJSONCircle(habitLocation.lat, habitLocation.lng, habitLocation.radiusMeters)}>
          <MapLibreGL.FillLayer id="circleFill" style={{ fillColor: colorWithAlpha(colors.primaryContainer, 0.18) }} />
          <MapLibreGL.LineLayer id="circleStroke" style={{ lineColor: colorWithAlpha(colors.primary, 0.45), lineWidth: 1 }} />
        </MapLibreGL.ShapeSource>

        <MapLibreGL.ViewAnnotation lngLat={[habitLocation.lng, habitLocation.lat]}>
          <View style={styles.targetMarker} />
        </MapLibreGL.ViewAnnotation>

        {position && (
          <MapLibreGL.ViewAnnotation lngLat={[position.coords.longitude, position.coords.latitude]}>
            <View style={styles.youMarker} />
          </MapLibreGL.ViewAnnotation>
        )}
      </MapLibreGL.Map>
    );
  }

  // Fallback placeholder when MapLibre is not linked.
  return (
    <View style={[StyleSheet.absoluteFill, styles.mapPlaceholderCenter]}>
      <MaterialIcons name="map" size={48} color={colors.onSurfaceVariant} />
      <Text style={{ color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
        Map unavailable — native map module not linked.\nRun a native build (expo prebuild / expo run:android) to enable the map view.
      </Text>
    </View>
  );
}

export function LocationArrivalScreen({
  habit,
  onCheckIn,
  onCancel,
}: {
  habit: Habit;
  onCheckIn?: () => void;
  onCancel?: () => void;
}) {
  const { token } = useAuth();
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseOuter = useRef(new Animated.Value(1)).current;
  const pulseInner = useRef(new Animated.Value(1)).current;

  const arrivalDeadline = useMemo(() => getArrivalDeadline(habit), [habit]);
  // The background geofence task (geofence.ts) may have already auto-submitted
  // today's check-in before the user even opened this screen — recognize
  // that instead of confusingly showing "head to destination" for a habit
  // that's already done, which would 409 if they tapped Confirm again.
  const alreadyDoneToday = habit.lastCheckInDateKey === todayKeyLocal();

  const mapRegion = useMemo(() => {
    if (!habit.location) return null;
    return buildMapRegion(
      habit.location,
      position ? { lat: position.coords.latitude, lng: position.coords.longitude } : null,
      habit.location.radiusMeters
    );
  }, [habit.location, position]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOuter, { toValue: 1.08, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseOuter, { toValue: 0.92, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    const loopInner = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseInner, { toValue: 1.12, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseInner, { toValue: 0.88, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    loopInner.start();
    return () => {
      loop.stop();
      loopInner.stop();
    };
  }, [pulseOuter, pulseInner]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (mounted) setPosition(pos);
      } catch (e) {
        console.warn("Location init failed", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      try {
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 2, timeInterval: 2000 },
          (pos) => setPosition(pos)
        );
      } catch (e) {
        console.warn("watchPosition failed", e);
      }
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!position || !habit.location) {
      setDistanceMeters(null);
      return;
    }
    setDistanceMeters(
      haversineDistance(position.coords.latitude, position.coords.longitude, habit.location.lat, habit.location.lng)
    );
  }, [position, habit.location]);

  useEffect(() => {
    if (!arrivalDeadline) {
      setRemainingSeconds(null);
      return;
    }

    function compute() {
      const now = new Date();
      const target = new Date(now);
      target.setHours(arrivalDeadline!.hour, arrivalDeadline!.minute, 0, 0);
      setRemainingSeconds(Math.floor((target.getTime() - now.getTime()) / 1000));
    }

    compute();
    timerRef.current = setInterval(compute, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [arrivalDeadline]);

  const handleManualCheckIn = async () => {
    if (!token || !habit) return;
    setSubmitting(true);
    try {
      if (!position) {
        Alert.alert("Location unavailable", "Could not get current location to submit check-in.");
        return;
      }
      const res = await submitCheckIn(token, {
        habitId: habit._id,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy ?? undefined,
        },
      });
      Alert.alert(res.reviewStatus === "pending" ? "Sent for review" : "Check-in complete");
      onCheckIn?.();
    } catch (err) {
      Alert.alert("Check-in failed", err instanceof Error ? err.message : "Failed to submit check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const missed = remainingSeconds !== null && remainingSeconds <= 0;

  if (alreadyDoneToday) {
    return (
      <SafeAreaView style={[styles.root, { alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.marginEdge }]}>
        <MaterialIcons name="check-circle" size={56} color={colors.success} />
        <Text style={[typography.h1, { textAlign: "center" }]}>Already checked in today</Text>
        <Text style={[typography.bodyMd, { textAlign: "center" }]}>
          Looks like this was picked up automatically when you arrived — nice work.
        </Text>
        <AppButton title="Done" onPress={() => onCheckIn?.()} style={{ width: "100%", marginTop: spacing.sm }} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      {habit.location && mapRegion ? (
        <HabitMap region={mapRegion} habitLocation={habit.location} position={position} />
      ) : (
        <View style={styles.noLocationBg}>
          <MaterialIcons name="location-pin" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.noLocationText}>No saved location for this habit</Text>
        </View>
      )}

      <View style={styles.mapOverlay} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={onCancel} style={styles.headerBack} accessibilityLabel="Close">
            <MaterialIcons name="close" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Arrival Check-In</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.centerContent}>
          <View style={styles.orbWrap}>
            <Animated.View style={[styles.pulseRingOuter, { transform: [{ scale: pulseOuter }] }]} />
            <Animated.View style={[styles.pulseRingInner, { transform: [{ scale: pulseInner }] }]} />
            <View style={styles.orbCore}>
              <MaterialIcons name="location-on" size={36} color={colors.onPrimary} />
            </View>
          </View>

          <View style={styles.titleBlock}>
            <View style={styles.activeRow}>
              <View style={styles.activeDot} />
              <Text style={styles.activeLabel}>GEOFENCE ACTIVE</Text>
            </View>
            <Text style={styles.headline}>
              {missed ? "Deadline passed for today" : "Head to your destination"}
            </Text>
            <Text style={styles.habitName}>{habit.name}</Text>
          </View>

          <View style={styles.liveStats}>
            <Text style={styles.liveStatText}>
              {distanceMeters !== null ? formatDistance(distanceMeters) : "Locating your position…"}
            </Text>
            {remainingSeconds !== null && (
              <Text style={styles.liveStatText}>
                {missed ? "Didn't make it today" : `${secondsToHHMMSS(remainingSeconds)} until deadline`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.bottomPanel}>
          <AppCard variant="glass" style={styles.commitCard}>
            <View style={styles.commitIconWrap}>
              <MaterialIcons name="auto-awesome" size={22} color={colors.primary} />
            </View>
            <View style={styles.commitTextWrap}>
              <Text style={styles.commitLabel}>COMMITMENT</Text>
              <Text style={styles.commitTitle}>{habit.name}</Text>
              {habit.location && (
                <Text style={styles.commitSub}>{habit.location.radiusMeters}m geofence radius</Text>
              )}
            </View>
          </AppCard>

          {missed ? (
            <AppCard variant="glass" style={styles.missedCard}>
              <MaterialIcons name="schedule" size={22} color={colors.onSurfaceVariant} />
              <Text style={styles.missedCardText}>
                You can try again tomorrow — a calm reset, not a failure.
              </Text>
            </AppCard>
          ) : (
            <AppButton
              title={submitting ? "Checking in…" : "Confirm Arrival"}
              onPress={handleManualCheckIn}
              disabled={submitting || !position}
              loading={submitting}
              variant="primary"
              icon={<MaterialIcons name="arrow-forward" size={20} color={colors.onPrimary} />}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colorWithAlpha(colors.background, 0.55),
  },
  noLocationBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  noLocationText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  webMapFallback: {
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.marginEdge,
    gap: spacing.sm,
  },
  webMapText: { ...typography.bodyMd, fontSize: 13, color: colors.onSurfaceVariant, textAlign: "center" },
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
  },
  headerBack: { padding: 6 },
  headerTitle: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface },
  headerSpacer: { width: 34 },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.marginEdge,
    gap: spacing.md,
  },
  orbWrap: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  pulseRingOuter: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colorWithAlpha(colors.primary, 0.4),
  },
  pulseRingInner: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colorWithAlpha(colors.primary, 0.22),
  },
  orbCore: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  titleBlock: { alignItems: "center", gap: 6 },
  activeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.primaryContainer },
  activeLabel: { ...typography.labelCaps, color: colors.primary, fontSize: 10 },
  headline: { ...typography.headlineLgMobile, textAlign: "center" },
  habitName: { ...typography.bodyMd, color: colors.primary, fontWeight: "700", textAlign: "center" },
  liveStats: { alignItems: "center", gap: 4, marginTop: spacing.xs },
  liveStatText: { ...typography.bodyMd, fontSize: 14, color: colors.onSurfaceVariant, textAlign: "center" },
  bottomPanel: {
    paddingHorizontal: spacing.marginEdge,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  commitCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  commitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colorWithAlpha(colors.primary, 0.12),
    alignItems: "center",
    justifyContent: "center",
  },
  commitTextWrap: { flex: 1, gap: 2 },
  commitLabel: { ...typography.labelCaps, color: colors.onSurfaceVariant, fontSize: 10 },
  commitTitle: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface },
  commitSub: { ...typography.bodyMd, fontSize: 12, color: colors.onSurfaceVariant },
  missedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  missedCardText: { flex: 1, ...typography.bodyMd, fontSize: 14, color: colors.onSurfaceVariant },
  targetMarker: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
  youMarker: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.tertiary,
    borderWidth: 2,
    borderColor: colors.onPrimary,
  },
});