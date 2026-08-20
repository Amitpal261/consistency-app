import { Router } from "express";
import rateLimit from "express-rate-limit";
import { CheckIn } from "../models/CheckIn.js";
import { Streak } from "../models/Streak.js";
import { Habit } from "../models/Habit.js";
import { checkInSchema } from "../lib/validators.js";
import { getPromptForUserAndDate } from "../lib/prompts.js";
import { computeImageHash, hammingDistance, DUPLICATE_THRESHOLD_BITS } from "../lib/imageHash.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const checkInRouter = Router();

const checkInLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 10 });

// How long a location_duration habit's session stays "pausable" after the
// user leaves the geofence before it resets to zero for the day.
const DWELL_GRACE_MINUTES = 10;

function dateKeyInTimezone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    date
  );
}

function yesterdayKey(todayKey: string): string {
  const d = new Date(`${todayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Straight-line distance between two GPS points, in meters. Used to verify
// a manually-submitted "I'm here" start-dwell actually is within the
// habit's geofence radius, so the manual fallback button can't be used to
// fake being at the location.
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function isWithinTimeWindow(
  habit: { taskType: string; timeWindow?: { hour?: number | null; minute?: number | null; windowMinutes?: number | null } | null },
  now: Date
): boolean {
  if (habit.taskType !== "time" || !habit.timeWindow) return true;
  const { hour, minute, windowMinutes } = habit.timeWindow;
  if (hour == null || minute == null) return true;

  const scheduled = new Date(now);
  scheduled.setHours(hour, minute, 0, 0);
  const windowEnd = new Date(scheduled.getTime() + (windowMinutes ?? 60) * 60_000);

  return now.getTime() >= scheduled.getTime() && now.getTime() <= windowEnd.getTime();
}

checkInRouter.get("/prompt", requireAuth, async (req: AuthedRequest, res) => {
  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const todayKey = dateKeyInTimezone(new Date(), timezone);
  const prompt = getPromptForUserAndDate(req.userId!, todayKey);
  return res.json({ prompt, date: todayKey });
});

export async function updateStreak(
  userId: any,
  habitId: any,
  todayKey: string
): Promise<{ currentStreak: number; bestStreak: number }> {
  const streak = await Streak.findOneAndUpdate(
    { userId, habitId },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (streak.lastCheckInDateKey === todayKey) {
    return { currentStreak: streak.currentStreak, bestStreak: streak.bestStreak };
  }

  const isConsecutive = streak.lastCheckInDateKey === yesterdayKey(todayKey);
  const newCurrent = isConsecutive ? streak.currentStreak + 1 : 1;

  streak.currentStreak = newCurrent;
  streak.bestStreak = Math.max(streak.bestStreak, newCurrent);
  streak.lastCheckInDateKey = todayKey;
  await streak.save();

  return { currentStreak: newCurrent, bestStreak: streak.bestStreak };
}

function runMockAiPrescreen(): { isApproved: boolean; confidence: number } {
  // 80% chance of high confidence approval, 20% chance of low confidence flagging
  const isApproved = Math.random() < 0.8;
  return {
    isApproved,
    confidence: isApproved ? 0.9 : 0.4,
  };
}

checkInRouter.post("/", requireAuth, checkInLimiter, async (req: AuthedRequest, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.location?.isMockLocation) {
    return res.status(400).json({ error: "Mock location detected. Please disable fake GPS apps." });
  }

  const userId = req.userId!;
  const habit = await Habit.findOne({ _id: parsed.data.habitId, userId });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const needsPhoto = habit.verificationMethod === "photo" || habit.verificationMethod === "photo_gps";
  const needsGps = habit.verificationMethod === "gps" || habit.verificationMethod === "photo_gps";

  if (needsPhoto && !parsed.data.photoBase64) {
    return res.status(400).json({ error: "Photo proof is required for this habit." });
  }
  if (needsGps && !parsed.data.location) {
    return res.status(400).json({ error: "GPS location is required for this habit." });
  }

  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const now = new Date();
  const todayKey = dateKeyInTimezone(now, timezone);

  const alreadyCheckedIn = await CheckIn.exists({
    userId,
    habitId: habit._id,
    checkedInAt: {
      $gte: new Date(`${todayKey}T00:00:00.000Z`),
      $lte: new Date(`${todayKey}T23:59:59.999Z`),
    },
  });
  if (alreadyCheckedIn) {
    return res.status(409).json({ error: "Already checked in today for this habit." });
  }

const withinTimeWindow = isWithinTimeWindow(habit, now);
  if (habit.taskType === "time" && !withinTimeWindow) {
    return res.status(400).json({ error: "This habit's time window has already closed for today." });
  }

  // Location-arrival habits can optionally have a deadline (e.g. "reach the
  // park by 6:00 PM every day") stored in the same timeWindow.hour/minute
  // fields used by time-based habits — here it means "any time today up
  // until this time", not a fixed start+window like the time-based check above.
  if (habit.taskType === "location" && habit.timeWindow?.hour != null && habit.timeWindow?.minute != null) {
    const deadline = new Date(now);
    deadline.setHours(habit.timeWindow.hour, habit.timeWindow.minute, 0, 0);
    if (now.getTime() > deadline.getTime()) {
      return res.status(400).json({ error: "You arrived after today's deadline for this habit." });
    }
  }
  let photoHash: string | undefined;
  if (parsed.data.photoBase64) {
    photoHash = await computeImageHash(parsed.data.photoBase64);

    const recentCheckIns = await CheckIn.find({
      userId,
      habitId: habit._id,
      photoHash: { $exists: true },
    })
      .sort({ checkedInAt: -1 })
      .limit(14)
      .select("photoHash")
      .lean();

    const isDuplicate = recentCheckIns.some(
      (c) => c.photoHash && hammingDistance(c.photoHash, photoHash!) <= DUPLICATE_THRESHOLD_BITS
    );
    if (isDuplicate) {
      return res.status(400).json({
        error: "This looks like a photo you've already used before. Please take a fresh photo.",
      });
    }
  }

  let reviewStatus: "pending" | "approved" | "flagged" | "auto_approved_unreviewed" = "pending";
  let verified = false;

  if (!needsPhoto) {
    reviewStatus = "approved";
    verified = true;
  } else {
    const aiResult = runMockAiPrescreen();
    if (aiResult.isApproved) {
      reviewStatus = "approved";
      verified = true;
    } else {
      if (habit.buddyId) {
        reviewStatus = "pending";
        verified = false;
      } else {
        reviewStatus = "flagged";
        verified = true;
      }
    }
  }

  await CheckIn.create({
    userId,
    habitId: habit._id,
    checkedInAt: now,
    withinTimeWindow,
    location: parsed.data.location,
    photoUrl: parsed.data.photoBase64,
    photoHash,
    verified,
    reviewStatus,
  });

  let currentStreak = 0;
  let bestStreak = 0;

  if (verified) {
    const updated = await updateStreak(userId, habit._id, todayKey);
    currentStreak = updated.currentStreak;
    bestStreak = updated.bestStreak;
  } else {
    const streak = await Streak.findOne({ userId, habitId: habit._id });
    if (streak) {
      currentStreak = streak.currentStreak;
      bestStreak = streak.bestStreak;
    }
  }

  return res.status(201).json({ currentStreak, bestStreak, reviewStatus, verified });
});


checkInRouter.post("/start-dwell", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.location?.isMockLocation) {
    return res.status(400).json({ error: "Mock location detected. Please disable fake GPS apps." });
  }

  const userId = req.userId!;
  const habit = await Habit.findOne({ _id: parsed.data.habitId, userId });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  if (habit.taskType !== "location_duration") {
    return res.status(400).json({ error: "This endpoint is only for location+duration habits." });
  }

  // The background geofence task always sends real coordinates from the
  // Enter event, but this endpoint can also be called manually from the
  // app (a fallback for when background detection is slow/hasn't fired
  // yet) so verify distance here rather than trusting the client.
  if (habit.location?.lat != null && habit.location?.lng != null && parsed.data.location) {
    const distance = distanceMeters(
      { lat: habit.location.lat, lng: habit.location.lng },
      { lat: parsed.data.location.lat, lng: parsed.data.location.lng }
    );
    const radius = habit.location.radiusMeters || 150;
    if (distance > radius) {
      return res.status(400).json({
        error: `You are about ${Math.round(distance)}m away, get within ${radius}m of the target to start tracking.`,
      });
    }
  }

  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const now = new Date();
  const todayKey = dateKeyInTimezone(now, timezone);

  let checkIn = await CheckIn.findOne({
    userId,
    habitId: habit._id,
    checkedInAt: {
      $gte: new Date(`${todayKey}T00:00:00.000Z`),
      $lte: new Date(`${todayKey}T23:59:59.999Z`),
    },
  });

  if (!checkIn) {
    checkIn = await CheckIn.create({
      userId,
      habitId: habit._id,
      checkedInAt: now,
      withinTimeWindow: true,
      location: parsed.data.location,
      lastEntryTimestamp: now,
      totalDwellMinutes: 0,
      completionStatus: "none",
      verified: false,
      reviewStatus: "pending",
    });
  } else if (checkIn.lastEntryTimestamp && !checkIn.lastExitTimestamp) {
    // Already inside and tracking — nothing to do, this is likely a
    // duplicate/retried Enter event.
  } else if (checkIn.graceExpiresAt && now.getTime() > checkIn.graceExpiresAt.getTime()) {
    // They left and did NOT make it back before the grace window closed —
    // the session genuinely resets. This is the real "step out too long
    // and it doesn't count" behavior.
    checkIn.totalDwellMinutes = 0;
    checkIn.completionStatus = "none";
    checkIn.graceExpiresAt = undefined;
    checkIn.lastEntryTimestamp = now;
    checkIn.lastExitTimestamp = undefined;
    await checkIn.save();
  } else {
    // Either no grace was pending, or they made it back in time — resume,
    // keeping whatever totalDwellMinutes was already banked.
    checkIn.graceExpiresAt = undefined;
    checkIn.lastEntryTimestamp = now;
    checkIn.lastExitTimestamp = undefined;
    await checkIn.save();
  }

  return res.status(200).json({ checkIn });
});

checkInRouter.post("/exit-dwell", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const userId = req.userId!;
  const habit = await Habit.findOne({ _id: parsed.data.habitId, userId });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  if (habit.taskType !== "location_duration") {
    return res.status(400).json({ error: "This endpoint is only for location+duration habits." });
  }

  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const now = new Date();
  const todayKey = dateKeyInTimezone(now, timezone);

  const checkIn = await CheckIn.findOne({
    userId,
    habitId: habit._id,
    checkedInAt: {
      $gte: new Date(`${todayKey}T00:00:00.000Z`),
      $lte: new Date(`${todayKey}T23:59:59.999Z`),
    },
  });

  if (!checkIn) {
    return res.status(404).json({ error: "No active check-in found for today. Cannot process exit." });
  }

  if (checkIn.lastEntryTimestamp && !checkIn.lastExitTimestamp) {
    checkIn.lastExitTimestamp = now;
    const entryTime = new Date(checkIn.lastEntryTimestamp).getTime();
    const exitTime = now.getTime();
    const sessionMinutes = (exitTime - entryTime) / (60 * 1000);

    checkIn.totalDwellMinutes = (checkIn.totalDwellMinutes || 0) + sessionMinutes;

    const required = habit.requiredDurationMinutes || 120;
    if (checkIn.totalDwellMinutes >= required) {
      // Goal actually met — this is the only case that completes for real.
      checkIn.completionStatus = "full";
      checkIn.verified = true;
      checkIn.reviewStatus = "approved";
      checkIn.graceExpiresAt = undefined;
    } else {
      // Not done yet — bank the partial minutes, but do NOT mark this
      // verified/approved (that used to happen here, which meant partial
      // dwell time silently counted as a full success). Instead start a
      // real grace countdown: if they come back and finish within
      // DWELL_GRACE_MINUTES, start-dwell resumes it; if not, dwell-status
      // (or the next start-dwell attempt) resets it to zero for the day.
      checkIn.completionStatus = "partial";
      checkIn.verified = false;
      checkIn.graceExpiresAt = new Date(now.getTime() + DWELL_GRACE_MINUTES * 60_000);
    }

    await checkIn.save();

    let currentStreak = 0;
    let bestStreak = 0;

    if (checkIn.verified) {
      const updated = await updateStreak(userId, habit._id, todayKey);
      currentStreak = updated.currentStreak;
      bestStreak = updated.bestStreak;
    }

    return res.status(200).json({ checkIn, currentStreak, bestStreak });
  } else {
    return res.status(200).json({ checkIn });
  }
});


checkInRouter.get("/dwell-status/:habitId", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId!;
  const habit = await Habit.findOne({ _id: req.params.habitId, userId });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  if (habit.taskType !== "location_duration") {
    return res.status(400).json({ error: "This endpoint is only for location+duration habits." });
  }

  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const now = new Date();
  const todayKey = dateKeyInTimezone(now, timezone);

  const checkIn = await CheckIn.findOne({
    userId,
    habitId: habit._id,
    checkedInAt: {
      $gte: new Date(`${todayKey}T00:00:00.000Z`),
      $lte: new Date(`${todayKey}T23:59:59.999Z`),
    },
  });

  const requiredMinutes = habit.requiredDurationMinutes || 120;

  if (!checkIn) {
    return res.json({
      elapsedMinutes: 0,
      requiredMinutes,
      isInGrace: false,
      graceSecondsRemaining: 0,
      isCompleted: false,
    });
  }

  // Grace period genuinely expired since the last check — reset now,
  // persisted, so this is consistent whether the user reopens the app or
  // just leaves it running.
  if (checkIn.graceExpiresAt && now.getTime() > checkIn.graceExpiresAt.getTime()) {
    checkIn.totalDwellMinutes = 0;
    checkIn.completionStatus = "none";
    checkIn.graceExpiresAt = undefined;
    await checkIn.save();

    return res.json({
      elapsedMinutes: 0,
      requiredMinutes,
      isInGrace: false,
      graceSecondsRemaining: 0,
      isCompleted: false,
    });
  }

  if (checkIn.graceExpiresAt) {
    const graceSecondsRemaining = Math.max(
      0,
      Math.round((checkIn.graceExpiresAt.getTime() - now.getTime()) / 1000)
    );
    return res.json({
      elapsedMinutes: checkIn.totalDwellMinutes || 0,
      requiredMinutes,
      isInGrace: true,
      graceSecondsRemaining,
      isCompleted: false,
    });
  }

  // If currently inside the geofence (entered but not yet exited), add the
  // live in-progress session time on top of previously banked
  // totalDwellMinutes, so this keeps counting up between actual exit events.
  let elapsedMinutes = checkIn.totalDwellMinutes || 0;
  if (checkIn.lastEntryTimestamp && !checkIn.lastExitTimestamp) {
    const liveMinutes = (now.getTime() - new Date(checkIn.lastEntryTimestamp).getTime()) / 60000;
    elapsedMinutes += liveMinutes;
  }

  return res.json({
    elapsedMinutes,
    requiredMinutes,
    isInGrace: false,
    graceSecondsRemaining: 0,
    isCompleted: checkIn.completionStatus === "full" || elapsedMinutes >= requiredMinutes,
  });
});

checkInRouter.get("/streaks", requireAuth, async (req: AuthedRequest, res) => {
  const streaks = await Streak.find({ userId: req.userId }).lean();
  return res.json({ streaks });
});