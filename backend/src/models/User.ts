import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    timezone: { type: String, default: "Asia/Kolkata" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };
export const User: Model<UserDoc> = mongoose.models.User ?? mongoose.model("User", userSchema);
