import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const habitSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    taskType: { type: String, enum: ["time", "location", "location_duration"], required: true },
    verificationMethod: { type: String, enum: ["photo", "gps", "photo_gps"], required: true, default: "photo_gps" },
    timeWindow: {
      hour: { type: Number, min: 0, max: 23 },
      minute: { type: Number, min: 0, max: 59 },
      windowMinutes: { type: Number, default: 60, min: 5, max: 720 },
    },
    location: {
      lat: { type: Number },
      lng: { type: Number },
      radiusMeters: { type: Number, default: 150 },
    },
    requiredDurationMinutes: { type: Number },
    daysOfWeek: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    buddyId: { type: Schema.Types.ObjectId, ref: "User" },
    active: { type: Boolean, default: true },
    // "kind" (NOT "type") on purpose — mongoose reads a nested "type" key as
    // a SchemaType definition, which would silently break this whole field.
    ringtone: {
      kind: { type: String, enum: ["default", "custom"], default: "default" },
      uri: { type: String },
      name: { type: String },
    },
  },
  { timestamps: true }
);

export type HabitDoc = InferSchemaType<typeof habitSchema> & { _id: mongoose.Types.ObjectId };
export const Habit: Model<HabitDoc> = mongoose.models.Habit ?? mongoose.model("Habit", habitSchema);