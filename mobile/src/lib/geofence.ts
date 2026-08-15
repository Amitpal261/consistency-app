import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startDwell, exitDwell, submitCheckIn } from "./api";

export const GEOFENCE_TASK_NAME = "habit-geofence-task";
const GEOFENCE_META_KEY = "geofence_habit_meta";

type GeofenceHabitMeta = { taskType: "location" | "location_duration" };

async function getHabitMeta(habitId: string): Promise<GeofenceHabitMeta | null> {
  const raw = await AsyncStorage.getItem(GEOFENCE_META_KEY);
  if (!raw) return null;
  const map = JSON.parse(raw) as Record<string, GeofenceHabitMeta>;
  return map[habitId] ?? null;
}

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error("Geofence task error:", error);
    return;
  }

  const token = await AsyncStorage.getItem("auth_token");
  if (!token) {
    console.log("No auth token found, skipping geofence check-in");
    return;
  }

  const habitId = region.identifier;
  const lat = region.latitude;
  const lng = region.longitude;
  const meta = await getHabitMeta(habitId);

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log(`[Geofence] Entered habit region: ${habitId}`);
    try {
      if (meta?.taskType === "location") {
        // Plain arrival habit — a single Enter event IS the whole check-in.
        // Only works when verificationMethod is GPS-only (no photo capture
        // is possible from a background task) — the backend will reject
        // this with a clear error for photo-required habits, which is
        // expected: the user needs to open the app and check in manually
        // for those.
        await submitCheckIn(token, { habitId, location: { lat, lng } });
        console.log(`[Geofence] Auto check-in submitted for arrival habit: ${habitId}`);
      } else {
        // location_duration — Enter just starts the dwell timer, the actual
        // check-in/streak update happens on Exit once enough time has passed.
        await startDwell(token, habitId, { lat, lng });
        console.log(`[Geofence] Successfully started dwell for habit: ${habitId}`);
      }
    } catch (err) {
      console.error(`[Geofence] Failed to process entry for habit: ${habitId}`, err);
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log(`[Geofence] Exited habit region: ${habitId}`);
    if (meta?.taskType === "location") {
      // Nothing to do on exit for a plain arrival habit — it already
      // checked in on Enter above.
      return;
    }
    try {
      await exitDwell(token, habitId, { lat, lng });
      console.log(`[Geofence] Successfully exited dwell for habit: ${habitId}`);
    } catch (err) {
      console.error(`[Geofence] Failed to exit dwell for habit: ${habitId}`, err);
    }
  }
});

export async function setupGeofencing(habits: any[]) {
  const hasPermission = await requestBackgroundPermissions();
  if (!hasPermission) {
    console.log("Background location permission not granted, geofencing not setup.");
    return;
  }

  const locationHabits = habits.filter(
    (h) => (h.taskType === "location" || h.taskType === "location_duration") && h.location
  );

  if (locationHabits.length === 0) {
    console.log("No active location habits to geofence.");
    const isRegistered = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    await AsyncStorage.removeItem(GEOFENCE_META_KEY);
    return;
  }

  // Persist a small habitId -> taskType lookup so the background task
  // (which only receives a bare region identifier from the OS, not the
  // full habit object) knows whether an Enter event means "auto check-in
  // now" (plain arrival) or "start the dwell timer" (duration habit).
  const metaMap: Record<string, GeofenceHabitMeta> = {};
  for (const h of locationHabits) {
    metaMap[h._id] = { taskType: h.taskType };
  }
  await AsyncStorage.setItem(GEOFENCE_META_KEY, JSON.stringify(metaMap));

  const regions = locationHabits.map((h) => ({
    identifier: h._id,
    latitude: h.location.lat,
    longitude: h.location.lng,
    radius: h.location.radiusMeters || 150,
    notifyOnEntry: true,
    notifyOnExit: true,
  }));

  try {
    console.log(`[Geofence] Setting up ${regions.length} geofence region(s)...`);
    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
  } catch (err) {
    console.error("[Geofence] startGeofencingAsync failed", err);
  }
}

async function requestBackgroundPermissions(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== "granted") return false;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  return bgStatus === "granted";
}