import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { getCurrentPositionSafe } from "../lib/location";
import { useAuth } from "../context/AuthContext";
import { createHabit, type Ringtone, type TaskType, type VerificationMethod } from "../lib/api";
import { scheduleHabitAlarm } from "../lib/alarm";
import { pickCustomRingtone } from "../lib/ringtone";
import { AppButton } from "../components/AppButton";
import { AppCard, AppTextInput } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

const TASK_TYPES: { value: TaskType; label: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: "time", label: "Time-based Alarm", description: "e.g. Wake up at 6:00 AM — blaring alarm fires, silenced on proof capture.", icon: "alarm" },
  { value: "location", label: "Location Arrival", description: "e.g. Arrive at Gym — auto-verify when inside geofence radius.", icon: "location-on" },
  { value: "location_duration", label: "Location + Duration Dwell", description: "e.g. Study at Library for 2 hours — dwell accumulator tracks active stay.", icon: "timer" },
];

const VERIFICATION_METHODS: { value: VerificationMethod; label: string; description: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { value: "photo_gps", label: "Photo + GPS (Recommended)", description: "Highest proof trust — captures camera photo & validates location.", icon: "verified-user" },
  { value: "photo", label: "Photo Only", description: "Camera verification only — ideal for home wake-up or desk work.", icon: "photo-camera" },
  { value: "gps", label: "GPS Geofence Only", description: "Automatic background location verification — zero photo needed.", icon: "my-location" },
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

  // wizard step index: 0=type, 1=schedule/location, 2=verification, 3=confirm
  const [step, setStep] = useState<number>(0);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraPermission = permission?.granted ?? null;

  // Alarm ringtone selection
  const [ringtone, setRingtone] = useState<Ringtone>({ kind: "default" });
  const [pickingRingtone, setPickingRingtone] = useState(false);

  // Animations
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [orbScale]);

  async function handlePickCustomRingtone() {
    setPickingRingtone(true);
    try {
      const picked = await pickCustomRingtone();
      if (picked) {
        setRingtone({ kind: "custom", uri: picked.uri, name: picked.name });
      }
    } catch (err) {
      Alert.alert("Could not load audio file", err instanceof Error ? err.message : "Please select a valid audio file.");
    } finally {
      setPickingRingtone(false);
    }
  }

  const requestCamera = async () => {
    const res = await requestPermission();
    if (!res.granted) {
      Alert.alert("Camera permission required", "Camera access is needed to capture verification photos.");
    }
  };

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
          setError("Location permission is required for geofenced habits.");
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
      setError(err instanceof Error ? err.message : "Failed to create habit.");
    } finally {
      setSaving(false);
    }
  }

  const goNext = () => {
    if (step === 0 && !name.trim()) {
      setError("Please enter a habit name.");
      return;
    }
    setError(null);
    if (step < 3) setStep((s) => s + 1);
    else handleCreate();
  };

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <View style={styles.container}>
      <DotGridBackground />

      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBackBtn} onPress={goBack}>
          <MaterialIcons name={step > 0 ? "arrow-back" : "close"} size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>New Commitment</Text>
        <Text style={styles.stepBadge}>STEP {step + 1} OF 4</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Floating Orb Icon */}
        <View style={styles.orbWrap}>
          <Animated.View style={[styles.orbGlow, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.orb}>
            <MaterialIcons
              name={step === 0 ? "add-task" : step === 1 ? "schedule" : step === 2 ? "security" : "fact-check"}
              size={36}
              color={colors.surfaceTint}
            />
          </LinearGradient>
        </View>

        {/* Step Title & Kicker */}
        <View style={styles.titleSection}>
          <Text style={styles.kicker}>
            {step === 0
              ? "DEFINITION"
              : step === 1
              ? "TIMING & PLACE"
              : step === 2
              ? "PROOF RULE"
              : "CONFIRMATION"}
          </Text>
          <Text style={styles.title}>
            {step === 0
              ? "Name & Task Type"
              : step === 1
              ? "Set Schedule & Geofence"
              : step === 2
              ? "Choose Proof Verification"
              : "Review & Lock Commitment"}
          </Text>
        </View>

        {/* STEP 0: Name & Task Type */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <AppCard variant="glass" style={styles.cardSection}>
              <Text style={styles.inputLabel}>HABIT NAME</Text>
              <AppTextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. 6:00 AM Wake Up & Pushups"
              />
            </AppCard>

            <View style={styles.cardSection}>
              <Text style={styles.sectionHeader}>TASK TYPE & PRIMITIVE</Text>
              {TASK_TYPES.map((t) => {
                const active = taskType === t.value;
                return (
                  <Pressable key={t.value} onPress={() => setTaskType(t.value)}>
                    <AppCard variant="glass" active={active} style={styles.typeOptionCard}>
                      <LinearGradient
                        colors={active ? ["#3f51b5", "#293ca0"] : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                        style={styles.optionIconCircle}
                      >
                        <MaterialIcons name={t.icon} size={22} color={active ? "#FFFFFF" : colors.onSurfaceVariant} />
                      </LinearGradient>
                      <View style={styles.optionTextWrap}>
                        <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{t.label}</Text>
                        <Text style={styles.optionDesc}>{t.description}</Text>
                      </View>
                    </AppCard>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 1: Timing & Location */}
        {step === 1 && (
          <View style={styles.stepContent}>
            {taskType === "time" ? (
              <>
                <AppCard variant="glass" style={styles.pickerCard}>
                  <Text style={styles.inputLabel}>ALARM TRIGGER TIME</Text>
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display={Platform.OS === "ios" ? "spinner" : "clock"}
                    onChange={(_, selected) => selected && setTime(selected)}
                    themeVariant="dark"
                  />
                </AppCard>

                <AppCard variant="glass" style={styles.cardSection}>
                  <Text style={styles.inputLabel}>RINGTONE AUDIO CHANNEL</Text>

                  <Pressable onPress={() => setRingtone({ kind: "default" })}>
                    <View style={[styles.ringtoneOption, ringtone.kind === "default" && styles.ringtoneOptionActive]}>
                      <MaterialIcons name="audiotrack" size={20} color={ringtone.kind === "default" ? colors.primary : colors.outline} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ringtoneTitle}>System Alarm Tone</Text>
                        <Text style={styles.ringtoneSub}>Bypasses DND on native STREAM_ALARM channel.</Text>
                      </View>
                      {ringtone.kind === "default" && <MaterialIcons name="check-circle" size={18} color={colors.primary} />}
                    </View>
                  </Pressable>

                  <Pressable onPress={handlePickCustomRingtone}>
                    <View style={[styles.ringtoneOption, ringtone.kind === "custom" && styles.ringtoneOptionActive, { marginTop: 8 }]}>
                      <MaterialIcons name="folder" size={20} color={ringtone.kind === "custom" ? colors.tertiary : colors.outline} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ringtoneTitle}>
                          {pickingRingtone ? "Opening Audio Picker…" : "Custom Local Audio"}
                        </Text>
                        <Text style={styles.ringtoneSub}>
                          {ringtone.kind === "custom" && ringtone.name ? `Selected: ${ringtone.name}` : "Pick MP3/WAV file from your phone storage."}
                        </Text>
                      </View>
                      {ringtone.kind === "custom" && <MaterialIcons name="check-circle" size={18} color={colors.tertiary} />}
                    </View>
                  </Pressable>
                </AppCard>
              </>
            ) : (
              <AppCard variant="glass" style={styles.cardSection}>
                <Text style={styles.inputLabel}>GEOFENCE RADIUS (METERS)</Text>
                <Text style={styles.infoHint}>Your current phone location will be recorded as the habit target place.</Text>
                <AppTextInput value={radiusMeters} onChangeText={setRadiusMeters} keyboardType="number-pad" />

                {taskType === "location_duration" && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>REQUIRED DWELL DURATION (MINUTES)</Text>
                    <AppTextInput value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />
                  </>
                )}
              </AppCard>
            )}
          </View>
        )}

        {/* STEP 2: Proof Verification */}
        {step === 2 && (
          <View style={styles.stepContent}>
            <View style={styles.cardSection}>
              <Text style={styles.sectionHeader}>VERIFICATION RULES</Text>
              {VERIFICATION_METHODS.map((v) => {
                const active = verificationMethod === v.value;
                return (
                  <Pressable key={v.value} onPress={() => setVerificationMethod(v.value)}>
                    <AppCard variant="glass" active={active} style={styles.typeOptionCard}>
                      <LinearGradient
                        colors={active ? ["#10B981", "#047857"] : ["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                        style={styles.optionIconCircle}
                      >
                        <MaterialIcons name={v.icon} size={22} color={active ? "#FFFFFF" : colors.onSurfaceVariant} />
                      </LinearGradient>
                      <View style={styles.optionTextWrap}>
                        <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>{v.label}</Text>
                        <Text style={styles.optionDesc}>{v.description}</Text>
                      </View>
                    </AppCard>
                  </Pressable>
                );
              })}
            </View>

            {(verificationMethod === "photo" || verificationMethod === "photo_gps") && cameraPermission === false && (
              <AppCard variant="glass" style={styles.permCard}>
                <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.permTitle}>Camera Permission Required</Text>
                  <Text style={styles.permDesc}>We need camera access to capture instant proof photos when alarms ring.</Text>
                  <AppButton title="Grant Camera Permission" onPress={requestCamera} variant="secondary" style={{ marginTop: 8 }} />
                </View>
              </AppCard>
            )}
          </View>
        )}

        {/* STEP 3: Review & Lock */}
        {step === 3 && (
          <View style={styles.stepContent}>
            <AppCard variant="hero" style={styles.summaryCard}>
              <Text style={styles.summaryHeader}>COMMITMENT SUMMARY</Text>
              <Text style={styles.summaryHabitName}>{name}</Text>

              <View style={styles.summaryGrid}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Primitive Type</Text>
                  <Text style={styles.summaryVal}>
                    {taskType === "time" ? "Time Alarm" : taskType === "location" ? "GPS Arrival" : "Dwell Time"}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Schedule / Radius</Text>
                  <Text style={styles.summaryVal}>
                    {taskType === "time"
                      ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")} Daily`
                      : `${radiusMeters}m Geofence`}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Proof Verification</Text>
                  <Text style={styles.summaryVal}>{verificationMethod.toUpperCase()}</Text>
                </View>

                {taskType === "time" && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryKey}>Audio Channel</Text>
                    <Text style={styles.summaryVal}>
                      {ringtone.kind === "custom" ? `Custom (${ringtone.name})` : "STREAM_ALARM Default"}
                    </Text>
                  </View>
                )}
              </View>
            </AppCard>
          </View>
        )}

        {error ? (
          <View style={styles.errorBanner}>
            <MaterialIcons name="error-outline" size={18} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Control Bar */}
      <View style={styles.bottomBar}>
        {step > 0 ? (
          <AppButton title="Back" onPress={goBack} variant="secondary" style={styles.bottomBarBtn} />
        ) : null}
        <AppButton
          title={step === 3 ? "Lock Commitment — Save" : "Continue"}
          onPress={goNext}
          loading={saving}
          variant="primary"
          style={styles.bottomBarBtnMain}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  headerBackBtn: {
    padding: 6,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  stepBadge: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginEdge,
    paddingBottom: 100,
  },
  orbWrap: {
    width: 100,
    height: 100,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.xs,
  },
  orbGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.4)",
    shadowColor: colors.primaryContainer,
    shadowOpacity: 0.5,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.25)",
    elevation: 10,
  },
  titleSection: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.headlineLgMobile,
    fontSize: 20,
    fontWeight: "700",
    color: colors.onSurface,
    textAlign: "center",
    marginTop: 2,
  },
  stepContent: {
    gap: spacing.md,
  },
  cardSection: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  infoHint: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  sectionHeader: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  typeOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 8,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  optionTitleActive: {
    color: colors.surfaceTint,
  },
  optionDesc: {
    ...typography.bodyMd,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },
  pickerCard: {
    alignItems: "center",
  },
  ringtoneOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radius.default,
    padding: 12,
  },
  ringtoneOptionActive: {
    backgroundColor: "rgba(63, 81, 181, 0.15)",
    borderColor: "rgba(186, 195, 255, 0.3)",
  },
  ringtoneTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 14,
  },
  ringtoneSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  permCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  permTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  permDesc: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  summaryCard: {
    gap: spacing.sm,
  },
  summaryHeader: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  summaryHabitName: {
    ...typography.headlineLgMobile,
    fontSize: 22,
    fontWeight: "700",
    color: colors.onSurface,
  },
  summaryGrid: {
    gap: 8,
    marginTop: spacing.xs,
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: radius.default,
    padding: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryKey: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.outline,
  },
  summaryVal: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: "700",
    color: colors.onSurface,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(147, 0, 10, 0.2)",
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: 10,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    fontSize: 13,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.marginEdge,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(19, 19, 19, 0.95)",
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomBarBtn: {
    flex: 1,
  },
  bottomBarBtnMain: {
    flex: 2,
  },
});