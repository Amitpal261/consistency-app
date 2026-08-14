import React, { useState } from "react";
import { Alert, Clipboard, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import DotGridBackground from "../components/DotGridBackground";
import { AppButton } from "../components/AppButton";
import { AppCard } from "../components/AppCard";
import { colors, radius, spacing, typography } from "../theme/colors";

export function InviteBuddyScreen({ onBack }: { onBack?: () => void }) {
  const inviteCode = "CONSISTENCY-8842-X7";
  const inviteUrl = `https://consistency-app.com/invite/${inviteCode}`;
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    Clipboard.setString(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DotGridBackground />

      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Invite Accountability Buddy</Text>
      </View>

      <View style={styles.container}>
        {/* Floating QR / Pair Orb */}
        <View style={styles.orbWrap}>
          <View style={styles.orbGlow} />
          <LinearGradient colors={["#3f51b5", "#08218a"]} style={styles.orb}>
            <MaterialIcons name="qr-code-2" size={44} color={colors.surfaceTint} />
          </LinearGradient>
        </View>

        <View style={styles.titleArea}>
          <Text style={styles.kicker}>PARTNER PAIRING</Text>
          <Text style={styles.title}>Invite Your Buddy</Text>
          <Text style={styles.subtitle}>
            Share your unique pairing link or code with a friend to start reviewing each other's check-in proof photos.
          </Text>
        </View>

        {/* Invite Code Glass Card */}
        <AppCard variant="hero" style={styles.card}>
          <Text style={styles.codeLabel}>YOUR UNIQUE PAIRING CODE</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{inviteCode}</Text>
          </View>

          <AppButton
            title={copied ? "Link Copied to Clipboard ✓" : "Copy Invite Link"}
            onPress={handleCopy}
            variant="primary"
            icon={<MaterialIcons name={copied ? "check" : "content-copy"} size={18} color="#FFFFFF" />}
            style={{ width: "100%" }}
          />
        </AppCard>

        {/* Partner Trust Note */}
        <AppCard variant="glass" style={styles.trustCard}>
          <MaterialIcons name="verified-user" size={24} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.trustTitle}>Reciprocal Buddy Protocol</Text>
            <Text style={styles.trustSub}>
              Buddies auto-receive notifications when check-in photos need review. Unreviewed check-ins auto-approve in 12 hours.
            </Text>
          </View>
        </AppCard>
      </View>
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
    paddingHorizontal: spacing.marginEdge,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.marginEdge,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  orbWrap: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  orbGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: radius.full,
    backgroundColor: "rgba(63, 81, 181, 0.35)",
  },
  orb: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(186, 195, 255, 0.25)",
    elevation: 10,
  },
  titleArea: {
    alignItems: "center",
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
    textAlign: "center",
  },
  subtitle: {
    ...typography.bodyMd,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
  },
  card: {
    width: "100%",
    alignItems: "center",
    gap: spacing.sm,
  },
  codeLabel: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  codeBox: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.default,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  codeText: {
    ...typography.headlineLgMobile,
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: 2,
  },
  trustCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  trustTitle: {
    ...typography.bodyMd,
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: 14,
  },
  trustSub: {
    ...typography.bodyMd,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
});
