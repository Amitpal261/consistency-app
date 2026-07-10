// Point this at your deployed backend URL, or your machine's LAN IP while
// testing locally (e.g. "http://192.168.1.5:4000") — "localhost" won't work
// from a physical phone since the phone isn't the same device as your computer.
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

export type CheckInPayload = {
  habitType: "wake_up" | "library" | "custom";
  location?: { lat: number; lng: number; accuracyMeters?: number; isMockLocation?: boolean };
};

export function submitCheckIn(token: string, payload: CheckInPayload) {
  return request<{ currentStreak: number; bestStreak: number }>("/checkins", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function getStreaks(token: string) {
  return request<{
    streaks: Array<{
      habitType: string;
      currentStreak: number;
      bestStreak: number;
      lastCheckInDateKey?: string;
    }>;
  }>("/checkins/streaks", { token });
}
