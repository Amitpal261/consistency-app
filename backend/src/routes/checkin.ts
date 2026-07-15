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
  } else {
    if (checkIn.lastEntryTimestamp && !checkIn.lastExitTimestamp) {
      // already in progress
    } else {
      checkIn.lastEntryTimestamp = now;
      checkIn.lastExitTimestamp = undefined;
      await checkIn.save();
    }
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
      checkIn.completionStatus = "full";
      checkIn.verified = true;
      checkIn.reviewStatus = "approved";
    } else if (checkIn.totalDwellMinutes > 0) {
      checkIn.completionStatus = "partial";
      checkIn.verified = true;
      checkIn.reviewStatus = "approved";
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


checkInRouter.get("/streaks", requireAuth, async (req: AuthedRequest, res) => {
  const streaks = await Streak.find({ userId: req.userId }).lean();
  return res.json({ streaks });
});