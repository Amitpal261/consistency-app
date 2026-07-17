import { NativeModules, Platform } from "react-native";

type AlarmModuleType = {
  playAlarm(habitId: string, ringtoneUri: string | null): void;
  stopAlarm(): void;
  consumePendingHabitId(): Promise<string | null>;
};

const { AlarmModule } = NativeModules as { AlarmModule?: AlarmModuleType };

/**
 * Starts the loud, DND-bypassing STREAM_ALARM foreground service (Android
 * only). Pass a ringtoneUri to play a user-picked custom sound, or
 * null/undefined to use the device's default alarm ringtone.
 */
export function playNativeAlarm(habitId: string, ringtoneUri?: string | null) {
  if (Platform.OS !== "android" || !AlarmModule) return;
  AlarmModule.playAlarm(habitId, ringtoneUri ?? null);
}

/** Stops the alarm sound + foreground service. Safe to call even if nothing is playing. */
export function stopNativeAlarm() {
  if (Platform.OS !== "android" || !AlarmModule) return;
  AlarmModule.stopAlarm();
}

/**
 * When the alarm's full-screen activity opens the app directly (bypassing
 * notifee's own "press" flow, e.g. when the app was fully killed), this
 * returns the habitId that should be checked in — and clears it, so it's
 * only consumed once.
 */
export async function getPendingAlarmHabitId(): Promise<string | null> {
  if (Platform.OS !== "android" || !AlarmModule) return null;
  try {
    return await AlarmModule.consumePendingHabitId();
  } catch {
    return null;
  }
}