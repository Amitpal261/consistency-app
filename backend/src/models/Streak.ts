import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const streakSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitType: { type: String, enum: ["wake_up", "library", "custom"], required: true },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCheckInDateKey: { type: String }, // "YYYY-MM-DD" in the user's local timezone
  },
  { timestamps: true }
);

streakSchema.index({ userId: 1, habitType: 1 }, { unique: true });

export type StreakDoc = InferSchemaType<typeof streakSchema> & { _id: mongoose.Types.ObjectId };
export const Streak: Model<StreakDoc> = mongoose.models.Streak ?? mongoose.model("Streak", streakSchema);
