# Setup Guide — Step by Step

## Part 1 — Accounts you need (all free to start)

1. **MongoDB Atlas** (database) — atlas.mongodb.com → create a free M0 cluster →
   get your connection string (looks like `mongodb+srv://user:pass@cluster.../dbname`)
2. **Node.js** — install the LTS version from nodejs.org if you don't have it
3. **Expo account** — expo.dev → sign up (free) — needed for building the app later
4. **Android Studio** (for Android testing) — developer.android.com/studio →
   install it, then open it once and let it install an Android Virtual Device (emulator)
5. **Xcode** (for iOS testing) — only if you have a Mac. If you don't have a Mac,
   you can still test on a real iPhone using the Expo Go app, or skip iOS for now
   and come back to it once you have Mac access (a friend's Mac, or a cloud Mac
   rental service, works fine when you're ready to publish to the App Store).

## Part 2 — Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and fill in:
- `MONGODB_URI` — paste your Atlas connection string here
- `JWT_SECRET` — any long random string (e.g. generate one with `openssl rand -hex 32`)

Run it:
```bash
npm run dev
```

You should see `MongoDB connected` and `Server running on http://localhost:4000`.
Test it's alive: open `http://localhost:4000/health` in a browser — you should see `{"ok":true}`.

## Part 3 — Mobile app setup

```bash
cd mobile
npm install
```

**Important — find your computer's LAN IP address** (so your phone can reach
your backend over WiFi):
- Mac: System Settings → WiFi → Details → shows your IP (e.g. `192.168.1.5`)
- Windows: open Command Prompt → type `ipconfig` → look for "IPv4 Address"

Open `mobile/src/lib/api.ts` and change:
```ts
export const API_BASE_URL = "http://localhost:4000";
```
to your actual IP, e.g.:
```ts
export const API_BASE_URL = "http://192.168.1.5:4000";
```

Now start the app:
```bash
npx expo start
```

This shows a QR code in your terminal.

## Part 4 — Testing on your phone (fastest way to see it working)

1. Install **Expo Go** from the Play Store (Android) or App Store (iPhone)
2. Make sure your phone and computer are on the **same WiFi network**
3. Scan the QR code from your terminal using the Expo Go app (Android: use the
   in-app scanner; iPhone: use the regular Camera app, it'll prompt to open in Expo Go)
4. The app loads on your phone — try signing up and doing a check-in

**Note:** Expo Go is great for the screens we've built so far (auth, streaks,
GPS check-in). Once you add the "alarm that won't turn off" feature, that needs
native code Expo Go doesn't support — at that point you'll switch to an
"Expo Dev Client" build instead (a custom version of Expo Go with your native
code baked in). We'll cross that bridge when you get there — don't worry about
it yet.

## Part 5 — Deploying the backend for real (so it's not just on your laptop)

When you're ready to test with real people (not just your own phone on your
WiFi):
1. Push the `backend/` folder to a GitHub repo
2. Sign up at render.com (free tier works for testing)
3. New → Web Service → connect your GitHub repo → set root directory to `backend`
4. Add your environment variables (`MONGODB_URI`, `JWT_SECRET`) in Render's dashboard
5. Deploy — Render gives you a public URL like `https://your-app.onrender.com`
6. Update `API_BASE_URL` in the mobile app to that URL

## Part 6 — What to build next, in order

1. Get check-in + streaks working end-to-end for yourself first (you're the first test user)
2. Get 5-10 real people from your validation conversations to try it via Expo Go
3. Add the "alarm" feature (this is the biggest technical jump — happy to help
   with this specifically when you're ready, it needs its own guide)
4. Add RevenueCat for payments once people want to keep using it past a free trial
5. Only then worry about App Store / Play Store submission
