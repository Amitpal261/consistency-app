// Color psychology behind this palette:
// - Deep indigo/violet (primary) = discipline, focus, trust — same family
//   used by focus/meditation apps like Calm and Headspace.
// - Warm amber (streak/accent) = energy + urgency — the same reason
//   Duolingo and Snapchat render streaks as an orange flame, not a neutral number.
// - Dark background by default = this app gets used at 5am and at night;
//   dark doesn't hurt eyes half-asleep, and reads as premium/serious rather
//   than generic.
//
// Design tokens: mobile/design-reference/resolute_minimalist/DESIGN.md

export const fontFamilies = {
  montserrat: "Montserrat",
  openSans: "Open Sans",
} as const;

export const colors = {
  // Surfaces
  surface: "#131313",
  surfaceDim: "#131313",
  surfaceBright: "#393939",
  surfaceContainerLowest: "#0e0e0e",
  surfaceContainerLow: "#1c1b1b",
  surfaceContainer: "#201f1f",
  surfaceContainerHigh: "#2a2a2a",
  surfaceContainerHighest: "#353534",
  onSurface: "#e5e2e1",
  onSurfaceVariant: "#c5c5d4",
  inverseSurface: "#e5e2e1",
  inverseOnSurface: "#313030",
  outline: "#8f909e",
  outlineVariant: "#454652",
  surfaceTint: "#bac3ff",
  surfaceVariant: "#353534",

  // Primary (Deep Indigo)
  primary: "#bac3ff",
  onPrimary: "#08218a",
  primaryContainer: "#3f51b5",
  onPrimaryContainer: "#cacfff",
  inversePrimary: "#4355b9",
  primaryFixed: "#dee0ff",
  primaryFixedDim: "#bac3ff",
  onPrimaryFixed: "#00105c",
  onPrimaryFixedVariant: "#293ca0",

  // Secondary (Warm Graphite)
  secondary: "#c8c6c6",
  onSecondary: "#303030",
  secondaryContainer: "#474747",
  onSecondaryContainer: "#b6b5b4",
  secondaryFixed: "#e4e2e1",
  secondaryFixedDim: "#c8c6c6",
  onSecondaryFixed: "#1b1c1c",
  onSecondaryFixedVariant: "#474747",

  // Tertiary (Muted Amber)
  tertiary: "#fabd00",
  onTertiary: "#3f2e00",
  tertiaryContainer: "#745600",
  onTertiaryContainer: "#ffcc55",
  tertiaryFixed: "#ffdf9e",
  tertiaryFixedDim: "#fabd00",
  onTertiaryFixed: "#261a00",
  onTertiaryFixedVariant: "#5b4300",

  // Error
  error: "#ffb4ab",
  onError: "#690005",
  errorContainer: "#93000a",
  onErrorContainer: "#ffdad6",

  // Background
  background: "#131313",
  onBackground: "#e5e2e1",

  // Status tones (from design doc)
  verified: "#10B981",
  missed: "#EF4444",
  pending: "#FFC107",

  // Light-mode surfaces (from design doc prose)
  surfaceLight: "#FAFAF9",
  surfaceDarkBase: "#0A0A0A",
  surfaceDarkTexture: "#1E1E1E",

  // Legacy aliases — keep existing call sites working
  surfaceElevated: "#2a2a2a",
  border: "#454652",
  primaryMuted: "#4355b9",
  primaryText: "#cacfff",
  accent: "#fabd00",
  accentMuted: "#745600",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#FFC107",
  textPrimary: "#e5e2e1",
  textSecondary: "#c5c5d4",
  textMuted: "#8f909e",
};

/** 8pt grid spacing from the Resolute Minimalist design system. */
export const spacing = {
  base: 8,
  xs: 4,
  sm: 12,
  md: 24,
  lg: 40,
  xl: 64,
  gutter: 16,
  marginEdge: 24,
};

/** Corner radii — rem values converted at 16px root. */
export const radius = {
  sm: 8,
  default: 16,
  md: 24,
  lg: 32,
  xl: 48,
  full: 9999,
  /** @deprecated Use `full` */
  pill: 9999,
};

export const typography = {
  displayOrb: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 48,
    fontWeight: "700" as const,
    lineHeight: 56,
    letterSpacing: -0.96,
    color: colors.onSurface,
  },
  headlineLg: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 32,
    fontWeight: "600" as const,
    lineHeight: 40,
    color: colors.onSurface,
  },
  headlineLgMobile: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 36,
    color: colors.onSurface,
  },
  bodyMd: {
    fontFamily: fontFamilies.openSans,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    color: colors.onSurfaceVariant,
  },
  labelCaps: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 12,
    fontWeight: "700" as const,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    color: colors.outline,
  },
  timerNumeric: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 24,
    fontWeight: "500" as const,
    lineHeight: 32,
    letterSpacing: 1.2,
    color: colors.onSurface,
  },

  // Legacy aliases — keep existing call sites working
  h1: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 36,
    color: colors.textPrimary,
  },
  h2: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 24,
    fontWeight: "500" as const,
    lineHeight: 32,
    color: colors.textPrimary,
  },
  body: {
    fontFamily: fontFamilies.openSans,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  label: {
    fontFamily: fontFamilies.montserrat,
    fontSize: 12,
    fontWeight: "700" as const,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    color: colors.textMuted,
  },
};
