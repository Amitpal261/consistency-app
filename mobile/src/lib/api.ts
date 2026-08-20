export const API_BASE_URL = "http://192.168.1.41:4000";

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");

  if (token) {
    requestHeaders.set("Authorization", "Bearer " + token);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && typeof data.error === "string" ? data.error : null) ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export type AuthResponse = { token: string; user: { id: string; name: string; email: string } };

export function signup(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
}

export function requestPasswordReset(email: string) {
  return request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export type TaskType = "time" | "location" | "location_duration";
export type VerificationMethod = "photo" | "gps" | "photo_gps";

// "kind" not "type" — kept consistent with the backend model field name.
export type Ringtone = { kind: "default" | "custom"; uri?: string; name?: string };

export type Habit = {
  _id: string;
  name: string;
  taskType: TaskType;
  verificationMethod: VerificationMethod;
  timeWindow?: { hour: number; minute: number; windowMinutes: number };
  location?: { lat: number; lng: number; radiusMeters: number };
  locationDeadline?: { hour: number; minute: number };
  requiredDurationMinutes?: number;
  daysOfWeek: number[];
  buddyId?: string;
  ringtone?: Ringtone;
  currentStreak: number;
  bestStreak: number;
  lastCheckInDateKey?: string;
  currentDwellMinutes?: number;
};

export type CreateHabitPayload = {
  name: string;
  taskType: TaskType;
  verificationMethod: VerificationMethod;
  timeWindow?: { hour: number; minute: number; windowMinutes?: number };
  location?: { lat: number; lng: number; radiusMeters?: number };
  locationDeadline?: { hour: number; minute: number };
  requiredDurationMinutes?: number;
  daysOfWeek?: number[];
  ringtone?: Ringtone;
};

export function createHabit(token: string, payload: CreateHabitPayload) {
  return request<{ habit: Habit }>("/habits", { method: "POST", token, body: JSON.stringify(payload) });
}

export function getHabitsWithStreaks(token: string) {
  return request<{ habits: Habit[] }>("/habits/with-streaks", { token });
}

// Fetch per-day history for a single habit. Backend: GET /habits/:habitId/history?days=N
export function getHabitHistory(token: string, habitId: string, days = 21) {
  const encoded = encodeURIComponent(habitId);
  return request<{ days?: { date: string; status: string | null }[]; history?: any[] }>(
    `/habits/${encoded}/history?days=${Number(days)}`,
    { token }
  );
}

export type Profile = { id?: string; name: string; email: string };

// Fetch the authenticated user's profile. Backend path may vary (/auth/me or /me).
export function getMyProfile(token: string) {
  return request<{ user: Profile }>("/auth/me", { token });
}

export function updateMyProfile(token: string, payload: { name?: string; email?: string }) {
  return request<{ user: Profile }>("/me", { method: "PATCH", token, body: JSON.stringify(payload) });
}

export function changeMyPassword(token: string, currentPassword: string, newPassword: string) {
  return request<{ message: string }>("/auth/change-password", {
    method: "POST",
    token,
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function deleteMyAccount(token: string) {
  return request<{ message: string }>("/me", { method: "DELETE", token });
}

export type CheckInPayload = {
  habitId: string;
  location?: { lat: number; lng: number; accuracyMeters?: number; isMockLocation?: boolean };
  photoBase64?: string;
};

export function submitCheckIn(token: string, payload: CheckInPayload) {
  return request<{
    currentStreak: number;
    bestStreak: number;
    reviewStatus: "pending" | "approved" | "flagged" | "auto_approved_unreviewed";
    verified: boolean;
  }>("/checkins", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
export function getTodayPrompt(token: string) {
  return request<{ prompt: string; date: string }>("/checkins/prompt", { token });
}

export type Buddy = { _id: string; name: string; email: string };

export function addBuddy(token: string, buddyEmail: string) {
  return request<{ buddy: { id: string; name: string; email: string } }>("/buddies", {
    method: "POST",
    token,
    body: JSON.stringify({ buddyEmail }),
  });
}

export function getBuddies(token: string) {
  return request<{ buddies: Buddy[] }>("/buddies", { token });
}

export type BuddyCheckIn = {
  _id: string;
  habitId: string;
  checkedInAt: string;
  photoUrl?: string;
  reviewStatus: "pending" | "approved" | "flagged" | "auto_approved_unreviewed";
};

export function getBuddyTodayCheckIns(token: string, buddyUserId: string) {
  return request<{ checkIns: BuddyCheckIn[] }>(`/buddies/${encodeURIComponent(buddyUserId)}/checkins/today`, {
    token,
  });
}

export function reviewCheckIn(token: string, checkInId: string, action: "approve" | "flag") {
  return request<{ reviewStatus: string }>(`/buddies/checkins/${encodeURIComponent(checkInId)}/review`, {
    method: "POST",
    token,
    body: JSON.stringify({ action }),
  });
}

export function startDwell(token: string, habitId: string, location?: { lat: number; lng: number }) {
  return request<{ checkIn: any }>("/checkins/start-dwell", {
    method: "POST",
    token,
    body: JSON.stringify({ habitId, location }),
  });
}

export function exitDwell(token: string, habitId: string, location?: { lat: number; lng: number }) {
  return request<{ checkIn: any; currentStreak: number; bestStreak: number }>("/checkins/exit-dwell", {
    method: "POST",
    token,
    body: JSON.stringify({ habitId, location }),
  });
}

// Poll dwell status for a habit. Backend: GET /checkins/dwell-status/:habitId
export function getDwellStatus(token: string, habitId: string) {
  return request<{
    elapsedMinutes: number;
    requiredMinutes: number;
    isInGrace: boolean;
    graceSecondsRemaining: number;
    isCompleted?: boolean;
  }>(`/checkins/dwell-status/${encodeURIComponent(habitId)}`, { token });
}