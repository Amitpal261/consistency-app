import React, { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { changeMyPassword, deleteMyAccount, getMyProfile, updateMyProfile, type Profile } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard, AppTextInput } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

export function AccountPrivacyScreen({ onBack }: { onBack: () => void }) {
  const { token, setToken } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    getMyProfile(token)
      .then((res) => {
        setProfile(res.user);
        setName(res.user.name);
      })
      .catch((err) => console.error("Failed to load profile:", err));
  }, [token]);

  async function handleSaveName() {
    if (!token || !name.trim()) return;
    setSavingName(true);
    setNameSaved(false);
    try {
      const res = await updateMyProfile(token, { name: name.trim() });
      setProfile(res.user);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      Alert.alert("Could not save", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword() {
    if (!token || !currentPassword || !newPassword) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    setChangingPassword(true);
    try {
      await changeMyPassword(token, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 2500);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete Account & Data?",
      "This action is irreversible. All habits, streaks, photo check-ins, and buddy connections will be purged permanently.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Everything", style: "destructive", onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteMyAccount(token);
      setToken(null);
    } catch (err) {
      Alert.alert("Deletion Failed", err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Account & Security</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <AppCard variant="hero" style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.iconCircle}>
              <MaterialIcons name="person" size={20} color={colors.surfaceTint} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>PERSONAL PROFILE</Text>
              <Text style={styles.emailSub}>Email: {profile?.email ?? "..."}</Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>DISPLAY NAME</Text>
          <AppTextInput value={name} onChangeText={setName} placeholder="Your name" />

          {nameSaved ? (
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={14} color="#10B981" />
              <Text style={styles.successText}>Display name updated!</Text>
            </View>
          ) : null}

          <AppButton title="Save Profile Changes" onPress={handleSaveName} loading={savingName} variant="primary" />
        </AppCard>

        {/* Change Password Card */}
        <AppCard variant="glass" style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.iconCircle}>
              <MaterialIcons name="lock" size={20} color={colors.surfaceTint} />
            </LinearGradient>
            <Text style={styles.cardTitle}>AUTHENTICATION CREDENTIALS</Text>
          </View>

          <Text style={styles.inputLabel}>CURRENT PASSWORD</Text>
          <AppTextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="••••••••"
            secureTextEntry
          />

          <Text style={[styles.inputLabel, { marginTop: spacing.xs }]}>NEW PASSWORD</Text>
          <AppTextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
          />

          {passwordError ? (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={14} color={colors.error} />
              <Text style={styles.errorText}>{passwordError}</Text>
            </View>
          ) : null}

          {passwordSuccess ? (
            <View style={styles.successBanner}>
              <MaterialIcons name="check-circle" size={14} color="#10B981" />
              <Text style={styles.successText}>Password updated successfully!</Text>
            </View>
          ) : null}

          <AppButton
            title="Update Password"
            variant="secondary"
            onPress={handleChangePassword}
            loading={changingPassword}
          />
        </AppCard>

        {/* Danger Zone Card */}
        <AppCard variant="glass" style={styles.dangerCard}>
          <View style={styles.cardHeaderRow}>
            <LinearGradient colors={["#93000a", "#690005"]} style={styles.iconCircle}>
              <MaterialIcons name="delete-forever" size={20} color={colors.error} />
            </LinearGradient>
            <Text style={[styles.cardTitle, { color: colors.error }]}>DANGER ZONE</Text>
          </View>

          <Text style={styles.dangerDesc}>
            Permanently delete your account. This removes all habit schedules, streak counters, photo proof logs, and buddy relationships.
          </Text>

          <AppButton title="Delete My Account & Data" variant="danger" onPress={confirmDelete} loading={deleting} />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    gap: spacing.sm,
  },
  dangerCard: {
    gap: spacing.sm,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  emailSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  inputLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  dangerDesc: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    padding: 8,
    borderRadius: radius.sm,
  },
  successText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(147, 0, 10, 0.2)",
    padding: 8,
    borderRadius: radius.sm,
  },
  errorText: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.error,
  },
});