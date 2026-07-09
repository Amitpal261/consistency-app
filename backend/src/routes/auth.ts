import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { loginSchema, signupSchema } from "../lib/validators.js";

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
