// Color psychology behind this palette:
// - Deep indigo/violet (primary) = discipline, focus, trust — same family
//   used by focus/meditation apps like Calm and Headspace.
// - Warm amber (streak/accent) = energy + urgency — the same reason
//   Duolingo and Snapchat render streaks as an orange flame, not a neutral number.
// - Dark background by default = this app gets used at 5am and at night;
//   dark doesn't hurt eyes half-asleep, and reads as premium/serious rather
//   than generic.

export const colors = {
  background: "#1e1b1a",
  surface: "#141A2A",
  surfaceElevated: "#1B2236",
  border: "#262F45",

  primary: "#6366F1",
  primaryMuted: "#4338CA",
  primaryText: "#EDEBFF",

  accent: "#F59E0B",
  accentMuted: "#B45309",

  success: "#34D399",
  danger: "#F87171",
  warning: "#FBBF24",

  textPrimary: "#F5F6FA",
  textSecondary: "#9CA3C2",
  textMuted: "#5B6486",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "800" as const, color: colors.textPrimary },
  h2: { fontSize: 20, fontWeight: "700" as const, color: colors.textPrimary },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.textSecondary },
  label: { fontSize: 13, fontWeight: "600" as const, color: colors.textMuted },
};