export const API_BASE_URL = "http://192.168.1.13:4000";

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = options;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
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

export type TaskType = "time" | "location" | "location_duration";
export type VerificationMethod = "photo" | "gps" | "photo_gps";

export type Habit = {
  _id: string;
  name: string;
  taskType: TaskType;
  verificationMethod: VerificationMethod;
  timeWindow?: { hour: number; minute: number; windowMinutes: number };
  location?: { lat: number; lng: number; radiusMeters: number };
  requiredDurationMinutes?: number;
  daysOfWeek: number[];
  buddyId?: string;
  currentStreak: number;
  bestStreak: number;
  lastCheckInDateKey?: string;
};

export type CreateHabitPayload = {
  name: string;
  taskType: TaskType;
  verificationMethod: VerificationMethod;
  timeWindow?: { hour: number; minute: number; windowMinutes?: number };
  location?: { lat: number; lng: number; radiusMeters?: number };
  requiredDurationMinutes?: number;
};

export function createHabit(token: string, payload: CreateHabitPayload) {
  return request<{ habit: Habit }>("/habits", { method: "POST", token, body: JSON.stringify(payload) });
}

export function getHabitsWithStreaks(token: string) {
  return request<{ habits: Habit[] }>("/habits/with-streaks", { token });
}

export type CheckInPayload = {
  habitId: string;
  location?: { lat: number; lng: number; accuracyMeters?: number; isMockLocation?: boolean };
  photoBase64?: string;
};

export function submitCheckIn(token: string, payload: CheckInPayload) {
  return request<{ currentStreak: number; bestStreak: number }>("/checkins", {
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