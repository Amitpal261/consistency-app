import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  addBuddy,
  type Buddy,
  type BuddyCheckIn,
  getBuddies,
  getBuddyTodayCheckIns,
  reviewCheckIn,
} from "../lib/api";
import { AppButton } from "../components/AppButton";
import { AppCard, AppTextInput } from "../components/AppCard";
import { colors, spacing, typography } from "../theme/colors";

export function BuddyScreen() {
  const { token } = useAuth();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [checkInsByBuddy, setCheckInsByBuddy] = useState<Record<string, BuddyCheckIn[]>>({});

  const loadBuddies = useCallback(async () => {
    if (!token) return;
    const res = await getBuddies(token);
    setBuddies(res.buddies);
    for (const buddy of res.buddies) {
      getBuddyTodayCheckIns(token, buddy._id).then((r) =>
        setCheckInsByBuddy((prev) => ({ ...prev, [buddy._id]: r.checkIns }))
      );
    }
  }, [token]);

  useEffect(() => {
    loadBuddies();
  }, [loadBuddies]);

  async function handleAddBuddy() {
    if (!token || !email) return;
    setError(null);
    setAdding(true);
    try {
      await addBuddy(token, email);
      setEmail("");
      await loadBuddies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add buddy");
    } finally {
      setAdding(false);
    }
  }

  async function handleReview(buddyId: string, checkInId: string, action: "approve" | "flag") {
    if (!token) return;
    await reviewCheckIn(token, checkInId, action);
    setCheckInsByBuddy((prev) => ({
      ...prev,
      [buddyId]: (prev[buddyId] ?? []).map((c) =>
        c._id === checkInId ? { ...c, reviewStatus: action === "approve" ? "approved" : "flagged" } : c
      ),
    }));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <Text style={typography.h1}>Buddy</Text>

      <AppCard style={{ gap: spacing.sm }}>
        <Text style={typography.label}>ADD A BUDDY BY EMAIL</Text>
        <AppTextInput
          value={email}
          onChangeText={setEmail}
          placeholder="friend@email.com"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <AppButton title="Add buddy" onPress={handleAddBuddy} loading={adding} />
      </AppCard>

      {buddies.length === 0 ? (
        <AppCard>
          <Text style={typography.body}>No buddies yet — add one to start keeping each other accountable.</Text>
        </AppCard>
      ) : (
        buddies.map((buddy) => (
          <AppCard key={buddy._id} style={{ gap: spacing.sm }}>
            <Text style={typography.h2}>{buddy.name}</Text>
            <Text style={[typography.body, { marginBottom: spacing.xs }]}>{buddy.email}</Text>

            {(checkInsByBuddy[buddy._id] ?? []).length === 0 ? (
              <Text style={typography.body}>No check-in yet today.</Text>
            ) : (
              (checkInsByBuddy[buddy._id] ?? []).map((c) => (
                <View key={c._id} style={{ gap: spacing.sm }}>
                  {c.photoUrl ? (
                    <Image
                      source={{ uri: c.photoUrl }}
                      style={{ width: "100%", height: 200, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ) : null}
                  <Text style={typography.body}>
                    {c.habitType} · {new Date(c.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                  {c.reviewStatus === "pending" ? (
                    <View style={{ flexDirection: "row", gap: spacing.sm }}>
                      <AppButton title="Approve" onPress={() => handleReview(buddy._id, c._id, "approve")} style={{ flex: 1 }} />
                      <AppButton
                        title="Flag"
                        variant="danger"
                        onPress={() => handleReview(buddy._id, c._id, "flag")}
                        style={{ flex: 1 }}
                      />
                    </View>
                  ) : (
                    <Text style={{ color: c.reviewStatus === "approved" ? colors.success : colors.danger, fontWeight: "700" }}>
                      {c.reviewStatus === "approved" ? "✅ Approved" : "🚩 Flagged"}
                    </Text>
                  )}
                </View>
              ))
            )}
          </AppCard>
        ))
      )}
    </ScrollView>
  );
}