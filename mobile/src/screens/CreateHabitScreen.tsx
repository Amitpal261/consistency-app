import { useState } from "react";
import { Alert, Platform, ScrollView, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { getCurrentPositionSafe } from "../lib/location";
import { useAuth } from "../context/AuthContext";
import { createHabit, type Ringtone, type TaskType, type VerificationMethod } from "../lib/api";
import { scheduleHabitAlarm } from "../lib/alarm";
import { pickCustomRingtone } from "../lib/ringtone";
import { AppButton } from "../components/AppButton";
import { AppCard, AppTextInput } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

const TASK_TYPES: { value: TaskType; label: string; description: string }[] = [
  { value: "time", label: "Time-based", description: "e.g. wake up at 6 AM — alarm fires, you check in" },
  { value: "location", label: "Location arrival", description: "e.g. gym — check in when you get there" },
  { value: "location_duration", label: "Location + duration", description: "e.g. library for 2 hours" },
];

const VERIFICATION_METHODS: { value: VerificationMethod; label: string }[] = [
  { value: "photo_gps", label: "Photo + GPS (strongest)" },
  { value: "photo", label: "Photo only" },
  { value: "gps", label: "GPS only" },
];

export function CreateHabitScreen({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("time");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("photo_gps");
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  });
  const [windowMinutes, setWindowMinutes] = useState("60");
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Alarm ringtone selection (time-based habits only) ---
  const [ringtone, setRingtone] = useState<Ringtone>({ kind: "default" });
  const [pickingRingtone, setPickingRingtone] = useState(false);

  async function handlePickCustomRingtone() {
    setPickingRingtone(true);
    try {
      const picked = await pickCustomRingtone();
      if (picked) {
        setRingtone({ kind: "custom", uri: picked.uri, name: picked.name });
      }
    } catch (err) {
      Alert.alert("Could not use that file", err instanceof Error ? err.message : "Please try a different audio file.");
    } finally {
      setPickingRingtone(false);
    }
  }

  async function handleCreate() {
    if (!token || !name.trim()) {
      setError("Please enter a name for this habit.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      let location: { lat: number; lng: number; radiusMeters: number } | undefined;
      if (taskType !== "time") {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("Location permission is needed to set this habit's place.");
          setSaving(false);
          return;
        }
        const pos = await getCurrentPositionSafe();
        location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusMeters: Number(radiusMeters) || 150,
        };
      }

      const res = await createHabit(token, {
        name: name.trim(),
        taskType,
        verificationMethod,
        timeWindow:
          taskType === "time"
            ? { hour: time.getHours(), minute: time.getMinutes(), windowMinutes: Number(windowMinutes) || 60 }
            : undefined,
        location,
        requiredDurationMinutes: taskType === "location_duration" ? Number(durationMinutes) || 120 : undefined,
        ringtone: taskType === "time" ? ringtone : undefined,
      });

      if (taskType === "time") {
        await scheduleHabitAlarm(res.habit._id, res.habit.name, time.getHours(), time.getMinutes(), res.habit.ringtone);
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create habit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={typography.h1}>New habit</Text>

      <AppCard style={{ gap: spacing.sm }}>
        <Text style={typography.label}>NAME</Text>
        <AppTextInput value={name} onChangeText={setName} placeholder="e.g. Morning workout" />
      </AppCard>

      <AppCard style={{ gap: spacing.sm }}>
        <Text style={typography.label}>TYPE</Text>
        {TASK_TYPES.map((t) => (
          <View
            key={t.value}
            onTouchEnd={() => setTaskType(t.value)}
            style={{
              padding: spacing.sm,
              borderRadius: 10,
              backgroundColor: taskType === t.value ? colors.primaryMuted : colors.surfaceElevated,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>{t.label}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t.description}</Text>
          </View>
        ))}
      </AppCard>

      {taskType === "time" ? (
        <>
          <AppCard style={{ alignItems: "center", gap: spacing.sm }}>
            <Text style={typography.label}>ALARM TIME</Text>
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "clock"}
              onChange={(_, selected) => selected && setTime(selected)}
              themeVariant="dark"
            />
            <Text style={typography.label}>CHECK-IN WINDOW (MINUTES AFTER ALARM)</Text>
            <AppTextInput value={windowMinutes} onChangeText={setWindowMinutes} keyboardType="number-pad" />
          </AppCard>

          <AppCard style={{ gap: spacing.sm }}>
            <Text style={typography.label}>ALARM SOUND</Text>

            <View
              onTouchEnd={() => setRingtone({ kind: "default" })}
              style={{
                padding: spacing.sm,
                borderRadius: 10,
                backgroundColor: ringtone.kind === "default" ? colors.primaryMuted : colors.surfaceElevated,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>Default alarm sound</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Uses your phone's default alarm ringtone.</Text>
            </View>

            <View
              onTouchEnd={handlePickCustomRingtone}
              style={{
                padding: spacing.sm,
                borderRadius: 10,
                backgroundColor: ringtone.kind === "custom" ? colors.primaryMuted : colors.surfaceElevated,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontWeight: "700" }}>
                {pickingRingtone ? "Opening file picker…" : "Choose audio file from phone"}
              </Text>
              {ringtone.kind === "custom" && ringtone.name ? (
                <Text style={{ color: colors.success, fontSize: 12, marginTop: 2 }}>✅ {ringtone.name}</Text>
              ) : (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Pick any mp3/wav/m4a from your device.</Text>
              )}
            </View>
          </AppCard>
        </>
      ) : (
        <AppCard style={{ gap: spacing.sm }}>
          <Text style={typography.label}>LOCATION</Text>
          <Text style={typography.body}>Your current location will be used as the target place.</Text>
          <Text style={typography.label}>RADIUS (METERS)</Text>
          <AppTextInput value={radiusMeters} onChangeText={setRadiusMeters} keyboardType="number-pad" />
          {taskType === "location_duration" ? (
            <>
              <Text style={typography.label}>REQUIRED DURATION (MINUTES)</Text>
              <AppTextInput value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />
            </>
          ) : null}
        </AppCard>
      )}

      <AppCard style={{ gap: spacing.sm }}>
        <Text style={typography.label}>VERIFICATION</Text>
        {VERIFICATION_METHODS.map((v) => (
          <View
            key={v.value}
            onTouchEnd={() => setVerificationMethod(v.value)}
            style={{
              padding: spacing.sm,
              borderRadius: 10,
              backgroundColor: verificationMethod === v.value ? colors.primaryMuted : colors.surfaceElevated,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{v.label}</Text>
          </View>
        ))}
      </AppCard>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      <AppButton title="Create habit" onPress={handleCreate} loading={saving} />
    </ScrollView>
  );
}