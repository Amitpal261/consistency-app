import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
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


export function CreateHabitScreen({ onCreated }: { onCreated: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState("");
  const [taskType, setTaskType] = useState<TaskType>("time");
  const [time, setTime] = useState(() => {
    const d = new Date();
    d.setHours(6, 0, 0, 0);
    return d;
  });
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [windowMinutes, setWindowMinutes] = useState("60");
  const [durationMinutes, setDurationMinutes] = useState("120");
  const [radiusMeters, setRadiusMeters] = useState("150");
  const [locationDeadline, setLocationDeadline] = useState(() => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    return d;
  });
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timePickerTarget, setTimePickerTarget] = useState<"start" | "end" | "deadline" | null>(null);
  const [timePickerDraftHour, setTimePickerDraftHour] = useState(6);
  const [timePickerDraftMinute, setTimePickerDraftMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // wizard step index: 0=type, 1=schedule/location, 2=review
  const [step, setStep] = useState<number>(0);

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


  const formatTime = (value: Date) =>
    `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;

  const openTimeEditor = (target: "start" | "end" | "deadline") => {
    const source = target === "start" ? startTime : target === "end" ? endTime : locationDeadline;
    setTimePickerTarget(target);
    setTimePickerDraftHour(source.getHours());
    setTimePickerDraftMinute(source.getMinutes());
  };

  const applyTimeSelection = () => {
    if (!timePickerTarget) return;

    const nextTime = new Date();
    nextTime.setHours(timePickerDraftHour, timePickerDraftMinute, 0, 0);

    if (timePickerTarget === "start") {
      setStartTime(nextTime);
      setTime(nextTime);
    } else if (timePickerTarget === "end") {
      setEndTime(nextTime);
    } else {
      setLocationDeadline(nextTime);
    }

    setTimePickerTarget(null);
  };

  function toggleDay(day: number) {
    setDaysOfWeek((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort((a, b) => a - b)
    );
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
        verificationMethod: taskType === "time" ? "photo" : "gps",
        timeWindow:
          taskType === "time"
            ? { hour: time.getHours(), minute: time.getMinutes(), windowMinutes: Number(windowMinutes) || 60 }
            : undefined,
        location,
        locationDeadline:
          taskType === "location"
            ? { hour: locationDeadline.getHours(), minute: locationDeadline.getMinutes() }
            : undefined,
        requiredDurationMinutes: taskType === "location_duration" ? Number(durationMinutes) || 120 : undefined,
        daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
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
    if (step < 2) setStep((s) => s + 1);
    else handleCreate();
  };

  const goBack = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  if (timePickerTarget) {
    return (
     <View style={styles.container}>
       <DotGridBackground />

       <View style={styles.header}>
         <Pressable style={styles.headerBackBtn} onPress={() => setTimePickerTarget(null)}>
           <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
         </Pressable>
         <Text style={styles.headerTitle}>Select Time</Text>
         <Pressable onPress={applyTimeSelection}>
           <Text style={styles.stepBadge}>SAVE</Text>
         </Pressable>
       </View>

       <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
         <View style={styles.timePickerScreen}>
           <Text style={styles.kicker}>TIME SETUP</Text>
           <Text style={styles.title}>{timePickerTarget === "start" ? "Start time" : timePickerTarget === "end" ? "End time" : "Deadline"}</Text>

           <View style={styles.timeEditorCard}>
             <View style={styles.timeSelectorWrap}>
               <Text style={styles.timeSelectorLabel}>HOUR</Text>
               <View style={styles.timeSelectorPair}>
                 <Pressable onPress={() => setTimePickerDraftHour((current) => (current + 1) % 24)} style={styles.timeArrowButton}>
                   <MaterialIcons name="keyboard-arrow-up" size={26} color={colors.onSurface} />
                 </Pressable>
                 <Text style={styles.timeSelectorValue}>{String(timePickerDraftHour).padStart(2, "0")}</Text>
                 <Pressable onPress={() => setTimePickerDraftHour((current) => (current - 1 + 24) % 24)} style={styles.timeArrowButton}>
                   <MaterialIcons name="keyboard-arrow-down" size={26} color={colors.onSurface} />
                 </Pressable>
               </View>
             </View>

             <Text style={styles.timeSelectorSeparator}>:</Text>

             <View style={styles.timeSelectorWrap}>
               <Text style={styles.timeSelectorLabel}>MINUTE</Text>
               <View style={styles.timeSelectorPair}>
                 <Pressable onPress={() => setTimePickerDraftMinute((current) => (current + 5) % 60)} style={styles.timeArrowButton}>
                   <MaterialIcons name="keyboard-arrow-up" size={26} color={colors.onSurface} />
                 </Pressable>
                 <Text style={styles.timeSelectorValue}>{String(timePickerDraftMinute).padStart(2, "0")}</Text>
                 <Pressable onPress={() => setTimePickerDraftMinute((current) => (current - 5 + 60) % 60)} style={styles.timeArrowButton}>
                   <MaterialIcons name="keyboard-arrow-down" size={26} color={colors.onSurface} />
                 </Pressable>
               </View>
             </View>
           </View>

           <View style={styles.previewCard}>
             <Text style={styles.previewLabel}>Selected</Text>
             <Text style={styles.selectedTimePreview}>{`${String(timePickerDraftHour).padStart(2, "0")}:${String(timePickerDraftMinute).padStart(2, "0")}`}</Text>
           </View>

           <View style={styles.timePickerActions}>
             <Pressable style={styles.cancelTimeButton} onPress={() => setTimePickerTarget(null)}>
               <Text style={styles.cancelTimeText}>Cancel</Text>
             </Pressable>
             <Pressable style={styles.saveTimeButton} onPress={applyTimeSelection}>
               <Text style={styles.saveTimeText}>Save time</Text>
             </Pressable>
           </View>
         </View>
       </ScrollView>
     </View>
    );
  }

  return (
    <View style={styles.container}>
     <DotGridBackground />

     {/* Top Header */}
     <View style={styles.header}>
        <Pressable style={styles.headerBackBtn} onPress={goBack}>
          <MaterialIcons name={step > 0 ? "arrow-back" : "close"} size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>New Commitment</Text>
        <Text style={styles.stepBadge}>STEP {step + 1} OF 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Floating Orb Icon */}
        <View style={styles.orbWrap}>
          <Animated.View style={[styles.orbGlow, { transform: [{ scale: orbScale }], opacity: orbOpacity }]} />
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.orb}>
            <MaterialIcons
              name={step === 0 ? "add-task" : step === 1 ? "schedule" : "fact-check"}
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
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleTitle}>{`Schedule
Setup`}</Text>
              <Text style={styles.scheduleDrafting}>DRAFTING</Text>
            </View>

            {taskType === "time" ? (
              <>
                <AppCard variant="glass" style={styles.scheduleCard}>
                  <Text style={[styles.sectionHeader, styles.sectionHeaderInline]}>Active Window</Text>
                  <View style={styles.timeRow}>
                    <Pressable style={styles.timeField} onPress={() => openTimeEditor("start")}>
                      <Text style={styles.timeLabel}>Start</Text>
                      <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
                    </Pressable>
                    <MaterialIcons name="arrow-forward" size={18} color={colors.outline} style={styles.timeArrow} />
                    <Pressable style={styles.timeField} onPress={() => openTimeEditor("end")}>
                      <Text style={styles.timeLabel}>End</Text>
                      <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
                    </Pressable>
                  </View>
                </AppCard>

                <AppCard variant="glass" style={styles.scheduleCard}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.sectionHeader, styles.sectionHeaderInline]}>Weekly Cadence</Text>
                    <Text style={styles.dayMeta}>{daysOfWeek.length} Days Selected</Text>
                  </View>
                  <View style={styles.dayGrid}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => {
                      const active = daysOfWeek.includes(index);
                      return (
                        <Pressable
                          key={`${label}-${index}`}
                          onPress={() => toggleDay(index)}
                          style={[styles.dayButton, active && styles.dayButtonActive]}
                        >
                          <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </AppCard>

                <AppCard variant="glass" style={styles.mapCard}>
                  <View style={styles.mapView}>
                    <View style={styles.mapCenterMarker} />
                  </View>
                  <View style={styles.locationBar}>
                    <View style={styles.locationLabelRow}>
                      <MaterialIcons name="location-on" size={18} color={colors.primary} />
                      <Text style={styles.locationText}>Madison Square Workspace</Text>
                    </View>
                    <Text style={styles.locationChange}>CHANGE</Text>
                  </View>
                </AppCard>
              </>
            ) : (
              <AppCard variant="glass" style={styles.cardSection}>
                <Text style={styles.inputLabel}>GEOFENCE RADIUS (METERS)</Text>
                <Text style={styles.infoHint}>Your current phone location will be recorded as the habit target place.</Text>
                <AppTextInput value={radiusMeters} onChangeText={setRadiusMeters} keyboardType="number-pad" />

                {taskType === "location" && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>ARRIVAL DEADLINE</Text>
                    <Pressable style={styles.timeField} onPress={() => openTimeEditor("deadline")}>
                      <Text style={styles.timeLabel}>Deadline</Text>
                      <Text style={styles.timeValue}>{formatTime(locationDeadline)}</Text>
                    </Pressable>
                  </>
                )}

                {taskType === "location_duration" && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>REQUIRED DWELL DURATION (MINUTES)</Text>
                    <AppTextInput value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />
                  </>
                )}
              </AppCard>
            )}

            {taskType === "time" && (
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
            )}
          </View>
        )}


        {/* STEP 2: Review & Lock */}
        {step === 2 && (
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
                      : taskType === "location"
                        ? `${radiusMeters}m Geofence • By ${String(locationDeadline.getHours()).padStart(2, "0")}:${String(locationDeadline.getMinutes()).padStart(2, "0")}`
                        : `${radiusMeters}m Geofence`}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Proof Verification</Text>
                          <Text style={styles.summaryVal}>{(taskType === "time" ? "PHOTO" : "GPS").toUpperCase()}</Text>
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
  sectionHeaderInline: {
    marginBottom: 8,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  scheduleTitle: {
    ...typography.headlineLgMobile,
    fontSize: 42,
    lineHeight: 42,
    fontWeight: "700",
    color: colors.onSurface,
  },
  scheduleDrafting: {
    ...typography.labelCaps,
    color: colors.primary,
    marginTop: 14,
    letterSpacing: 1.8,
    fontSize: 10,
  },
  scheduleCard: {
    borderRadius: 28,
    padding: 18,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  timeField: {
    flex: 1,
    minHeight: 90,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },
  timeLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  timeValue: {
    ...typography.headlineLgMobile,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "600",
    color: colors.onSurface,
  },
  timeArrow: {
    marginTop: 18,
  },
  timePickerScreen: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  timeEditorCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 22,
    paddingHorizontal: 18,
  },
  timeSelectorWrap: {
    alignItems: "center",
    minWidth: 110,
  },
  timeSelectorLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  timeSelectorPair: {
    alignItems: "center",
    gap: 10,
  },
  timeArrowButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  timeSelectorValue: {
    ...typography.headlineLgMobile,
    fontSize: 40,
    lineHeight: 42,
    color: colors.onSurface,
    fontWeight: "700",
  },
  timeSelectorSeparator: {
    ...typography.headlineLgMobile,
    fontSize: 32,
    lineHeight: 32,
    color: colors.outline,
    fontWeight: "700",
  },
  previewCard: {
    backgroundColor: "rgba(10, 14, 26, 0.6)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  previewLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  selectedTimePreview: {
    ...typography.headlineLgMobile,
    fontSize: 28,
    color: colors.primary,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },
  timePickerActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: spacing.xs,
  },
  cancelTimeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
  },
  cancelTimeText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: "700",
  },
  saveTimeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  saveTimeText: {
    ...typography.bodyMd,
    color: colors.onPrimary,
    fontWeight: "700",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayMeta: {
    ...typography.bodyMd,
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  dayGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  dayButtonActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: "rgba(186,195,255,0.4)",
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  dayText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    fontWeight: "700",
  },
  dayTextActive: {
    color: colors.onPrimaryContainer,
  },
  mapCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 28,
  },
  mapView: {
    height: 180,
    backgroundColor: "#dfe4ec",
    justifyContent: "center",
    alignItems: "center",
  },
  mapCenterMarker: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(186,195,255,0.16)",
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  locationBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.28)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  locationText: {
    ...typography.bodyMd,
    fontSize: 16,
    fontWeight: "700",
    color: colors.onSurface,
  },
  locationChange: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 0.8,
    fontWeight: "700",
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