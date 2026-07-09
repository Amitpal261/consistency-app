# Consistency App — Starter

A starter scaffold for a wake-up / habit-consistency accountability app.

## Structure
- `backend/` — Express + TypeScript + MongoDB API (auth, check-ins, streaks)
- `mobile/` — Expo (React Native) + TypeScript app (login, streak view, GPS check-in)

## What's real vs stubbed
- ✅ Auth (signup/login with JWT), MongoDB models, streak calculation logic — fully working
- ✅ GPS-based check-in with mock-location rejection — fully working
- ⚠️ Alarm-that-won't-turn-off — NOT included yet. This needs native module work
  (Android AlarmManager + full-screen intent, and a different, more limited
  approach on iOS due to platform restrictions). Build the check-in flow and
  validate with real users first, then add this.
- ⚠️ Payments (RevenueCat) — not wired up yet, add once you're ready to charge.
- ⚠️ Photo verification — model field exists (`photoUrl`), but the actual
  camera capture + upload-to-S3/R2 flow isn't built yet.

See SETUP.md for step-by-step local setup instructions.
