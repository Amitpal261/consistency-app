import notifee, {
  AndroidCategory,
  AndroidImportance,
  EventType,
  RepeatFrequency,
  TriggerType,
} from "@notifee/react-native";
import { Platform } from "react-native";

const ALARM_NOTIFICATION_ID = "daily-wake-alarm";
const ANDROID_CHANNEL_ID = "wake-alarm-channel";

export async function setupNotificationChannels() {
  await notifee.requestPermission();

  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Wake-up alarm",
      importance: AndroidImportance.HIGH,
      sound: "default",
      vibration: true,
    });
  }
}

export async function scheduleDailyAlarm(hour: number, minute: number) {
  await notifee.cancelNotification(ALARM_NOTIFICATION_ID);

  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  await notifee.createTriggerNotification(
    {
      id: ALARM_NOTIFICATION_ID,
      title: "⏰ Time to wake up",
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

export async function cancelDailyAlarm() {
  await notifee.cancelNotification(ALARM_NOTIFICATION_ID);
}

export async function getScheduledAlarm() {
  const triggers = await notifee.getTriggerNotifications();
  return triggers.find((t) => t.notification.id === ALARM_NOTIFICATION_ID) ?? null;
}

/**
 * Checks whether the app was just opened by the user tapping the alarm
 * notification (works even if the app was fully closed/killed) — use this
 * once on app startup to decide whether to jump straight to Check-in.
 */
export async function wasOpenedFromAlarm(): Promise<boolean> {
  const initial = await notifee.getInitialNotification();
  return initial?.notification.id === ALARM_NOTIFICATION_ID;
}

/**
 * Subscribes to the alarm notification being tapped while the app is
 * already open in the foreground. Returns an unsubscribe function.
 */
export function onAlarmPressedInForeground(callback: () => void) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.id === ALARM_NOTIFICATION_ID) {
      callback();
    }
  });
}