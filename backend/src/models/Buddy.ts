import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const buddySchema = new Schema(
  {
    userA: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userB: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

buddySchema.index({ userA: 1, userB: 1 }, { unique: true });

export type BuddyDoc = InferSchemaType<typeof buddySchema> & { _id: mongoose.Types.ObjectId };
export const Buddy: Model<BuddyDoc> = mongoose.models.Buddy ?? mongoose.model("Buddy", buddySchema);