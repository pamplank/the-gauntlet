import { supabaseAdmin } from "../../lib/db";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";
import WeeksList from "./WeeksList";

export const dynamic = "force-dynamic";

export default async function WeeksPage() {
  const { data: weeks } = await supabaseAdmin.from("weeks").select("*").order("opened_at", { ascending: false });
  const { data: bookings } = await supabaseAdmin.from("bookings").select("week_id");
  const counts = {};
  (bookings || []).forEach((b) => {
    counts[b.week_id] = (counts[b.week_id] || 0) + 1;
  });

  return (
    <div className="wrap">
      <Nav />
      <Reveal as="div" className="panel">
        <SectionLabel>Weekly Gauntlet</SectionLabel>
        <h2>Weeks</h2>
        <p className="hint">
          Every Gauntlet event, one week at a time. Each week has its own leaderboard and
          schedule; running totals live on the <a href="/players">Leaderboard</a>.
        </p>
        <WeeksList weeks={weeks || []} counts={counts} />
      </Reveal>
    </div>
  );
}
