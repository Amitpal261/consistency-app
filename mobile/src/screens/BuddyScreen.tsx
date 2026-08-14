import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
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
import DotGridBackground from "../components/DotGridBackground";
import { colors, radius, spacing, typography } from "../theme/colors";

const STATUS_META: Record<
  BuddyCheckIn["reviewStatus"],
  { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string }
> = {
  approved: { label: "Approved", icon: "check-circle", color: colors.success },
  flagged: { label: "Flagged", icon: "flag", color: colors.error },
  pending: { label: "Awaiting your review", icon: "hourglass-top", color: colors.warning },
  auto_approved_unreviewed: { label: "Auto-approved (no review in time)", icon: "schedule", color: colors.warning },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background  }}>
      <DotGridBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.marginEdge, gap: spacing.md }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={typography.h1}>Buddies</Text>
          <Text style={[typography.bodyMd, { marginTop: 2 }]}>
            Keep each other honest — your buddies review your photo check-ins.
          </Text>
        </View>

        <AppCard style={{ gap: spacing.sm }}>
          <Text style={typography.labelCaps}>Add a buddy by email</Text>
          <AppTextInput
            value={email}
            onChangeText={setEmail}
            placeholder="friend@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}
          <AppButton title="Add buddy" onPress={handleAddBuddy} loading={adding} />
        </AppCard>

        {buddies.length === 0 ? (
          <AppCard style={{ alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm }}>
            <View style={styles.emptyIconWrap}>
              <MaterialIcons name="people-outline" size={32} color={colors.onSurfaceVariant} />
            </View>
            <Text style={[typography.bodyMd, { textAlign: "center" }]}>
              No buddies yet — add one above to start keeping each other accountable.
            </Text>
          </AppCard>
        ) : (
          buddies.map((buddy) => {
            const checkIns = checkInsByBuddy[buddy._id] ?? [];
            return (
              <AppCard key={buddy._id} style={{ gap: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(buddy.name)}</Text>
                  </View>
                  <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                    <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 16 }}>{buddy.name}</Text>
                    <Text style={[typography.bodyMd, { fontSize: 13 }]}>{buddy.email}</Text>
                  </View>
                </View>

                {checkIns.length === 0 ? (
                  <Text style={typography.bodyMd}>No check-in yet today.</Text>
                ) : (
                  <View style={{ gap: spacing.sm }}>
                    {checkIns.map((c) => {
                      const meta = STATUS_META[c.reviewStatus];
                      return (
                        <View key={c._id} style={styles.checkInRow}>
                          {c.photoUrl ? (
                            <Image source={{ uri: c.photoUrl }} style={styles.photo} resizeMode="cover" />
                          ) : (
                            <View style={[styles.photo, styles.photoPlaceholder]}>
                              <MaterialIcons name="place" size={20} color={colors.onSurfaceVariant} />
                            </View>
                          )}

                          <Text style={[typography.bodyMd, { fontSize: 13 }]}>
                            {new Date(c.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>

                          {c.reviewStatus === "pending" ? (
                            <View style={{ flexDirection: "row", gap: spacing.sm, width: "100%" }}>
                              <AppButton
                                title="Approve"
                                onPress={() => handleReview(buddy._id, c._id, "approve")}
                                style={{ flex: 1 }}
                              />
                              <AppButton
                                title="Flag"
                                variant="danger"
                                onPress={() => handleReview(buddy._id, c._id, "flag")}
                                style={{ flex: 1 }}
                              />
                            </View>
                          ) : (
                            <View style={[styles.statusChip, { backgroundColor: `${meta.color}22` }]}>
                              <MaterialIcons name={meta.icon} size={14} color={meta.color} />
                              <Text style={{ color: meta.color, fontWeight: "700", fontSize: 12, marginLeft: 4 }}>
                                {meta.label}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </AppCard>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: "rgba(186,195,255,0.14)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  avatarText: { color: colors.primary, fontWeight: "700" as const, fontSize: 15 },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  checkInRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: spacing.sm,
    flexWrap: "wrap" as const,
  },
  photo: { width: 44, height: 44, borderRadius: radius.sm },
  photoPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statusChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
};