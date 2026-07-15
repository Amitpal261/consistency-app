import { Router } from "express";
import { Habit } from "../models/Habit.js";
import { Streak } from "../models/Streak.js";
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