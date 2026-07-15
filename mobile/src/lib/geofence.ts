import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { startDwell, exitDwell } from "./api";

export const GEOFENCE_TASK_NAME = "habit-geofence-task";

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

  if (eventType === Location.GeofencingEventType.Enter) {
    console.log(`[Geofence] Entered habit region: ${habitId}`);
    try {
      await startDwell(token, habitId, { lat, lng });
      console.log(`[Geofence] Successfully started dwell for habit: ${habitId}`);
    } catch (err) {
      console.error(`[Geofence] Failed to start dwell for habit: ${habitId}`, err);
    }
  } else if (eventType === Location.GeofencingEventType.Exit) {
    console.log(`[Geofence] Exited habit region: ${habitId}`);
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
    return;
  }

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
