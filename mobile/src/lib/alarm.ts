import notifee, {
  AndroidCategory,
  AndroidImportance,
  EventType,
  RepeatFrequency,
  TriggerType,
} from "@notifee/react-native";
import { Platform } from "react-native";
import { playNativeAlarm } from "./nativeAlarm";
import type { Ringtone } from "./api";

const ANDROID_CHANNEL_ID = "wake-alarm-channel";

function alarmIdFor(habitId: string): string {
  return `habit-alarm-${habitId}`;
}

export async function setupNotificationChannels() {
  await notifee.requestPermission();

  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Habit alarms",
      importance: AndroidImportance.HIGH,
      sound: "default",
      vibration: true,
    });
  }
}

export async function scheduleHabitAlarm(
  habitId: string,
  habitName: string,
  hour: number,
  minute: number,
  ringtone?: Ringtone
) {
  const id = alarmIdFor(habitId);
  await notifee.cancelNotification(id);

  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id,
      title: `⏰ ${habitName}`,
      // ringtoneKind/ringtoneUri travel with the notification's data so the
      // background handler in index.ts knows exactly what to play — even if
      // the app was fully killed when the alarm fires.
      data: {
        habitId,
        ringtoneKind: ringtone?.kind ?? "default",
        ringtoneUri: ringtone?.uri ?? "",
      },
      body: "Tap to check in and keep your streak alive.",
      android: {
        channelId: ANDROID_CHANNEL_ID,
        category: AndroidCategory.ALARM,
        fullScreenAction: { id: "default" },
        pressAction: { id: "default" },
        loopSound: true,
        ongoing: true,
        autoCancel: false,
      },
      ios: {
        interruptionLevel: "timeSensitive",
        sound: "default",
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: next.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    }
  );
}

export async function cancelHabitAlarm(habitId: string) {
  await notifee.cancelNotification(alarmIdFor(habitId));
}

export async function getHabitIdFromAlarmLaunch(): Promise<string | null> {
  const initial = await notifee.getInitialNotification();
  const habitId = initial?.notification.data?.habitId;
  return typeof habitId === "string" ? habitId : null;
}

/**
 * Shared by both the foreground (App.tsx) and background (index.ts) notifee
 * event listeners so the "when should the loud alarm start" logic lives in
 * exactly one place.
 *
 * - On DELIVERED: kick off the native STREAM_ALARM foreground service so the
 *   alarm rings loudly and bypasses DND. This runs even if the app is
 *   completely killed (via notifee's background event / Android headless task).
 * - On PRESS: just report back which habitId to navigate to. We deliberately
 *   do NOT stop the alarm here — per the architecture, it should keep
 *   ringing until the user actually captures their check-in proof.
 *
 * Returns the habitId to navigate to (on PRESS), or null otherwise.
 */
export async function handleNotifeeAlarmEvent(type: EventType, detail: any): Promise<string | null> {
  const data = detail?.notification?.data;
  const habitId = data?.habitId;
  if (typeof habitId !== "string") return null;

  if (type === EventType.DELIVERED) {
    const ringtoneKind = data?.ringtoneKind === "custom" ? "custom" : "default";
    const ringtoneUri = typeof data?.ringtoneUri === "string" ? data.ringtoneUri : "";
    playNativeAlarm(habitId, ringtoneKind === "custom" && ringtoneUri ? ringtoneUri : null);
    return null;
  }

  if (type === EventType.PRESS) {
    return habitId;
  }

  return null;
}

/** Registers the foreground listener and calls onPress(habitId) whenever the user taps the alarm notification. */
export function onHabitAlarmForegroundEvent(onPress: (habitId: string) => void) {
  return notifee.onForegroundEvent(async ({ type, detail }) => {
    const pressedHabitId = await handleNotifeeAlarmEvent(type, detail);
    if (pressedHabitId) onPress(pressedHabitId);
  });
}