import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const streakSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    currentStreak: { type: Number, default: 0 },
    bestStreak: { type: Number, default: 0 },
    lastCheckInDateKey: { type: String },
  },
  { timestamps: true }
);

streakSchema.index({ userId: 1, habitId: 1 }, { unique: true });

export type StreakDoc = InferSchemaType<typeof streakSchema> & { _id: mongoose.Types.ObjectId };
export const Streak: Model<StreakDoc> = mongoose.models.Streak ?? mongoose.model("Streak", streakSchema);