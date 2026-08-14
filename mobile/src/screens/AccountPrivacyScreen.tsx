import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { changeMyPassword, deleteMyAccount, getMyProfile, updateMyProfile, type Profile } from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard, AppTextInput } from "../components/AppCard";
import DotGridBackground from "../components/DotGridBackground";
import { colors, spacing, typography } from "../theme/colors";

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
      "Delete your account?",
      "This permanently deletes your habits, streaks, check-ins, and buddy connections. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete everything", style: "destructive", onPress: handleDelete },
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
      Alert.alert("Could not delete account", err instanceof Error ? err.message : "Something went wrong");
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <DotGridBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.marginEdge, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Pressable onPress={onBack} style={{ marginRight: spacing.sm, padding: 4 }}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
          <Text style={typography.h1}>Account & Privacy</Text>
        </View>

        <AppCard style={{ gap: spacing.sm }}>
          <Text style={typography.labelCaps}>Name</Text>
          <AppTextInput value={name} onChangeText={setName} placeholder="Your name" />
          <Text style={[typography.bodyMd, { fontSize: 12 }]}>Email: {profile?.email ?? "…"}</Text>
          {nameSaved ? <Text style={{ color: colors.success, fontSize: 13 }}>Saved ✓</Text> : null}
          <AppButton title="Save name" onPress={handleSaveName} loading={savingName} />
        </AppCard>

        <AppCard style={{ gap: spacing.sm }}>
          <Text style={typography.labelCaps}>Change password</Text>
          <AppTextInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Current password"
            secureTextEntry
          />
          <AppTextInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password (min 8 characters)"
            secureTextEntry
          />
          {passwordError ? <Text style={{ color: colors.error, fontSize: 13 }}>{passwordError}</Text> : null}
          {passwordSuccess ? (
            <Text style={{ color: colors.success, fontSize: 13 }}>Password updated ✓</Text>
          ) : null}
          <AppButton
            title="Update password"
            variant="secondary"
            onPress={handleChangePassword}
            loading={changingPassword}
          />
        </AppCard>

        <AppCard style={{ gap: spacing.sm, borderColor: "rgba(239,68,68,0.25)" }}>
          <Text style={[typography.labelCaps, { color: colors.error }]}>Danger zone</Text>
          <Text style={typography.bodyMd}>
            Permanently delete your account and all habits, streaks, check-ins, and buddy connections.
          </Text>
          <AppButton title="Delete my account" variant="danger" onPress={confirmDelete} loading={deleting} />
        </AppCard>
      </ScrollView>
    </SafeAreaView>
  );
}