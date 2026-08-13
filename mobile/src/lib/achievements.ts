export type AchievementDef = { id: string; label: string; requiredStreak: number; icon?: string };

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-checkin", label: "First check-in", requiredStreak: 1, icon: "check" },
  { id: "7day", label: "7 Day Streak", requiredStreak: 7, icon: "star" },
  { id: "14day", label: "14 Day Streak", requiredStreak: 14, icon: "whatshot" },
  { id: "30day", label: "30 Day Streak", requiredStreak: 30, icon: "leaderboard" },
];
