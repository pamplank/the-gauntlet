import { WEEK_CAPACITY } from "../../lib/booking";

const STATUS_LABEL = {
  booking: "Booking Open",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

// The week currently taking bookings — price, seats left, and the CTA.
export function ActiveWeekCard({ week, booked }) {
  const left = Math.max(0, WEEK_CAPACITY - booked);
  const full = left === 0;

  return (
    <div className={"week-now" + (full ? " full" : "")}>
      <div>
        <span className="section-label">{STATUS_LABEL[week.status] || week.status}</span>
        <h3>{week.label}</h3>
        {week.event_date && <p className="week-now-date">{week.event_date}</p>}
        <p className="week-now-seats">
          {full
            ? `All ${WEEK_CAPACITY} seats taken`
            : booked === 0
              ? `Just opened — all ${WEEK_CAPACITY} seats available`
              : `${booked} of ${WEEK_CAPACITY} seats taken — ${left} left`}
        </p>
        {full && <p className="week-now-next">The next week opens a few days ahead.</p>}
      </div>
      <div className="week-now-cta">
        {full ? (
          <span className="soldout-stamp">Sold Out</span>
        ) : (
          <a className="btn gold pill big" href="/book">
            Book a Spot <span aria-hidden="true">→</span>
          </a>
        )}
      </div>
    </div>
  );
}

// A past week: cover shot, the recap, and the numbers.
export function WeekRecap({ week, booked, coverUrl }) {
  return (
    <article className="week-recap">
      {coverUrl ? (
        <div className="week-recap-shot">
          <img src={coverUrl} alt="" loading="lazy" decoding="async" aria-hidden="true" />
        </div>
      ) : (
        <div className="week-recap-shot empty" aria-hidden="true">
          <span>⚔</span>
        </div>
      )}
      <div className="week-recap-body">
        <h3>
          {week.label}
          <span className="status-pill">{STATUS_LABEL[week.status] || week.status}</span>
        </h3>
        <p className="week-recap-meta">
          {week.event_date ? `${week.event_date} · ` : ""}
          {booked} combatants
        </p>
        {week.highlight ? (
          <p className="week-recap-text">{week.highlight}</p>
        ) : (
          <p className="week-recap-text muted">No recap written for this one yet.</p>
        )}
        <a className="week-recap-link" href={`/weeks/${week.id}`}>
          See the leaderboard <span aria-hidden="true">→</span>
        </a>
      </div>
    </article>
  );
}

export default function WeeksList({ weeks, counts }) {
  if (!weeks || weeks.length === 0) {
    return <div className="empty">No weeks yet — check back once the next one is scheduled.</div>;
  }

  return (
    <>
      {weeks.map((w) => {
        const active = w.status === "booking" || w.status === "in_progress";
        return (
          <div className={"week-card" + (active ? " active" : "")} key={w.id}>
            <div>
              <h3>
                {w.label} <span className="status-pill">{STATUS_LABEL[w.status] || w.status}</span>
              </h3>
              <p className="hint">
                {counts[w.id] || 0} / {WEEK_CAPACITY} booked{w.event_date ? ` · ${w.event_date}` : ""}
              </p>
            </div>
            <div>
              {w.status === "booking" ? (
                <a className="btn small gold" href="/book">Book a Spot</a>
              ) : (
                <a className="btn small ghost" href={`/weeks/${w.id}`}>View Leaderboard</a>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
