const STATUS_LABEL = {
  booking: "Booking Open",
  in_progress: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

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
                {counts[w.id] || 0} / 36 booked{w.event_date ? ` · ${w.event_date}` : ""}
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
