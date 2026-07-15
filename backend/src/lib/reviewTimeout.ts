import { CheckIn } from "../models/CheckIn.js";
import { updateStreak } from "../routes/checkin.js";

const TIMEOUT_HOURS = 12;

export async function resolveTimedOutReviews(): Promise<number> {
  const cutoff = new Date(Date.now() - TIMEOUT_HOURS * 60 * 60 * 1000);

  const timedOutCheckIns = await CheckIn.find({
    reviewStatus: "pending",
    checkedInAt: { $lte: cutoff },
  });

  for (const checkIn of timedOutCheckIns) {
    checkIn.reviewStatus = "auto_approved_unreviewed";
    checkIn.verified = true;
    await checkIn.save();

    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(checkIn.checkedInAt);

    await updateStreak(checkIn.userId, checkIn.habitId, dateKey);
  }

  return timedOutCheckIns.length;
}

export function startReviewTimeoutJob() {
  const RUN_EVERY_MS = 30 * 60 * 1000;
  setInterval(() => {
    resolveTimedOutReviews().catch((err) => console.error("resolveTimedOutReviews failed", err));
  }, RUN_EVERY_MS);
}