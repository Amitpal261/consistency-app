import * as Location from "expo-location";

export class LocationUnavailableError extends Error {}

export async function getCurrentPositionSafe(): Promise<Location.LocationObject> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new LocationUnavailableError(
      "Location is turned off on your phone. Go to Settings → Location and turn it on, then try again."
    );
  }

  try {
    return await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      8000
    );
  } catch {
    try {
      return await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        8000
      );
    } catch {
      throw new LocationUnavailableError(
        "Couldn't get a location fix. Try moving near a window or going outside, then try again."
      );
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}