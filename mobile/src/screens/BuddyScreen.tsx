import React, { useCallback, useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
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
  approved: { label: "Approved", icon: "check-circle", color: "#10B981" },
  flagged: { label: "Flagged", icon: "flag", color: colors.error },
  pending: { label: "Awaiting Review", icon: "hourglass-top", color: "#fabd00" },
  auto_approved_unreviewed: { label: "Auto-approved", icon: "schedule", color: "#fabd00" },
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function BuddyScreen({ onInviteBuddy }: { onInviteBuddy?: () => void }) {
  const { token } = useAuth();
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"buddies" | "inbox">("inbox");
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
    if (!token || !email.trim()) return;
    setError(null);
    setAdding(true);
    try {
      await addBuddy(token, email.trim());
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

  const allPendingCheckIns = Object.entries(checkInsByBuddy).flatMap(([buddyId, list]) =>
    list
      .filter((c) => c.reviewStatus === "pending")
      .map((c) => ({ ...c, buddyId, buddyName: buddies.find((b) => b._id === buddyId)?.name || "Buddy" }))
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>ACCOUNTABILITY NETWORK</Text>
              <Text style={styles.title}>Buddy Review Inbox</Text>
              <Text style={styles.subtitle}>
                Review your paired buddies' proof submissions and approve or flag check-ins to maintain streak integrity.
              </Text>
            </View>
            {onInviteBuddy ? (
              <AppButton
                title="+ Invite"
                onPress={onInviteBuddy}
                variant="primary"
                style={{ marginTop: 4 }}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.tabContainer}>
          <Pressable
            onPress={() => setActiveTab("inbox")}
            style={[styles.tabBtn, activeTab === "inbox" && styles.tabBtnActive]}
          >
            <MaterialIcons name="inbox" size={16} color={activeTab === "inbox" ? colors.onSurface : colors.outline} />
            <Text style={[styles.tabText, activeTab === "inbox" && styles.tabTextActive]}>
              Review Inbox ({allPendingCheckIns.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("buddies")}
            style={[styles.tabBtn, activeTab === "buddies" && styles.tabBtnActive]}
          >
            <MaterialIcons name="people" size={16} color={activeTab === "buddies" ? colors.onSurface : colors.outline} />
            <Text style={[styles.tabText, activeTab === "buddies" && styles.tabTextActive]}>
              My Buddies ({buddies.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === "inbox" ? (
          allPendingCheckIns.length === 0 ? (
            <AppCard variant="glass" style={styles.emptyCard}>
              <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.emptyOrb}>
                <MaterialIcons name="mark-email-read" size={32} color={colors.surfaceTint} />
              </LinearGradient>
              <Text style={styles.emptyTitle}>Inbox All Clear!</Text>
              <Text style={styles.emptyText}>
                No pending check-in proofs awaiting review right now.
              </Text>
            </AppCard>
          ) : (
            allPendingCheckIns.map((item) => (
              <AppCard key={item._id} variant="hero" style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(item.buddyName)}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.buddyName}>{item.buddyName}</Text>
                    <Text style={styles.reviewTime}>
                      Checked in at {new Date(item.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                  <View style={styles.pendingTag}>
                    <MaterialIcons name="hourglass-top" size={12} color="#fabd00" />
                    <Text style={styles.pendingTagText}>PENDING</Text>
                  </View>
                </View>

                {item.photoUrl ? (
                  <View style={styles.photoWrap}>
                    <Image source={{ uri: item.photoUrl }} style={styles.photo} resizeMode="cover" />
                  </View>
                ) : (
                  <View style={styles.noPhotoBox}>
                    <MaterialIcons name="my-location" size={24} color={colors.primary} />
                    <Text style={styles.noPhotoText}>GPS Geofence Arrival Proof</Text>
                  </View>
                )}

                <View style={styles.actionRow}>
                  <AppButton
                    title="Approve Check-In"
                    onPress={() => handleReview(item.buddyId, item._id, "approve")}
                    variant="primary"
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    title="Flag Proof"
                    variant="danger"
                    onPress={() => handleReview(item.buddyId, item._id, "flag")}
                    style={{ flex: 1 }}
                  />
                </View>
              </AppCard>
            ))
          )
        ) : (
          <View style={styles.buddiesSection}>
            <AppCard variant="glass" style={styles.addCard}>
              <Text style={styles.inputLabel}>ADD ACCOUNTABILITY BUDDY</Text>
              <AppTextInput
                value={email}
                onChangeText={setEmail}
                placeholder="partner@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <AppButton title="Add Buddy by Email" onPress={handleAddBuddy} loading={adding} variant="primary" />
            </AppCard>

            {buddies.length === 0 ? (
              <AppCard variant="glass" style={styles.emptyCard}>
                <View style={styles.emptyOrb}>
                  <MaterialIcons name="person-add-alt" size={32} color={colors.outline} />
                </View>
                <Text style={styles.emptyTitle}>No Buddies Added Yet</Text>
                <Text style={styles.emptyText}>
                  Pair up with a friend or colleague to verify each other's habit check-in proofs.
                </Text>
              </AppCard>
            ) : (
              buddies.map((buddy) => (
                <AppCard key={buddy._id} variant="glass" style={styles.buddyCard}>
                  <View style={styles.buddyMainRow}>
                    <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(buddy.name)}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.buddyName}>{buddy.name}</Text>
                      <Text style={styles.buddyEmail}>{buddy.email}</Text>
                    </View>
                    <View style={styles.activeTag}>
                      <MaterialIcons name="check-circle" size={12} color="#10B981" />
                      <Text style={styles.activeTagText}>PAIRED</Text>
                    </View>
                  </View>
                </AppCard>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  header: {
    gap: 4,
  },
  kicker: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  title: {
    ...typography.headlineLgMobile,
    fontWeight: "700",
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: radius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  tabBtnActive: {
    backgroundColor: "rgba(63, 81, 181, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.3)",
  },
  tabText: {
    ...typography.bodyMd,
    fontSize: 13,
    fontWeight: "600",
    color: colors.outline,
  },
  tabTextActive: {
    color: colors.onSurface,
    fontWeight: "700",
  },
  reviewCard: {
    gap: spacing.md,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  buddyName: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 15,
  },
  reviewTime: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  pendingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(250, 189, 0, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pendingTagText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: "#fabd00",
  },
  photoWrap: {
    width: "100%",
    height: 220,
    borderRadius: radius.default,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  noPhotoBox: {
    padding: spacing.lg,
    borderRadius: radius.default,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    gap: spacing.xs,
  },
  noPhotoText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  buddiesSection: {
    gap: spacing.md,
  },
  addCard: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  buddyCard: {
    padding: spacing.sm,
  },
  buddyMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buddyEmail: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  activeTagText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: "#10B981",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyOrb: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.headlineLgMobile,
    fontSize: 18,
    fontWeight: "700",
    color: colors.onSurface,
  },
  emptyText: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 280,
  },
  errorText: {
    ...typography.bodyMd,
    color: colors.error,
    fontSize: 13,
  },
});