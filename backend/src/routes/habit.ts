import { Router } from "express";
import { Habit } from "../models/Habit.js";
import { Streak } from "../models/Streak.js";
import { CheckIn } from "../models/CheckIn.js";
import { createHabitSchema } from "../lib/validators.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const habitRouter = Router();

habitRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createHabitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (parsed.data.taskType === "time" && !parsed.data.timeWindow) {
    return res.status(400).json({ error: "timeWindow is required for time-triggered habits." });
  }
  if (
    (parsed.data.taskType === "location" || parsed.data.taskType === "location_duration") &&
    !parsed.data.location
  ) {
    return res.status(400).json({ error: "location is required for location-triggered habits." });
  }
  if (parsed.data.taskType === "location_duration" && !parsed.data.requiredDurationMinutes) {
    return res.status(400).json({ error: "requiredDurationMinutes is required for duration habits." });
  }
  if (parsed.data.taskType === "location" && !parsed.data.locationDeadline) {
    return res.status(400).json({ error: "locationDeadline is required for location-arrival habits." });
  }

  const habit = await Habit.create({ ...parsed.data, userId: req.userId });
  return res.status(201).json({ habit });
});

habitRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const habits = await Habit.find({ userId: req.userId, active: true }).lean();
  return res.json({ habits });
});

habitRouter.patch("/:habitId", requireAuth, async (req: AuthedRequest, res) => {
  const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.userId });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const parsed = createHabitSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  Object.assign(habit, parsed.data);
  await habit.save();
  return res.json({ habit });
});

habitRouter.delete("/:habitId", requireAuth, async (req: AuthedRequest, res) => {
  const habit = await Habit.findOneAndUpdate(
    { _id: req.params.habitId, userId: req.userId },
    { active: false },
    { new: true }
  );
  if (!habit) return res.status(404).json({ error: "Habit not found" });
  return res.json({ ok: true });
});

habitRouter.get("/with-streaks", requireAuth, async (req: AuthedRequest, res) => {
  const habits = await Habit.find({ userId: req.userId, active: true }).lean();
  const streaks = await Streak.find({ userId: req.userId }).lean();
  const streakByHabit = new Map(streaks.map((s) => [String(s.habitId), s]));

  const merged = habits.map((h) => ({
    ...h,
    currentStreak: streakByHabit.get(String(h._id))?.currentStreak ?? 0,
    bestStreak: streakByHabit.get(String(h._id))?.bestStreak ?? 0,
    lastCheckInDateKey: streakByHabit.get(String(h._id))?.lastCheckInDateKey,
  }));

  return res.json({ habits: merged });
});
// Real per-day check-in history for a single habit — powers the "Activity
// History" heatmap on the habit detail screen. Deliberately real data, not
// mocked cells: each day is null (no check-in) or the actual reviewStatus.
habitRouter.get("/:habitId/history", requireAuth, async (req: AuthedRequest, res) => {
  const habit = await Habit.findOne({ _id: req.params.habitId, userId: req.userId });
  if (!habit) return res.status(404).json({ error: "Habit not found" });

  const days = Math.min(Math.max(Number(req.query.days) || 21, 1), 90);
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const checkIns = await CheckIn.find({
    userId: req.userId,
    habitId: habit._id,
    checkedInAt: { $gte: since },
  })
    .select("checkedInAt reviewStatus")
    .lean();

  // Collapse to one entry per calendar day (UTC-based day key — a cosmetic
  // simplification for this visual only; actual streak logic uses the
  // timezone-aware dateKey helper in checkin.ts, not this one).
  const byDay = new Map<string, string>();
  for (const c of checkIns) {
    const key = c.checkedInAt.toISOString().slice(0, 10);
    const existing = byDay.get(key);
    if (!existing || c.reviewStatus === "approved" || c.reviewStatus === "auto_approved_unreviewed") {
      byDay.set(key, c.reviewStatus);
    }
  }

  const result: { date: string; status: string | null }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, status: byDay.get(key) ?? null });
  }

  return res.json({ days: result });
});