import "dotenv/config";
import express from "express";
import cors from "cors";
import { dbConnect } from "./lib/db.js";
import { authRouter } from "./routes/auth.js";
import { checkInRouter } from "./routes/checkin.js";
import { buddyRouter } from "./routes/buddy.js";
import { habitRouter } from "./routes/habit.js";
import { startReviewTimeoutJob } from "./lib/reviewTimeout.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "3mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/checkins", checkInRouter);
app.use("/buddies", buddyRouter);
app.use("/habits", habitRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

dbConnect()
  .then(() => {
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
    startReviewTimeoutJob();
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });