import { supabaseAdmin } from "../../lib/db";
import { WEEK_CAPACITY } from "../../lib/booking";
import { photoUrl } from "../../lib/photos";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";
import { ActiveWeekCard, WeekRecap } from "./WeeksList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Weeks · The Gauntlet",
  description: "Every Gauntlet so far — what happened, who showed up, and who won.",
};

export default async function WeeksPage() {
  const { data: weeks } = await supabaseAdmin
    .from("weeks")
    .select("*")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("opened_at", { ascending: false });

  // Every week still taking bookings, soonest first — plus whatever is
  // currently being played.
  const open = (weeks || [])
    .filter((w) => w.status === "booking" || w.status === "in_progress")
    .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
  const past = (weeks || []).filter((w) => w.status === "completed");

  // Seats sold comes from registrations, matching /book and the hero — the
  // bookings table only fills up once an admin confirms each one.
  const { data: regs } = await supabaseAdmin
    .from("registrations")
    .select("week_id,status")
    .neq("status", "rejected");
  const counts = {};
  (regs || []).forEach((r) => {
    counts[r.week_id] = (counts[r.week_id] || 0) + 1;
  });

  // Past weeks report who actually played, not who registered.
  const { data: bookings } = await supabaseAdmin.from("bookings").select("week_id");
  const played = {};
  (bookings || []).forEach((b) => {
    played[b.week_id] = (played[b.week_id] || 0) + 1;
  });

  const coverIds = past.map((w) => w.cover_photo_id).filter(Boolean);
  const covers = {};
  if (coverIds.length) {
    const { data: photos } = await supabaseAdmin.from("photos").select("id,path").in("id", coverIds);
    (photos || []).forEach((p) => {
      covers[p.id] = photoUrl(supabaseAdmin, p.path);
    });
  }

  return (
    <div className="wrap">
      <Nav />

      <Reveal as="section" className="panel">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>Weeks</h2>
        <p className="hint">
          Every Gauntlet, one week at a time — what happened, who showed up, and who walked out
          champion. Running totals live on the <a href="/players">Leaderboard</a>.
        </p>

        {open.length > 0 ? (
          open.map((w) => (
            <ActiveWeekCard key={w.id} week={w} booked={counts[w.id] || 0} />
          ))
        ) : (
          <div className="empty">
            No week is open for booking right now — the next one goes up as soon as it&apos;s
            scheduled.
          </div>
        )}

        {past.length > 0 && (
          <>
            <h3 className="weeks-past-title">Previously</h3>
            <div className="weeks-past">
              {past.map((w) => (
                <WeekRecap
                  key={w.id}
                  week={w}
                  booked={played[w.id] ?? counts[w.id] ?? 0}
                  coverUrl={covers[w.cover_photo_id] || null}
                />
              ))}
            </div>
          </>
        )}
      </Reveal>
    </div>
  );
}
