---
name: Resolute Minimalist
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c5c5d4'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8f909e'
  outline-variant: '#454652'
  surface-tint: '#bac3ff'
  primary: '#bac3ff'
  on-primary: '#08218a'
  primary-container: '#3f51b5'
  on-primary-container: '#cacfff'
  inverse-primary: '#4355b9'
  secondary: '#c8c6c6'
  on-secondary: '#303030'
  secondary-container: '#474747'
  on-secondary-container: '#b6b5b4'
  tertiary: '#fabd00'
  on-tertiary: '#3f2e00'
  tertiary-container: '#745600'
  on-tertiary-container: '#ffcc55'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#dee0ff'
  primary-fixed-dim: '#bac3ff'
  on-primary-fixed: '#00105c'
  on-primary-fixed-variant: '#293ca0'
  secondary-fixed: '#e4e2e1'
  secondary-fixed-dim: '#c8c6c6'
  on-secondary-fixed: '#1b1c1c'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#ffdf9e'
  tertiary-fixed-dim: '#fabd00'
  on-tertiary-fixed: '#261a00'
  on-tertiary-fixed-variant: '#5b4300'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-orb:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  body-md:
    fontFamily: Open Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  timer-numeric:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 16px
  margin-edge: 24px
---

## Brand & Style
The design system is anchored in the concept of "Disciplined Serenity." It targets high-achievers who value quiet accountability over loud gamification. The emotional response is one of calm focus—removing digital noise to center the user on their daily commitments.

The visual style is a hybrid of **Minimalism** and **Glassmorphism**, utilizing high-end material textures to create a sense of physical presence. The interface relies on a "glowing orb" as the emotional centerpiece, acting as a living indicator of a user's current streak and state of focus. The transition between light and dark modes represents the natural circadian rhythm of productivity: a warm, paper-like light mode for morning planning and a deep, immersive dark mode for evening reflection and verification.

## Colors
This design system utilizes a dual-state palette designed for seamless transitions.

- **Primary (Deep Indigo):** Used for discipline-related actions, active progress, and primary branding.
- **Secondary (Warm Graphite):** Used for structural elements and secondary button states.
- **Tertiary (Muted Amber):** Reserved strictly for status warnings, highlights, and the "glowing" energy of the central orb.
- **Surface (Dark Mode):** A near-black `#0A0A0A` base with a subtle `#1E1E1E` dot-grid texture overlay (5% opacity).
- **Surface (Light Mode):** A warm off-white `#FAFAF9` with soft, cream-tinted shadows to prevent eye strain.
- **Status Tones:** 
  - Verified: Emerald Soft (#10B981)
  - Missed: Crimson Muted (#EF4444)
  - Pending: Muted Amber (#FFC107)

## Typography
The system uses a high-contrast typographic pairing to balance functional utility with geometric modernism.

**Montserrat** is used for all "active" data points: headers, timers, and progress numbers. Its geometric clarity emphasizes precision and discipline. 

**Open Sans** handles all long-form body text and descriptions. Its humanist proportions ensure readability and provide a softer, more approachable contrast to the rigid numbers. For mobile displays, headlines scale down slightly to maintain balanced white space within glassy card containers.

## Layout & Spacing
The layout follows a strict **8pt grid system**. Elements are grouped within cards that follow a fluid-width model with a maximum center-aligned container for larger devices.

- **Margins:** 24px horizontal safe-areas on mobile to provide a premium, spacious feel.
- **Vertical Rhythm:** Components are spaced in multiples of 8 (e.g., 24px between cards, 48px between sections).
- **The Central Orb:** Always centered horizontally in the upper third of the viewport.
- **The Floating Action Row:** Positioned 32px from the bottom edge, using a dual-action layout (two distinct floating buttons side-by-side).

## Elevation & Depth
Depth is created through "Material Layering" rather than traditional heavy shadows.

- **Level 0 (Base):** Near-black (Dark) or Off-white (Light) with a 24px dot-grid texture.
- **Level 1 (Cards):** Glassmorphic surfaces. 
    - *Dark Mode:* 10% white fill, 20px backdrop blur, and a 1px "glowing" border (Deep Indigo at 30% opacity).
    - *Light Mode:* 40% white fill, 15px backdrop blur, and a soft 8px blur shadow with a 4% neutral tint.
- **Level 2 (The Orb):** Outer glow effect using a multi-layered Gaussian blur (40px radius) in Muted Amber or Deep Indigo, depending on the app state.
- **Level 3 (Pop-overs/Modals):** High-contrast glass with 40px backdrop blur to completely isolate the user from background distractions.

## Shapes
The shape language is defined by ultra-soft, organic radii to counter the "coldness" of the dark mode. 

Standard cards utilize a **32px corner radius** (XL), while smaller buttons and input fields use a **16px radius**. Status pills are fully rounded (pill-shaped) to distinguish them clearly from interactive structural cards. The "Orb" is a perfect circle, representing the wholeness of a completed commitment.

## Components

### The Central Orb
A variable-state circular component. In "Idle" state, it pulses slowly with a Deep Indigo glow. In "Success" state, it expands slightly with a Muted Amber radiance.

### Glassy Commitment Cards
Large (32px radius) cards containing a commitment title, a mini-timer, and a status icon. The edges feature a subtle 1px inner stroke to simulate light hitting the edge of glass.

### Status Pills
Compact indicators using a combination of a colored dot, a specific icon (Check, Clock, X, Flag), and uppercase Montserrat text. 
- *Verified:* Green glow.
- *Missed:* Red desaturated.
- *Pending:* Amber pulse.

### Floating Capture Buttons
Two circular buttons (64x64px) floating at the bottom. The primary button (Deep Indigo) triggers the camera/verification, while the secondary (Graphite) opens the daily log.

### Input Fields
Minimalist underlines with high-focus states. When active, the underline glows in Deep Indigo, and the dot-grid background behind the input increases in density.