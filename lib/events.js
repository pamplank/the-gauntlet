// Events are everything at @ RUMBLE that isn't The Gauntlet — parties, one-offs,
// anything with a ticket. Deliberately separate from `weeks`: a week carries
// matchmaking, a tracker, wounds and a leaderboard, none of which a party has,
// and a party sitting in that table would surface on the Now Playing board.
export const EVENT_PROOF_BUCKET = "payment-proofs";
export const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export const EVENT_STATUS_LABEL = {
  open: "Booking Open",
  closed: "Booking Closed",
  completed: "Finished",
  canceled: "Canceled",
};

// Loose on purpose — something@something.something. Stricter patterns reject
// valid addresses, and only sending mail proves one works.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Seats sold counts anything not rejected, matching what the booking route
// enforces. capacity null means no limit, so there is nothing to count down.
export function seatsLeft(event, taken) {
  if (!event?.capacity) return null;
  return Math.max(0, event.capacity - (taken || 0));
}

export function isBookable(event, taken) {
  if (!event || event.status !== "open") return false;
  const left = seatsLeft(event, taken);
  return left === null || left > 0;
}
