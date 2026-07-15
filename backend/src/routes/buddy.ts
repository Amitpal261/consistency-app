import { Router } from "express";
import { Buddy } from "../models/Buddy.js";
import { User } from "../models/User.js";
import { CheckIn } from "../models/CheckIn.js";
import { Streak } from "../models/Streak.js";
import { addBuddySchema, reviewCheckInSchema } from "../lib/validators.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import { updateStreak } from "./checkin.js";

export const buddyRouter = Router();

async function areBuddies(userId: string, otherUserId: string): Promise<boolean> {
  const pair = await Buddy.exists({
    $or: [
      { userA: userId, userB: otherUserId },
      { userA: otherUserId, userB: userId },
    ],
  });
  return Boolean(pair);
}

buddyRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = addBuddySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const buddyUser = await User.findOne({ email: parsed.data.buddyEmail });
  if (!buddyUser) return res.status(404).json({ error: "No user found with that email." });
  if (String(buddyUser._id) === req.userId) {
    return res.status(400).json({ error: "You can't add yourself as a buddy." });
  }

  const already = await areBuddies(req.userId!, String(buddyUser._id));
  if (already) return res.status(409).json({ error: "You're already buddies with this person." });

  await Buddy.create({ userA: req.userId, userB: buddyUser._id });
  return res.status(201).json({ buddy: { id: buddyUser._id, name: buddyUser.name, email: buddyUser.email } });
});

buddyRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const pairs = await Buddy.find({ $or: [{ userA: req.userId }, { userB: req.userId }] }).lean();
  const buddyIds = pairs.map((p) => (String(p.userA) === req.userId ? p.userB : p.userA));
  const buddies = await User.find({ _id: { $in: buddyIds } }).select("name email").lean();
  return res.json({ buddies });
});

buddyRouter.get("/:buddyUserId/checkins/today", requireAuth, async (req: AuthedRequest, res) => {
  const buddyUserId = String(req.params.buddyUserId);
  const isBuddy = await areBuddies(req.userId!, buddyUserId);
  if (!isBuddy) return res.status(403).json({ error: "You're not buddies with this user." });

  const since = new Date();
  since.setDate(since.getDate() - 3);
  since.setHours(0, 0, 0, 0);

  const checkIns = await CheckIn.find({
    userId: buddyUserId,
    checkedInAt: { $gte: since },
    photoUrl: { $exists: true, $ne: null },
  })
    .sort({ checkedInAt: -1 })
    .select("habitId checkedInAt photoUrl reviewStatus")
    .lean();

  return res.json({ checkIns });
});

buddyRouter.post("/checkins/:checkInId/review", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = reviewCheckInSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const checkIn = await CheckIn.findById(req.params.checkInId);
  if (!checkIn) return res.status(404).json({ error: "Check-in not found." });

  const isBuddy = await areBuddies(req.userId!, String(checkIn.userId));
  if (!isBuddy) return res.status(403).json({ error: "You're not buddies with this user." });

  const timezone = req.header("x-user-timezone") || "Asia/Kolkata";
  const dateKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(checkIn.checkedInAt);

  if (parsed.data.action === "approve") {
    checkIn.reviewStatus = "approved";
    checkIn.verified = true;
    checkIn.reviewedBy = req.userId as unknown as typeof checkIn.reviewedBy;
    await checkIn.save();

    await updateStreak(checkIn.userId, checkIn.habitId, dateKey);
  } else {
    checkIn.reviewStatus = "flagged";
    checkIn.verified = false;
    checkIn.reviewedBy = req.userId as unknown as typeof checkIn.reviewedBy;
    await checkIn.save();

    const habitId = checkIn.habitId;
    const streak = await Streak.findOne({ userId: checkIn.userId, habitId });
    if (streak && streak.lastCheckInDateKey === dateKey) {
      streak.currentStreak = 0;
      await streak.save();
    }
  }

  return res.json({ reviewStatus: checkIn.reviewStatus });
});