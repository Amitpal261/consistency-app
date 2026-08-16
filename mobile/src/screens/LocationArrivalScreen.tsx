import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useAuth } from "../context/AuthContext";
import { submitCheckIn, type Habit } from "../lib/api";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
// Try to require MapLibre at runtime — if native module isn't linked (Expo dev client not rebuilt), avoid crashing and render a fallback.
let MapLibreGL: any;
try {
  // use require so a missing native module doesn't break static import evaluation
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapLibreGL = require('@maplibre/maplibre-react-native');
} catch (e) {
  MapLibreGL = undefined;
  // allow the app to continue — map will show a placeholder
  // console.warn is okay here for debugging in dev
  // eslint-disable-next-line no-console
  console.warn('MapLibre native module not available, map disabled', e);
}
import { colors, spacing, typography } from "../theme/colors";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function secondsToHHMMSS(sec: number) {
  if (sec <= 0) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Create a GeoJSON polygon approximating a circle (radius in meters)
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
  // close polygon
  if (coords.length > 0) coords.push(coords[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

export function LocationArrivalScreen({ habit, onCheckIn, onCancel }: { habit: Habit; onCheckIn?: () => void; onCancel?: () => void }) {
  const { token } = useAuth();
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [watchSub, setWatchSub] = useState<Location.LocationSubscription | null>(null);
  const timerRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!mounted) return;
        setPosition(pos);
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
        setWatchSub(sub);
      } catch (e) {
        console.warn("watchPosition failed", e);
      }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  useEffect(() => {
    // distance compute
    if (!position || !habit?.location) {
      setDistanceMeters(null);
      return;
    }
    const d = haversineDistance(position.coords.latitude, position.coords.longitude, habit.location.lat, habit.location.lng);
    setDistanceMeters(d);
  }, [position, habit]);

  useEffect(() => {
    // countdown to deadline
    if (!habit.locationDeadline) {
      setRemainingSeconds(null);
      return;
    }

    function compute() {
      const now = new Date();
      const target = new Date(now);
      target.setHours(habit.locationDeadline!.hour, habit.locationDeadline!.minute, 0, 0);
      // if target already passed earlier today, treat as passed
      const secs = Math.floor((target.getTime() - now.getTime()) / 1000);
      setRemainingSeconds(secs);
    }

    compute();
    timerRef.current = setInterval(compute, 1000) as unknown as number;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [habit.locationDeadline]);

  const handleManualCheckIn = async () => {
    if (!token || !habit) return;
    setSubmitting(true);
    try {
      if (!position) {
        Alert.alert("Location unavailable", "Could not get current location to submit check-in.");
        setSubmitting(false);
        return;
      }
      const res = await submitCheckIn(token, {
        habitId: habit._id,
        location: { lat: position.coords.latitude, lng: position.coords.longitude, accuracyMeters: position.coords.accuracy ?? undefined },
      });
      // success
      Alert.alert(res.reviewStatus === "pending" ? "Sent for review" : "Check-in complete");
      onCheckIn?.();
    } catch (err) {
      Alert.alert("Check-in failed", err instanceof Error ? err.message : "Failed to submit check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const missed = remainingSeconds !== null && remainingSeconds <= 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerBack}>
          <MaterialIcons name="close" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Arrival Check-In</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.container}>
        <AppCard variant="glass" style={styles.mapCard}>
          {/* Map */}
          <View style={styles.mapView}>
            {/* react-native-maps MapView */}
            {habit.location ? (
              <>
                {MapLibreGL && MapLibreGL.MapView ? (
                  <MapLibreGL.MapView
                    style={StyleSheet.absoluteFill}
                    styleURL={'https://demotiles.maplibre.org/style.json'}
                  >
                    <MapLibreGL.Camera
                      centerCoordinate={[habit.location.lng, habit.location.lat]}
                      zoomLevel={15}
                    />

                    {/* Circle polygon as GeoJSON */}
                    {habit.location && (
                      <MapLibreGL.ShapeSource
                        id="circleSource"
                        shape={createGeoJSONCircle(habit.location.lat, habit.location.lng, habit.location.radiusMeters)}
                      >
                        <MapLibreGL.FillLayer id="circleFill" style={{ fillColor: 'rgba(63,81,181,0.12)' }} />
                        <MapLibreGL.LineLayer id="circleStroke" style={{ lineColor: 'rgba(63,81,181,0.3)', lineWidth: 1 }} />
                      </MapLibreGL.ShapeSource>
                    )}

                    {/* Target marker */}
                    <MapLibreGL.PointAnnotation id="target" coordinate={[habit.location.lng, habit.location.lat]}>
                      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#fff' }} />
                    </MapLibreGL.PointAnnotation>

                    {position && (
                      <MapLibreGL.PointAnnotation id="you" coordinate={[position.coords.longitude, position.coords.latitude]}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colors.tertiary, borderWidth: 2, borderColor: '#fff' }} />
                      </MapLibreGL.PointAnnotation>
                    )}
                  </MapLibreGL.MapView>
                ) : (
                  <View style={StyleSheet.absoluteFill}>
                    <View style={styles.mapPlaceholderCenter}>
                      <MaterialIcons name="map" size={48} color={colors.onSurfaceVariant} />
                      <Text style={{ color: colors.onSurfaceVariant, marginTop: 8, textAlign: 'center' }}>
                        Map is unavailable (native map module not linked).\nRebuild the app (expo prebuild / run) to enable the native map view.
                      </Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.mapPlaceholderCenter}>
                <MaterialIcons name="location-pin" size={48} color={colors.onSurfaceVariant} />
                <Text style={{ color: colors.onSurfaceVariant, marginTop: 8 }}>No saved location</Text>
              </View>
            )}
          </View>

          <View style={{ padding: 12 }}>
            <Text style={{ ...typography.labelCaps, color: colors.primary }}>TARGET LOCATION</Text>
            <Text style={{ marginTop: 6, color: colors.onSurface }}>{habit.name}</Text>
            <Text style={{ marginTop: 6, color: colors.onSurfaceVariant }}>{habit.location ? `${habit.location.radiusMeters}m radius` : "No saved location"}</Text>
          </View>
        </AppCard>

        <AppCard variant="hero" style={{ width: "100%" }}>
          <View style={{ gap: 6 }}>
            <Text style={{ ...typography.labelCaps, color: colors.primary }}>DISTANCE</Text>
            <Text style={{ ...typography.h2 }}>{distanceMeters !== null ? formatDistance(distanceMeters) : "—"}</Text>

            <Text style={{ ...typography.labelCaps, color: colors.primary, marginTop: 8 }}>ARRIVAL DEADLINE</Text>
            {remainingSeconds !== null ? (
              missed ? (
                <Text style={{ color: colors.onSurfaceVariant }}>Didn't make it today</Text>
              ) : (
                <Text style={{ ...typography.h2, color: colors.primary }}>{secondsToHHMMSS(remainingSeconds)}</Text>
              )
            ) : (
              <Text style={{ color: colors.onSurfaceVariant }}>No deadline</Text>
            )}

            <AppButton
              title={missed ? "Too late today" : "I'm here — Check in"}
              onPress={handleManualCheckIn}
              disabled={missed || submitting}
              style={{ marginTop: 12 }}
              variant="primary"
            />
          </View>
        </AppCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.marginEdge, paddingTop: spacing.sm },
  headerBack: { padding: 6 },
  headerTitle: { ...typography.bodyMd, fontWeight: "700", color: colors.onSurface },
  container: { flex: 1, padding: spacing.marginEdge, gap: spacing.lg },
  mapCard: { padding: 0, overflow: "hidden", borderRadius: 20 },
  mapView: { height: 320, backgroundColor: "#dfe4ec", justifyContent: "center", alignItems: "center" },
  mapCenterMarker: { width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(186,195,255,0.16)", borderWidth: 2, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
  mapPinWrap: { position: "absolute", top: 24, left: 24, alignItems: "center" },
  mapPinText: { color: colors.onSurface, marginTop: 4 },
  youMarker: { position: "absolute", bottom: 18, right: 24, alignItems: "center" },
  youText: { color: colors.onSurface, marginTop: 4, fontSize: 12 },
  mapPlaceholderCenter: { alignItems: "center", justifyContent: "center", flex: 1 },
});
