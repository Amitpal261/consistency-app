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
  habitType: z.enum(["wake_up", "library", "custom"]),
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
