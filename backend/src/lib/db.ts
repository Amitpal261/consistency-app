import mongoose from "mongoose";

let connected = false;

export async function dbConnect() {
  if (connected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  connected = true;
  console.log("MongoDB connected");

  // Automatically clean up the deprecated index from previous schema version
  try {
    const db = mongoose.connection.db;
    if (db) {
      const collections = await db.listCollections({ name: "streaks" }).toArray();
      if (collections.length > 0) {
        const indexes = await db.collection("streaks").indexes();
        const hasOldIndex = indexes.some(idx => idx.name === "userId_1_habitType_1");
        if (hasOldIndex) {
          await db.collection("streaks").dropIndex("userId_1_habitType_1");
          console.log("Dropped deprecated database index: userId_1_habitType_1");
        }
      }
    }
  } catch (err) {
    console.error("Failed to drop deprecated index:", err);
  }
}

