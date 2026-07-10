import { Router } from "express";
import rateLimit from "express-rate-limit";
import { CheckIn } from "../models/CheckIn.js";
import { Streak } from "../models/Streak.js";
import { checkInSchema } from "../lib/validators.js";
import { getPromptForUserAndDate } from "../lib/prompts.js";
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

checkInRouter.get("/prompt", requireAuth, async (req: AuthedRequest, res) => {
  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const todayKey = dateKeyInTimezone(new Date(), timezone);
  const prompt = getPromptForUserAndDate(req.userId!, todayKey);
  return res.json({ prompt, date: todayKey });
});

checkInRouter.post("/", requireAuth, checkInLimiter, async (req: AuthedRequest, res) => {
  const parsed = checkInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.location?.isMockLocation) {
    return res.status(400).json({ error: "Mock location detected. Please disable fake GPS apps." });
  }

  const userId = req.userId!;
  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const now = new Date();
  const todayKey = dateKeyInTimezone(now, timezone);

  const alreadyCheckedIn = await CheckIn.exists({
    userId,
    habitType: parsed.data.habitType,
    checkedInAt: {
      $gte: new Date(`${todayKey}T00:00:00.000Z`),
      $lte: new Date(`${todayKey}T23:59:59.999Z`),
    },
  });
  if (alreadyCheckedIn) {
    return res.status(409).json({ error: "Already checked in today for this habit." });
  }

  await CheckIn.create({
    userId,
    habitType: parsed.data.habitType,
    checkedInAt: now,
    location: parsed.data.location,
    photoUrl: parsed.data.photoBase64,
  });

  const streak = await Streak.findOneAndUpdate(
    { userId, habitType: parsed.data.habitType },
    {},
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const isConsecutive = streak.lastCheckInDateKey === yesterdayKey(todayKey);
  const newCurrent = isConsecutive ? streak.currentStreak + 1 : 1;

  streak.currentStreak = newCurrent;
  streak.bestStreak = Math.max(streak.bestStreak, newCurrent);
  streak.lastCheckInDateKey = todayKey;
  await streak.save();

  return res.status(201).json({ currentStreak: newCurrent, bestStreak: streak.bestStreak });
});

checkInRouter.get("/streaks", requireAuth, async (req: AuthedRequest, res) => {
  const streaks = await Streak.find({ userId: req.userId }).lean();
  return res.json({ streaks });
});