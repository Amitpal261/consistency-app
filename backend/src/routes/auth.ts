import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, createHash } from "crypto";
import { User } from "../models/User.js";
import { Habit } from "../models/Habit.js";
import { CheckIn } from "../models/CheckIn.js";
import { Streak } from "../models/Streak.js";
import { Buddy } from "../models/Buddy.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
} from "../lib/validators.js";
import { sendPasswordResetEmail } from "../lib/email.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

export const authRouter = Router();

function signToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return jwt.sign({ sub: userId }, secret, { expiresIn: "30d" });
}

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = await User.findOne({ email: parsed.data.email });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await User.create({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    timezone: parsed.data.timezone,
  });

  const token = signToken(String(user._id));
  return res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findOne({ email: parsed.data.email });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  const token = signToken(String(user._id));
  return res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
});

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findOne({ email: parsed.data.email });
  if (!user) {
    return res.json({ message: "If that email is registered, we sent a password reset link to it." });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);

  user.passwordResetToken = tokenHash;
  user.passwordResetExpires = expires;
  await user.save();

  try {
    await sendPasswordResetEmail(user.email, user.name, token);
  } catch (err) {
    console.error("Failed to send password reset email:", err);
  }

  return res.json({ message: "If that email is registered, we sent a password reset link to it." });
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const user = await User.findOne({
    passwordResetToken: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: "Reset token is invalid or has expired." });
  }

  user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return res.json({ message: "Password reset successfully." });
});


authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await User.findById(req.userId).select("-passwordHash -passwordResetToken -passwordResetExpires");
  if (!user) return res.status(404).json({ error: "User not found" });

  return res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      createdAt: (user as any).createdAt,
    },
  });
});

authRouter.patch("/me", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if (parsed.data.name !== undefined) user.name = parsed.data.name;
  if (parsed.data.timezone !== undefined) user.timezone = parsed.data.timezone;
  await user.save();

  return res.json({
    user: { id: user._id, name: user.name, email: user.email, timezone: user.timezone },
  });
});

authRouter.patch("/me/password", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Current password is incorrect" });

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await user.save();

  return res.json({ message: "Password updated successfully." });
});

// Deletes the account and every piece of data tied to it — required for a
// genuine "Delete my account" option, not just a soft-disable. Cascades:
// their own habits, check-ins, streaks, and any buddy pairing they're part of
// (as either side of the pair), before finally removing the user record.
authRouter.delete("/me", requireAuth, async (req: AuthedRequest, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: "Missing token" });

  await Promise.all([
    Habit.deleteMany({ userId }),
    CheckIn.deleteMany({ userId }),
    Streak.deleteMany({ userId }),
    Buddy.deleteMany({ $or: [{ userA: userId }, { userB: userId }] }),
  ]);
  await User.findByIdAndDelete(userId);

  return res.json({ message: "Account and all associated data deleted." });
});