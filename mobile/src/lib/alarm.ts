import notifee, {
  AndroidCategory,
  AndroidImportance,
  EventType,
  RepeatFrequency,
  TriggerType,
} from "@notifee/react-native";
import { Platform } from "react-native";

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

export async function scheduleHabitAlarm(habitId: string, habitName: string, hour: number, minute: number) {
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
      data: { habitId },
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

export function onHabitAlarmPressedInForeground(callback: (habitId: string) => void) {
  return notifee.onForegroundEvent(({ type, detail }) => {
    const habitId = detail.notification?.data?.habitId;
    if (type === EventType.PRESS && typeof habitId === "string") {
      callback(habitId);
    }
  });
}