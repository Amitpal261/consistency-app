import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Habit } from "../src/models/Habit.js";
import { CheckIn } from "../src/models/CheckIn.js";
import { Streak } from "../src/models/Streak.js";
import { dbConnect } from "../src/lib/db.js";

const BASE_URL = "http://localhost:4000";

async function runTests() {
  console.log("Connecting to database...");
  await dbConnect();

  console.log("Cleaning up test users...");
  const emails = ["dwell-striver@test.com"];
  const users = await User.find({ email: { $in: emails } });
  const userIds = users.map(u => u._id);

  await CheckIn.deleteMany({ userId: { $in: userIds } });
  await Streak.deleteMany({ userId: { $in: userIds } });
  await Habit.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: { $in: emails } });

  console.log("Database cleaned up.");

  // 1. Sign up User
  console.log("Signing up User...");
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Dwell User", email: "dwell-striver@test.com", password: "password123" })
  });
  const auth = await signupRes.json() as any;
  if (!signupRes.ok) throw new Error("Signup failed: " + JSON.stringify(auth));
  const token = auth.token;
  const userId = auth.user.id;

  // 2. Create Location + Duration Habit (Library, 120 minutes)
  console.log("Creating dwell habit...");
  const createHabitRes = await fetch(`${BASE_URL}/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      name: "Library study",
      taskType: "location_duration",
      verificationMethod: "gps",
      location: { lat: 12.9716, lng: 77.5946, radiusMeters: 150 },
      requiredDurationMinutes: 120
    })
  });
  const habit = (await createHabitRes.json() as any).habit;
  console.log("Habit created:", habit._id);

  // 3. User enters geofence (start-dwell)
  console.log("Simulating entry (start-dwell)...");
  const startRes = await fetch(`${BASE_URL}/checkins/start-dwell`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      habitId: habit._id,
      location: { lat: 12.9716, lng: 77.5946, isMockLocation: false }
    })
  });
  const startData = await startRes.json() as any;
  console.log("Start Dwell Response:", startData);
  if (!startRes.ok) throw new Error("Start dwell failed: " + JSON.stringify(startData));

  // Check CheckIn state in DB
  const checkIn = await CheckIn.findOne({ userId, habitId: habit._id });
  if (!checkIn) throw new Error("CheckIn was not created");
  if (checkIn.completionStatus !== "none" || checkIn.verified) {
    throw new Error("Expected initial completionStatus: none and verified: false");
  }

  // Check Streak in DB (should be null or 0)
  const streakBefore = await Streak.findOne({ userId, habitId: habit._id });
  if (streakBefore && streakBefore.currentStreak > 0) {
    throw new Error("Streak should not be updated yet");
  }
  console.log("Dwell session initialized correctly.");

  // 4. Fake elapsed time: modify entry time in MongoDB to be 10 minutes ago
  console.log("Modifying MongoDB entry timestamp to 10 minutes ago...");
  checkIn.lastEntryTimestamp = new Date(Date.now() - 10 * 60 * 1000);
  await checkIn.save();

  // 5. User exits geofence (exit-dwell) -> should get partial credit
  console.log("Simulating exit (exit-dwell) for partial credit...");
  const exit1Res = await fetch(`${BASE_URL}/checkins/exit-dwell`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      habitId: habit._id
    })
  });
  const exit1Data = await exit1Res.json() as any;
  console.log("Exit 1 Dwell Response:", exit1Data);
  if (!exit1Res.ok) throw new Error("Exit 1 failed: " + JSON.stringify(exit1Data));

  const dbCheckInAfterExit1 = await CheckIn.findOne({ userId, habitId: habit._id });
  if (!dbCheckInAfterExit1) throw new Error("Could not find CheckIn");
  console.log(
    "After Exit 1 — completionStatus:",
    dbCheckInAfterExit1.completionStatus,
    "totalDwellMinutes:",
    dbCheckInAfterExit1.totalDwellMinutes,
    "verified:",
    dbCheckInAfterExit1.verified
  );

  if (dbCheckInAfterExit1.completionStatus !== "partial" || !dbCheckInAfterExit1.verified) {
    throw new Error("Expected completionStatus to be partial and verified to be true");
  }
  if (exit1Data.currentStreak !== 1) {
    throw new Error(`Expected currentStreak to be 1 (partial credit), got ${exit1Data.currentStreak}`);
  }
  console.log("Partial credit streak update verified successfully.");

  // 6. User re-enters (start-dwell)
  console.log("Simulating re-entry (start-dwell)...");
  const start2Res = await fetch(`${BASE_URL}/checkins/start-dwell`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      habitId: habit._id,
      location: { lat: 12.9716, lng: 77.5946, isMockLocation: false }
    })
  });
  const start2Data = await start2Res.json() as any;
  console.log("Start 2 Dwell Response:", start2Data);

  const dbCheckInAfterReEntry = await CheckIn.findOne({ userId, habitId: habit._id });
  if (!dbCheckInAfterReEntry) throw new Error("Could not find CheckIn");
  if (dbCheckInAfterReEntry.lastExitTimestamp !== null && dbCheckInAfterReEntry.lastExitTimestamp !== undefined) {
    throw new Error("Expected lastExitTimestamp to be cleared on re-entry");
  }

  // 7. Fake more elapsed time: modify entry time in MongoDB to be 115 minutes ago
  console.log("Modifying MongoDB entry timestamp to 115 minutes ago...");
  dbCheckInAfterReEntry.lastEntryTimestamp = new Date(Date.now() - 115 * 60 * 1000);
  await dbCheckInAfterReEntry.save();

  // 8. User exits geofence (exit-dwell) -> should get full credit
  console.log("Simulating exit (exit-dwell) for full credit...");
  const exit2Res = await fetch(`${BASE_URL}/checkins/exit-dwell`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    body: JSON.stringify({
      habitId: habit._id
    })
  });
  const exit2Data = await exit2Res.json() as any;
  console.log("Exit 2 Dwell Response:", exit2Data);

  const dbCheckInAfterExit2 = await CheckIn.findOne({ userId, habitId: habit._id });
  if (!dbCheckInAfterExit2) throw new Error("Could not find CheckIn");
  console.log(
    "After Exit 2 — completionStatus:",
    dbCheckInAfterExit2.completionStatus,
    "totalDwellMinutes:",
    dbCheckInAfterExit2.totalDwellMinutes,
    "verified:",
    dbCheckInAfterExit2.verified
  );

  if (dbCheckInAfterExit2.completionStatus !== "full" || !dbCheckInAfterExit2.verified) {
    throw new Error("Expected completionStatus to be full and verified to be true");
  }
  if (exit2Data.currentStreak !== 1) {
    throw new Error(`Expected currentStreak to remain 1, got ${exit2Data.currentStreak}`);
  }

  console.log("\nALL DWELL TESTS PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
