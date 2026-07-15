import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const checkInSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitId: { type: Schema.Types.ObjectId, ref: "Habit", required: true, index: true },
    checkedInAt: { type: Date, required: true, default: () => new Date() },
    withinTimeWindow: { type: Boolean, default: true },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      accuracyMeters: { type: Number },
      isMockLocation: { type: Boolean, default: false },
    },
    photoUrl: { type: String },
    photoHash: { type: String },
    verified: { type: Boolean, default: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewStatus: { type: String, enum: ["pending", "approved", "flagged", "auto_approved_unreviewed"], default: "pending" },
    totalDwellMinutes: { type: Number, default: 0 },
    lastEntryTimestamp: { type: Date },
    lastExitTimestamp: { type: Date },
    completionStatus: { type: String, enum: ["full", "partial", "none"], default: "none" },
  },
  { timestamps: true }
);

checkInSchema.index({ userId: 1, habitId: 1, checkedInAt: 1 });

export type CheckInDoc = InferSchemaType<typeof checkInSchema> & { _id: mongoose.Types.ObjectId };
export const CheckIn: Model<CheckInDoc> = mongoose.models.CheckIn ?? mongoose.model("CheckIn", checkInSchema);