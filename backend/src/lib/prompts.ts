// A fixed prompt list, each user gets a different one per day, deterministically
// (same user always sees the same prompt on a given date, but it can't be
// predicted in advance and differs from other users) — this is what stops
// someone pre-recording one photo and reusing it forever, and stops users
// sharing a single photo with each other since prompts differ per person.
const PROMPTS = [
  "Hold up 3 fingers",
  "Show today's date written on paper",
  "Point the camera at the ceiling",
  "Show your left hand with fingers spread",
  "Show a glass of water",
  "Show your window or door",
  "Show the time on a clock or watch",
  "Show your shoes",
];

function hashToIndex(input: string, mod: number): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

export function getPromptForUserAndDate(userId: string, dateKey: string): string {
  const index = hashToIndex(`${userId}:${dateKey}`, PROMPTS.length);
  return PROMPTS[index];
}