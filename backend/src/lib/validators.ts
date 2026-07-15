import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  timezone: z.string().max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const addBuddySchema = z.object({
  buddyEmail: z.string().email(),
});

export const reviewCheckInSchema = z.object({
  action: z.enum(["approve", "flag"]),
});

export const checkInSchema = z.object({
  habitId: z.string().min(1),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      accuracyMeters: z.number().optional(),
      isMockLocation: z.boolean().optional(),
    })
    .optional(),
  photoBase64: z.string().max(2_500_000).optional(),
});

export const createHabitSchema = z.object({
  name: z.string().min(1).max(60),
  taskType: z.enum(["time", "location", "location_duration"]),
  verificationMethod: z.enum(["photo", "gps", "photo_gps"]).default("photo_gps"),
  timeWindow: z
    .object({
      hour: z.number().int().min(0).max(23),
      minute: z.number().int().min(0).max(59),
      windowMinutes: z.number().int().min(5).max(720).default(60),
    })
    .optional(),
  location: z
    .object({
      lat: z.number(),
      lng: z.number(),
      radiusMeters: z.number().min(20).max(2000).default(150),
    })
    .optional(),
  requiredDurationMinutes: z.number().int().min(5).max(1440).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  buddyId: z.string().optional(),
});
