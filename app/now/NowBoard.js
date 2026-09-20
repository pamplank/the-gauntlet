"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NowBoard({ week, round, rounds, tables, resting }) {
  const router = useRouter();
  const [find, setFind] = useState("");

  // 47 people are reading this between rounds; nobody should have to think
  // about refreshing. Server component, so a refresh re-runs the query.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 25000);
    return () => clearInterval(t);
  }, [router]);

  const q = find.trim().toLowerCase();
  const matches = (n) => q.length > 0 && n.toLowerCase().includes(q);
  const myTable = q ? tables.find((t) => t.players.some(matches)) : null;
  const iAmResting = q && !myTable && resting.some(matches);

  return (
    <>
      <div className="now-head">
        <p className="section-label">Now playing · {week.label}</p>
        <h2>Round {round + 1}</h2>

        <input
          className="now-find"
          type="search"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          placeholder="Type your name to find your table…"
          aria-label="Find your table"
        />

        {myTable && (
          <p className="now-answer">
            Go to <strong>Table {myTable.station}</strong> — {myTable.name}.
          </p>
        )}
        {iAmResting && (
          <p className="now-answer resting">
            You&apos;re resting this round — back next round.
          </p>
        )}
        {q && !myTable && !iAmResting && (
          <p className="now-answer none">No one by that name this round.</p>
        )}
      </div>

      {rounds.length > 1 && (
        <div className="now-rounds">
          {rounds.map((r) => (
            <a
              key={r}
              href={`/now?round=${r}`}
              className={r === round ? "on" : ""}
              aria-current={r === round ? "page" : undefined}
            >
              {r + 1}
            </a>
          ))}
        </div>
      )}

      {tables.length === 0 ? (
        <div className="empty">This round hasn&apos;t been matched up yet.</div>
      ) : (
        <div className="now-grid">
          {tables.map((t) => (
            <section className={"now-table" + (myTable?.id === t.id ? " mine" : "")} key={t.id}>
              <header>
                <span className="now-station">{t.station}</span>
                <h3>{t.name}</h3>
                <span className={"now-state" + (t.done ? " done" : "")}>
                  {t.done ? "Result in" : `${t.players.length} playing`}
                </span>
              </header>
              <ol>
                {t.players.map((n) => (
                  <li key={n} className={matches(n) ? "me" : ""}>
                    {n}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {resting.length > 0 && (
        <section className="now-resting">
          <h3>Resting this round</h3>
          <p>
            {resting.map((n) => (
              <span key={n} className={matches(n) ? "me" : ""}>
                {n}
              </span>
            ))}
          </p>
        </section>
      )}
    </>
  );
}
