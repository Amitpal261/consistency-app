import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Habit } from "../src/models/Habit.js";
import { CheckIn } from "../src/models/CheckIn.js";
import { Streak } from "../src/models/Streak.js";
import { Buddy } from "../src/models/Buddy.js";
import { dbConnect } from "../src/lib/db.js";

const BASE_URL = "http://localhost:4000";

async function runTests() {
  console.log("Connecting to database...");
  await dbConnect();

  console.log("Cleaning up test users...");
  const emails = ["striver@test.com", "buddy@test.com"];
  const users = await User.find({ email: { $in: emails } });
  const userIds = users.map(u => u._id);

  await CheckIn.deleteMany({ userId: { $in: userIds } });
  await Streak.deleteMany({ userId: { $in: userIds } });
  await Buddy.deleteMany({ $or: [{ userA: { $in: userIds } }, { userB: { $in: userIds } }] });
  await Habit.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ email: { $in: emails } });

  console.log("Database cleaned up.");

  // 1. Sign up User A and User B
  console.log("Signing up User A (Striver)...");
  const signupARes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Striver", email: "striver@test.com", password: "password123" })
  });
  const authA = await signupARes.json() as any;
  if (!signupARes.ok) throw new Error("A signup failed: " + JSON.stringify(authA));
  const tokenA = authA.token;
  const idA = authA.user.id;

  console.log("Signing up User B (Buddy)...");
  const signupBRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Buddy", email: "buddy@test.com", password: "password123" })
  });
  const authB = await signupBRes.json() as any;
  if (!signupBRes.ok) throw new Error("B signup failed: " + JSON.stringify(authB));
  const tokenB = authB.token;
  const idB = authB.user.id;

  // 2. User A adds User B as Buddy
  console.log("User A adding User B as buddy...");
  const addBuddyRes = await fetch(`${BASE_URL}/buddies`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
    body: JSON.stringify({ buddyEmail: "buddy@test.com" })
  });
  if (!addBuddyRes.ok) throw new Error("Adding buddy failed: " + JSON.stringify(await addBuddyRes.json()));

  // 3. User A creates a GPS-only Habit (should auto-approve & update streak immediately)
  console.log("User A creating GPS-only habit...");
  const createHabit1Res = await fetch(`${BASE_URL}/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: "Gym checkin",
      taskType: "location",
      verificationMethod: "gps",
      location: { lat: 12.9716, lng: 77.5946, radiusMeters: 150 }
    })
  });
  const habit1 = (await createHabit1Res.json() as any).habit;
  console.log("GPS-only habit created:", habit1._id);

  // 4. User A checks in for GPS-only habit
  console.log("User A checking in for GPS-only habit...");
  const checkin1Res = await fetch(`${BASE_URL}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
    body: JSON.stringify({
      habitId: habit1._id,
      location: { lat: 12.9716, lng: 77.5946, isMockLocation: false }
    })
  });
  const checkin1Data = await checkin1Res.json() as any;
  console.log("GPS Checkin Response:", checkin1Data);
  if (checkin1Data.currentStreak !== 1) {
    throw new Error(`Expected currentStreak to be 1, got ${checkin1Data.currentStreak}`);
  }
  if (checkin1Data.reviewStatus !== "approved" || !checkin1Data.verified) {
    throw new Error(`Expected approved/verified checkin, got: ${JSON.stringify(checkin1Data)}`);
  }

  // 5. User A creates a Photo + GPS Habit with User B as buddy.
  console.log("User A creating Photo + GPS habit with User B as buddy...");
  const testDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
  const testHour = testDate.getHours();
  const testMinute = testDate.getMinutes();

  const createHabit2Res = await fetch(`${BASE_URL}/habits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
    body: JSON.stringify({
      name: "Morning Wakeup",
      taskType: "time",
      verificationMethod: "photo_gps",
      timeWindow: { hour: testHour, minute: testMinute, windowMinutes: 180 },
      location: { lat: 12.9716, lng: 77.5946, radiusMeters: 150 },
      buddyId: idB
    })
  });
  const habit2 = (await createHabit2Res.json() as any).habit;
  console.log("Photo + GPS habit created:", habit2._id);

  // 6. User A checks in for Photo + GPS habit (mock AI will run)
  console.log("User A checking in for Photo + GPS habit...");
  const dummyPhoto = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const checkin2Res = await fetch(`${BASE_URL}/checkins`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenA}` },
    body: JSON.stringify({
      habitId: habit2._id,
      location: { lat: 12.9716, lng: 77.5946, isMockLocation: false },
      photoBase64: dummyPhoto
    })
  });
  const checkin2Data = await checkin2Res.json() as any;
  console.log("Photo Checkin Response:", checkin2Data);

  const dbCheckIn = await CheckIn.findOne({ userId: idA, habitId: habit2._id });
  if (!dbCheckIn) throw new Error("Could not find check-in in database");
  console.log("DB CheckIn reviewStatus:", dbCheckIn.reviewStatus, "verified:", dbCheckIn.verified);

  if (dbCheckIn.reviewStatus === "approved") {
    console.log("Mock AI Auto-Approved the photo.");
    if (checkin2Data.currentStreak !== 1) {
      throw new Error(`Expected streak to be 1 (auto-approved), got ${checkin2Data.currentStreak}`);
    }
  } else if (dbCheckIn.reviewStatus === "pending") {
    console.log("Mock AI Flagged the photo (Pending Buddy Review).");
    if (checkin2Data.currentStreak !== 0) {
      throw new Error(`Expected streak to remain 0 (pending review), got ${checkin2Data.currentStreak}`);
    }

    // Buddy reviews check-in
    console.log("User B (Buddy) approving the check-in...");
    const reviewRes = await fetch(`${BASE_URL}/buddies/checkins/${dbCheckIn._id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tokenB}` },
      body: JSON.stringify({ action: "approve" })
    });
    const reviewData = await reviewRes.json() as any;
    console.log("Review Response:", reviewData);
    if (reviewData.reviewStatus !== "approved") {
      throw new Error(`Expected reviewStatus to be approved, got ${reviewData.reviewStatus}`);
    }

    const updatedStreak = await Streak.findOne({ userId: idA, habitId: habit2._id });
    if (!updatedStreak || updatedStreak.currentStreak !== 1) {
      throw new Error(`Expected updated streak to be 1 after buddy approval, got ${updatedStreak?.currentStreak}`);
    }
    console.log("Buddy approval updated streak successfully!");
  } else {
    throw new Error("Unexpected checkin reviewStatus: " + dbCheckIn.reviewStatus);
  }

  // 7. Test Timeout Resolution
  console.log("Testing Timeout Resolution...");
  const oldDate = new Date(Date.now() - 13 * 60 * 60 * 1000);
  const oldCheckIn = await CheckIn.create({
    userId: idA,
    habitId: habit2._id,
    checkedInAt: oldDate,
    withinTimeWindow: true,
    location: { lat: 12.9716, lng: 77.5946 },
    photoUrl: dummyPhoto,
    verified: false,
    reviewStatus: "pending"
  });

  await Streak.findOneAndUpdate({ userId: idA, habitId: habit2._id }, { currentStreak: 0, lastCheckInDateKey: "" });

  console.log("Triggering resolveTimedOutReviews...");
  const { resolveTimedOutReviews } = await import("../src/lib/reviewTimeout.js");
  const count = await resolveTimedOutReviews();
  console.log("Resolved timed out reviews count:", count);
  if (count < 1) throw new Error("Expected at least 1 timed out review to be resolved");

  const resolvedCheckIn = await CheckIn.findById(oldCheckIn._id);
  if (resolvedCheckIn?.reviewStatus !== "auto_approved_unreviewed" || !resolvedCheckIn?.verified) {
    throw new Error(`Expected check-in to be auto_approved_unreviewed and verified, got: ${resolvedCheckIn?.reviewStatus}, verified: ${resolvedCheckIn?.verified}`);
  }

  const finalStreak = await Streak.findOne({ userId: idA, habitId: habit2._id });
  if (!finalStreak || finalStreak.currentStreak !== 1) {
    throw new Error(`Expected streak to be updated by timeout, got ${finalStreak?.currentStreak}`);
  }
  console.log("Timeout resolved and streak updated successfully!");

  console.log("\nALL TESTS PASSED SUCCESSFULLY! 🎉");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
