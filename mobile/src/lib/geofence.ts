import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { startDwell, exitDwell, submitCheckIn } from "./api";
import { getStoredItem, getStoredJSON, setStoredJSON } from "./storage";

export const GEOFENCE_TASK_NAME = "habit-geofence-task";
const GEOFENCE_META_KEY = "habit-geofence-meta";

TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error("Geofence task error:", error);
    return;
  }

  const token = await getStoredItem("auth_token");
  if (!token) {
    console.log("No auth token found, skipping geofence check-in");
    return;
  }

  const habitId = region.identifier;
  const lat = region.latitude;
  const lng = region.longitude;
  const meta = (await getStoredJSON<Record<string, { taskType: string; verificationMethod?: string }>>(GEOFENCE_META_KEY)) ?? {};
  const habitMeta = meta[habitId];

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log(`[Geofence] Entered habit region: ${habitId}`);

    if (habitMeta?.taskType === "location" && habitMeta.verificationMethod === "gps") {
      try {
        const res = await submitCheckIn(token, { habitId, location: { lat, lng } });
        console.log(`[Geofence] Auto check-in succeeded for habit: ${habitId}`, res);
      } catch (err) {
        console.error(`[Geofence] Auto check-in failed for habit: ${habitId}`, err);
      }
      return;
    }

    if (habitMeta?.taskType === "location_duration") {
      try {
        await startDwell(token, habitId, { lat, lng });
        console.log(`[Geofence] Successfully started dwell for habit: ${habitId}`);
      } catch (err) {
        console.error(`[Geofence] Failed to start dwell for habit: ${habitId}`, err);
      }
      return;
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log(`[Geofence] Exited habit region: ${habitId}`);

    if (habitMeta?.taskType === "location_duration") {
      try {
        await exitDwell(token, habitId, { lat, lng });
        console.log(`[Geofence] Successfully exited dwell for habit: ${habitId}`);
      } catch (err) {
        console.error(`[Geofence] Failed to exit dwell for habit: ${habitId}`, err);
      }
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

  const meta = Object.fromEntries(
    locationHabits.map((habit) => [habit._id, { taskType: habit.taskType, verificationMethod: habit.verificationMethod }])
  );
  await setStoredJSON(GEOFENCE_META_KEY, meta);

  if (locationHabits.length === 0) {
    console.log("No active location habits to geofence.");
    const isRegistered = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK_NAME);
    if (isRegistered) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
    }
    return;
  }

  const geofenceRegions = locationHabits.map((h) => ({
    identifier: h._id,
    latitude: h.location.lat,
    longitude: h.location.lng,
    radius: h.location.radiusMeters || 150,
    notifyOnEntry: true,
    notifyOnExit: true,
  }));

  try {
    console.log(`[Geofence] Setting up ${geofenceRegions.length} geofence region(s)...`);
    await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, geofenceRegions);
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
