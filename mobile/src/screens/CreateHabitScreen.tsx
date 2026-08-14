import { useEffect, useRef, useState } from "react";
import { Alert, Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Animated, Easing } from "react-native";
import * as Location from "expo-location";
import { useCameraPermissions } from "expo-camera";
import { MaterialIcons } from '@expo/vector-icons';
import DotGridBackground from "../components/DotGridBackground";
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

  // wizard step index: 0=type,1=schedule/location,2=verification,3=confirm
  const [step, setStep] = useState<number>(0);

  // camera permission — via the modern expo-camera hook (matches CheckInScreen.tsx).
  // The old `Camera.getCameraPermissionsAsync()` static API this used to call was
  // removed from expo-camera entirely, which meant step 2 would crash as soon as
  // a photo-based verification method was selected.
  const [permission, requestPermission] = useCameraPermissions();
  const cameraPermission = permission?.granted ?? null;

  // --- Alarm ringtone selection (time-based habits only) ---
  const [ringtone, setRingtone] = useState<Ringtone>({ kind: "default" });
  const [pickingRingtone, setPickingRingtone] = useState(false);

  // animation refs
  const scrollY = useRef(new Animated.Value(0)).current;
  const orbScale = useRef(new Animated.Value(1)).current;

  // small orb pulse loop
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.06, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.0, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
      Alert.alert("Could not use that file", err instanceof Error ? err.message : "Please try a different audio file.");
    } finally {
      setPickingRingtone(false);
    }
  }

  const requestCamera = async () => {
    const res = await requestPermission();
    if (!res.granted) {
      Alert.alert("Camera permission needed", "Please enable camera permission in settings to use photo verification.");
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

  const canGoNext = () => {
    if (step === 0) return !!name.trim();
    if (step === 1) return true; // schedule/location inputs are optional until create
    if (step === 2) return true; // verification selection ok; camera permission handled separately
    return true;
  };

  const goNext = () => {
    if (!canGoNext()) return;
    if (step < 3) setStep((s) => s + 1); else handleCreate();
  };
  const goBack = () => { if (step > 0) setStep((s) => s - 1); };

  // helper renderers for exact design cards
  const renderTaskTypeCard = (t: typeof TASK_TYPES[number]) => {
    const active = taskType === t.value;
    const iconName = t.value === 'time' ? 'alarm' : t.value === 'location' ? 'location_on' : 'schedule';
    return (
      <Pressable key={t.value} onPress={() => setTaskType(t.value)} style={[styles.card, active && styles.cardActive]}>
        <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
          <MaterialIcons name={iconName as any} size={22} color={active ? colors.onPrimaryContainer : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t.label}</Text>
          <Text style={styles.cardSubtitle}>{t.description}</Text>
        </View>
      </Pressable>
    );
  };

  const renderVerificationCard = (v: typeof VERIFICATION_METHODS[number]) => {
    const active = verificationMethod === v.value;
    const iconName = v.value === 'photo' ? 'photo_camera' : v.value === 'gps' ? 'location_on' : 'security';
    return (
      <Pressable key={v.value} onPress={() => setVerificationMethod(v.value)} style={[styles.card, active && styles.cardActive]}>
        <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
          <MaterialIcons name={iconName as any} size={22} color={active ? colors.onPrimaryContainer : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{v.label}</Text>
        </View>
      </Pressable>
    );
  };

  const orbTranslateY = scrollY.interpolate ? scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -18], extrapolate: 'clamp' }) : scrollY;

  return (
    <View style={styles.container}>
      <DotGridBackground />

      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => { if (step > 0) goBack(); }}>
          <MaterialIcons name={step > 0 ? 'arrow_back' : 'close'} size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Consistency</Text>
        <Text style={styles.headerRight}>STEP {Math.min(step + 1, 3)} OF 3</Text>
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Orb */}
        <Animated.View style={[styles.orbWrap, { transform: [{ translateY: orbTranslateY }, { scale: orbScale }] }]}>
          <Animated.View style={styles.orbGlow} />
          <View style={styles.orbInner}>
            <MaterialIcons name="verified_user" size={36} color={colors.primary} />
            <Text style={styles.orbLabel}>Select Method</Text>
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={styles.title}>Choose your path to accountability</Text>

        {/* Step content */}
        {step === 0 && (
          <View style={styles.stack}>
            <AppCard style={styles.section}>
              <Text style={styles.sectionLabel}>NAME</Text>
              <AppTextInput value={name} onChangeText={setName} placeholder="e.g. Morning Gym Session" />
            </AppCard>

            <AppCard style={styles.section}>
              <Text style={styles.sectionLabel}>PICK TYPE</Text>
              <View style={{ gap: 12 }}>
                {TASK_TYPES.map(renderTaskTypeCard)}
              </View>
            </AppCard>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stack}>
            {taskType === 'time' ? (
              <>
                <AppCard style={[styles.section, { alignItems: 'center' }]}>
                  <Text style={styles.sectionLabel}>ACTIVE WINDOW</Text>
                  <DateTimePicker
                    value={time}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                    onChange={(_, selected) => selected && setTime(selected)}
                    themeVariant="dark"
                  />
                </AppCard>

                <AppCard style={styles.section}>
                  <Text style={styles.sectionLabel}>ALARM SOUND</Text>
                  <Pressable onPress={() => setRingtone({ kind: 'default' })} style={[styles.smallOption, ringtone.kind === 'default' && styles.smallOptionActive]}>
                    <Text style={styles.smallOptionTitle}>Default alarm sound</Text>
                    <Text style={styles.smallOptionSub}>Uses your phone's default alarm ringtone.</Text>
                  </Pressable>

                  <Pressable onPress={handlePickCustomRingtone} style={[styles.smallOption, ringtone.kind === 'custom' && styles.smallOptionActive, { marginTop: 10 }]}>
                    <Text style={styles.smallOptionTitle}>{pickingRingtone ? 'Opening file picker…' : 'Choose audio file from phone'}</Text>
                    {ringtone.kind === 'custom' && ringtone.name ? <Text style={styles.smallOptionSub}>✅ {ringtone.name}</Text> : <Text style={styles.smallOptionSub}>Pick any mp3/wav/m4a from your device.</Text>}
                  </Pressable>
                </AppCard>
              </>
            ) : (
              <AppCard style={styles.section}>
                <Text style={styles.sectionLabel}>TARGET LOCATION</Text>
                <Text style={styles.sectionBody}>Your current location will be used as the target place.</Text>
                <Text style={[styles.sectionLabel, { marginTop: 8 }]}>RADIUS (METERS)</Text>
                <AppTextInput value={radiusMeters} onChangeText={setRadiusMeters} keyboardType="number-pad" />
                {taskType === 'location_duration' && (
                  <>
                    <Text style={styles.sectionLabel}>REQUIRED DURATION (MINUTES)</Text>
                    <AppTextInput value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" />
                  </>
                )}
              </AppCard>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stack}>
            <AppCard style={styles.section}>
              <Text style={styles.sectionLabel}>VERIFICATION METHOD</Text>
              <View style={{ gap: 12 }}>
                {VERIFICATION_METHODS.map(renderVerificationCard)}
              </View>
            </AppCard>

            {(verificationMethod === 'photo' || verificationMethod === 'photo_gps') && cameraPermission === false && (
              <AppCard style={styles.section}>
                <Text style={styles.sectionLabel}>Camera Access</Text>
                <Text style={styles.sectionBody}>We use the camera for quick verification photos to keep you on track.</Text>
                <View style={{ marginTop: 12 }}>
                  <AppButton title="Enable Camera" onPress={requestCamera} />
                  <Pressable style={{ marginTop: 10 }} onPress={() => { /* maybe later */ }}>
                    <Text style={styles.maybeLater}>Maybe later</Text>
                  </Pressable>
                </View>
              </AppCard>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stack}>
            <AppCard style={styles.section}>
              <Text style={styles.sectionLabel}>REVIEW</Text>
              <View style={{ gap: 8 }}>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>TYPE & LOCATION</Text><Text style={styles.summaryValue}>{taskType === 'time' ? 'Time-based' : taskType === 'location' ? 'Location' : 'Location + duration'}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>SCHEDULE</Text><Text style={styles.summaryValue}>{taskType === 'time' ? `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}` : `${radiusMeters} m`}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>PROOF METHOD</Text><Text style={styles.summaryValue}>{verificationMethod}</Text></View>
              </View>
            </AppCard>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: 140 }} />
      </Animated.ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.cancelBtn} onPress={() => { if (step > 0) goBack(); }}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </Pressable>
        <AppButton title={step === 3 ? 'Save Commitment' : 'CONTINUE'} onPress={goNext} loading={saving} />
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, paddingHorizontal: spacing.marginEdge, paddingTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'absolute', left: 0, right: 0, zIndex: 30 },
  headerLeft: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.onSurface, fontSize: 18, fontWeight: '600' },
  headerRight: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  scrollContent: { paddingTop: 84, paddingHorizontal: spacing.marginEdge, paddingBottom: 20 },
  orbWrap: { alignSelf: 'center', marginTop: 8, width: 160, height: 160, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  orbGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary, opacity: 0.12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 30 },
  orbInner: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  orbLabel: { marginTop: 8, color: colors.primary, fontSize: 13, fontWeight: '700' },
  title: { textAlign: 'center', color: colors.onSurface, fontSize: 20, marginTop: 10, marginBottom: 18, fontWeight: '600' },
  stack: { gap: 12 },
  section: { padding: 16, marginBottom: 12 },
  sectionLabel: { color: colors.onSurfaceVariant || colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8 },
  sectionBody: { color: colors.onSurfaceVariant || colors.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 12 },
  cardActive: { backgroundColor: colors.surfaceContainerHighest || colors.primaryContainer || colors.surface, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.14, shadowOffset: { width: 0, height: 10 }, shadowRadius: 20 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainer, borderWidth: 1, borderColor: colors.border },
  iconCircleActive: { backgroundColor: colors.primaryContainer || colors.primary, borderColor: colors.primary },
  cardTitle: { color: colors.onSurface, fontWeight: '700' },
  cardSubtitle: { color: colors.onSurfaceVariant || colors.textSecondary, fontSize: 12 },
  smallOption: { padding: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  smallOptionActive: { backgroundColor: colors.primaryMuted || colors.primary, borderColor: colors.primary },
  smallOptionTitle: { color: colors.onSurface, fontWeight: '700' },
  smallOptionSub: { color: colors.onSurfaceVariant || colors.textSecondary, fontSize: 12 },
  maybeLater: { color: colors.onSurfaceVariant || colors.textSecondary, textAlign: 'center', textTransform: 'uppercase', fontWeight: '700' },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  cancelText: { color: colors.onSurfaceVariant || colors.textSecondary, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: colors.onSurfaceVariant || colors.textSecondary, fontSize: 12 },
  summaryValue: { color: colors.onSurface, fontWeight: '600' },
  error: { color: colors.danger, textAlign: 'center', marginTop: 8 }
});