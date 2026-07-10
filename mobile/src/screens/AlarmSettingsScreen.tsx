import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";
import { cancelDailyAlarm, getScheduledAlarm, scheduleDailyAlarm } from "../lib/alarm";

export function AlarmSettingsScreen() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  });
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getScheduledAlarm().then((existing) => {
      if (existing?.trigger && "timestamp" in existing.trigger) {
        setTime(new Date(existing.trigger.timestamp));
        setEnabled(true);
      }
    });
  }, []);

  async function handleToggle() {
    setSaving(true);
    try {
      if (enabled) {
        await cancelDailyAlarm();
        setEnabled(false);
      } else {
        await scheduleDailyAlarm(time.getHours(), time.getMinutes());
        setEnabled(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: "center", gap: spacing.lg }}>
      <Text style={typography.h1}>Wake-up alarm</Text>
      <AppCard style={{ alignItems: "center", paddingVertical: spacing.lg }}>
        <DateTimePicker
          value={time}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "clock"}
          onChange={(_, selected) => selected && setTime(selected)}
          themeVariant="dark"
        />
      </AppCard>
      <Text style={typography.body}>
        {enabled
          ? "Alarm is ON — you'll get a full-screen alert at this time daily."
          : "Alarm is currently off."}
      </Text>
      <AppButton
        title={enabled ? "Turn off alarm" : "Set daily alarm"}
        onPress={handleToggle}
        loading={saving}
        variant={enabled ? "danger" : "primary"}
      />
    </View>
  );
}