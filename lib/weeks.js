import { WEEK_CAPACITY } from "./booking";

// Server-side. Every surface that offers a booking — the hero, /book and
// /weeks — has to agree on which weeks are open and how full each one is, so
// they all come through here rather than counting rows themselves.
//
// Seats sold counts registrations that haven't been rejected, matching what
// /book enforces on submit. The bookings table only fills once an admin
// confirms each one, so counting that instead would oversell.
export async function getOpenWeeks(supabase) {
  const { data: weeks } = await supabase
    .from("weeks")
    .select("*")
    .eq("status", "booking")
    .order("event_date", { ascending: true, nullsFirst: false });

  if (!weeks || weeks.length === 0) return [];

  const { data: regs } = await supabase
    .from("registrations")
    .select("week_id")
    .in("week_id", weeks.map((w) => w.id))
    .neq("status", "rejected");

  const counts = {};
  (regs || []).forEach((r) => {
    counts[r.week_id] = (counts[r.week_id] || 0) + 1;
  });

  return weeks.map((w) => {
    const booked = counts[w.id] || 0;
    const seatsLeft = Math.max(0, WEEK_CAPACITY - booked);
    return { ...w, booked, seatsLeft, full: seatsLeft === 0 };
  });
}

// The week to lead with: the soonest one that still has room. Everything
// before it is sold out, which is worth showing rather than hiding — it's the
// honest version of scarcity.
export function splitOpenWeeks(openWeeks) {
  const bookable = openWeeks.find((w) => !w.full) || null;
  const soldOut = openWeeks.filter((w) => w.full);
  const later = bookable ? openWeeks.filter((w) => !w.full && w.id !== bookable.id) : [];
  return { bookable, soldOut, later };
}
