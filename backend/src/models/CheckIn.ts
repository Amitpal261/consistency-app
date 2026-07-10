import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const checkInSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    habitType: { type: String, enum: ["wake_up", "library", "custom"], required: true },
    checkedInAt: { type: Date, required: true, default: () => new Date() },
    // GPS is optional per habit — a wake-up check-in might not need location,
    // a library check-in should.
    location: {
      lat: { type: Number },
      lng: { type: Number },
      accuracyMeters: { type: Number },
      isMockLocation: { type: Boolean, default: false },
    },
    photoUrl: { type: String },
    verified: { type: Boolean, default: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
reviewStatus: { type: String, enum: ["pending", "approved", "flagged"], default: "pending" }, 
  },
  { timestamps: true }
);

// One check-in per user per habit per calendar day — enforced at the
// application layer using dateKey below, since Mongo doesn't do "same day"
// comparisons natively.
checkInSchema.index({ userId: 1, habitType: 1, checkedInAt: 1 });

export type CheckInDoc = InferSchemaType<typeof checkInSchema> & { _id: mongoose.Types.ObjectId };
export const CheckIn: Model<CheckInDoc> = mongoose.models.CheckIn ?? mongoose.model("CheckIn", checkInSchema);
