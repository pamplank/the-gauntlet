"use client";
import { useEffect, useState } from "react";
import Nav from "../Nav";

const PLACE_WOUNDS = { 1: 1, 2: 2, 3: 3, 4: 4 };

export default function AdminPage() {
  const [session, setSession] = useState(null); // {needsSetup, loggedIn}
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [round, setRound] = useState(0);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [results, setResults] = useState([]);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [lateMsg, setLateMsg] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const [swapMsg, setSwapMsg] = useState("");

  async function loadSession() {
    const r = await fetch("/api/session").then((r) => r.json());
    setSession(r);
    if (r.loggedIn) {
      await loadPlayers();
      await loadGames();
      await loadAdminData(0);
    }
  }
  async function loadPlayers() {
    const r = await fetch("/api/players").then((r) => r.json());
    setPlayers(r.players || []);
  }
  async function loadGames() {
    const r = await fetch("/api/games").then((r) => r.json());
    setGames(r.games || []);
  }
  async function loadAdminData(r0) {
    const r = await fetch(`/api/admin-data?round=${r0}`).then((r) => r.json());
    setScheduleRows(r.schedule || []);
    setResults(r.results || []);
    setHasSchedule(r.hasSchedule || false);
  }

  useEffect(() => {
    loadSession();
  }, []);
  useEffect(() => {
    if (session?.loggedIn) loadAdminData(round);
    setSwapA("");
    setSwapB("");
    setSwapMsg("");
  }, [round]);

  async function submitSetup() {
    setErr("");
    const r = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    }).then((r) => r.json());
    if (r.error) setErr(r.error);
    else loadSession();
  }
  async function submitLogin() {
    setErr("");
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    }).then((r) => r.json());
    if (r.error) setErr(r.error);
    else loadSession();
  }
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    loadSession();
  }

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(f);
  }
  async function addPlayer() {
    if (!name.trim()) return;
    setLateMsg("");
    const r = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image }),
    }).then((r) => r.json());
    if (r.error) {
      alert(r.error);
      return;
    }
    setName("");
    setImage(null);
    loadPlayers();
    if (r.late) {
      if (r.gamesAssigned === 0) {
        setLateMsg(
          `${r.player.name} was added, but every remaining round is already full or underway — they weren't slotted into any games.`
        );
      } else if (r.gamesAssigned === r.totalGames) {
        setLateMsg(`${r.player.name} added as a late arrival and slotted into all ${r.totalGames} games.`);
      } else {
        setLateMsg(
          `${r.player.name} added as a late arrival — slotted into ${r.gamesAssigned} of ${r.totalGames} games. Missed: ${r.missedGames.join(", ")}.`
        );
      }
      loadAdminData(round);
    }
  }
  async function removePlayer(id) {
    await fetch(`/api/players?id=${id}`, { method: "DELETE" });
    loadPlayers();
  }
  function startEdit(p) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditImage(null);
  }
  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditImage(null);
  }
  function onEditFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setEditImage(reader.result);
    reader.readAsDataURL(f);
  }
  async function saveEdit(id) {
    if (!editName.trim()) return;
    const body = { id, name: editName };
    if (editImage) body.image = editImage;
    const r = await fetch("/api/players", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    if (r.error) {
      alert(r.error);
      return;
    }
    cancelEdit();
    loadPlayers();
  }
  async function renameGame(id, newName) {
    setGames((gs) => gs.map((g) => (g.id === id ? { ...g, name: newName } : g)));
  }
  async function saveGameName(id, currentName) {
    await fetch("/api/games", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: currentName }),
    });
  }
  async function generate() {
    if (hasSchedule && !confirm("This replaces the current schedule and clears all recorded results. Continue?")) return;
    setGenerating(true);
    await fetch("/api/generate-schedule", { method: "POST" }).then((r) => r.json());
    setGenerating(false);
    loadAdminData(round);
  }
  async function doSwap() {
    if (!swapA || !swapB || swapA === swapB) return;
    setSwapMsg("");
    const r = await fetch("/api/swap-schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, playerIdA: swapA, playerIdB: swapB }),
    }).then((r) => r.json());
    if (r.error) {
      setSwapMsg(r.error);
      return;
    }
    setSwapA("");
    setSwapB("");
    setSwapMsg("Swapped.");
    loadAdminData(round);
  }

  if (!session) return <div className="wrap"><Nav /><div className="panel">Loading…</div></div>;

  if (session.needsSetup) {
    return (
      <div className="wrap">
        <Nav />
        <div className="panel">
          <h2>Set Up Admin Account</h2>
          <p className="hint">
            Only one admin account exists — share this password with every game master. They'll all
            use it to log in and update match results.
          </p>
          {err && <div className="msg err">{err}</div>}
          <input type="password" placeholder="Choose an admin password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn gold" onClick={submitSetup}>Create Admin Account</button>
        </div>
      </div>
    );
  }

  if (!session.loggedIn) {
    return (
      <div className="wrap">
        <Nav />
        <div className="panel">
          <h2>Admin / Game Master Login</h2>
          {err && <div className="msg err">{err}</div>}
          <input type="password" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button className="btn gold" onClick={submitLogin}>Log In</button>
        </div>
      </div>
    );
  }

  const byGame = {};
  scheduleRows.forEach((row) => {
    byGame[row.game_id] = byGame[row.game_id] || [];
    byGame[row.game_id].push(row);
  });
  const resultLookup = {};
  results.forEach((r) => {
    resultLookup[r.game_id] = resultLookup[r.game_id] || {};
    resultLookup[r.game_id][r.player_id] = r.placement;
  });
  const gameNameById = {};
  games.forEach((g) => (gameNameById[g.id] = g.name));
  const swappableRows = scheduleRows.filter(
    (row) => !resultLookup[row.game_id] || Object.keys(resultLookup[row.game_id]).length === 0
  );

  return (
    <div className="wrap">
      <Nav />

      <div className="panel">
        <h2>Combatants ({players.length} / 36)</h2>
        <p className="hint">
          Add each player's name and optional photo. Fewer than 36 is fine — unused seats show as
          empty; if a game round has fewer than 4 real players, the schedule auto-fills the rest
          with filler slots. Click <strong>Edit</strong> on any combatant to rename them or add/change
          their photo at any time — this never touches the schedule or recorded results.
          {hasSchedule && (
            <>
              {" "}Since the schedule's already generated, adding someone now treats them as a{" "}
              <strong>late arrival</strong>: they'll automatically take over filler seats in
              whichever rounds haven't started yet, playing as many games as still have room —
              possibly fewer than 9 if some rounds are already underway.
            </>
          )}
        </p>
        {lateMsg && <div className="msg">{lateMsg}</div>}
        <input type="text" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="file" accept="image/*" onChange={onFile} />
        <button className="btn" onClick={addPlayer}>Add Player</button>
        <div style={{ marginTop: 14 }}>
          {players.map((p) =>
            editingId === p.id ? (
              <div className="player-row editing" key={p.id}>
                {editImage ? (
                  <img className="avatar" src={editImage} />
                ) : p.image_url ? (
                  <img className="avatar" src={p.image_url} />
                ) : (
                  <div className="avatar placeholder">{(p.name || "?")[0]?.toUpperCase()}</div>
                )}
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="edit-name"
                />
                <input type="file" accept="image/*" onChange={onEditFile} className="edit-file" />
                <button className="btn small gold" onClick={() => saveEdit(p.id)}>Save</button>
                <button className="btn small ghost" onClick={cancelEdit}>Cancel</button>
              </div>
            ) : (
              <div className="player-row" key={p.id}>
                {p.image_url ? (
                  <img className="avatar" src={p.image_url} />
                ) : (
                  <div className="avatar placeholder">{(p.name || "?")[0]?.toUpperCase()}</div>
                )}
                <span className="name">{p.name}</span>
                <button className="btn small ghost" onClick={() => startEdit(p)}>Edit</button>
                <button className="btn small ghost" onClick={() => removePlayer(p.id)}>Remove</button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="panel">
        <h2>The 9 Games</h2>
        <p className="hint">Name each game/station. Each game master runs one of these.</p>
        {games.map((g) => (
          <input
            key={g.id}
            type="text"
            value={g.name}
            onChange={(e) => renameGame(g.id, e.target.value)}
            onBlur={(e) => saveGameName(g.id, e.target.value)}
          />
        ))}
      </div>

      <div className="panel">
        <h2>Schedule</h2>
        <p className="hint">
          Generates 9 rounds so every player plays every one of the 9 games exactly once, one game
          per round, with all 9 games running simultaneously each round. The generator tries hard
          to avoid repeatedly pairing the same players together, but with 36 players across 9
          rounds a handful of repeat pairings is normal and expected.
        </p>
        <button className="btn gold" onClick={generate} disabled={generating}>
          {generating ? "Generating…" : hasSchedule ? "Regenerate Schedule" : "Generate Schedule"}
        </button>
      </div>

      {hasSchedule && (
        <div className="panel">
          <h2>Record Match Results</h2>
          <p className="hint">
            Each game master records their own game's results, per round. Selecting all four
            placements saves automatically and updates the leaderboard.
          </p>
          <div className="round-selector">
            {games.map((_, r) => (
              <button key={r} className={round === r ? "active" : ""} onClick={() => setRound(r)}>
                Round {r + 1}
              </button>
            ))}
          </div>

          <div className="swap-tool">
            <label>Reassign a player's game this round</label>
            <p className="hint" style={{ marginTop: 2 }}>
              Swaps who's playing what for Round {round + 1} — only works for matches that haven't
              recorded a result yet.
            </p>
            <div className="swap-row">
              <select value={swapA} onChange={(e) => setSwapA(e.target.value)}>
                <option value="">Move this player…</option>
                {swappableRows.map((row) => (
                  <option key={row.player_id} value={row.player_id}>
                    {row.players?.is_filler ? "(filler)" : row.players?.name} — {gameNameById[row.game_id] || "?"}
                  </option>
                ))}
              </select>
              <span>⇄</span>
              <select value={swapB} onChange={(e) => setSwapB(e.target.value)}>
                <option value="">…swap with this one</option>
                {swappableRows.map((row) => (
                  <option key={row.player_id} value={row.player_id}>
                    {row.players?.is_filler ? "(filler)" : row.players?.name} — {gameNameById[row.game_id] || "?"}
                  </option>
                ))}
              </select>
              <button className="btn small gold" onClick={doSwap} disabled={!swapA || !swapB || swapA === swapB}>
                Swap
              </button>
            </div>
            {swapMsg && <div className={"msg" + (swapMsg === "Swapped." ? "" : " err")}>{swapMsg}</div>}
          </div>

          <div className="match-grid">
            {games.map((g) => (
              <MatchCard
                key={g.id}
                game={g}
                round={round}
                group={byGame[g.id] || []}
                existing={resultLookup[g.id] || {}}
                onSaved={() => loadAdminData(round)}
              />
            ))}
          </div>
        </div>
      )}

      <button className="btn ghost" onClick={logout}>Log Out</button>
    </div>
  );
}

function MatchCard({ game, round, group, existing, onSaved }) {
  const [sel, setSel] = useState(() => ({ ...existing }));
  const done = Object.keys(existing).length === 4 && group.filter((g) => !g.players?.is_filler).length <= Object.keys(existing).length;

  async function save() {
    const placements = {};
    let valid = true;
    const used = new Set();
    group.forEach((row) => {
      if (row.players?.is_filler) return;
      const val = sel[row.player_id];
      if (!val || used.has(val)) {
        valid = false;
        return;
      }
      used.add(val);
      placements[row.player_id] = parseInt(val, 10);
    });
    if (!valid) {
      alert("Assign a unique place (1st-4th) to every real player before saving.");
      return;
    }
    const r = await fetch("/api/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, gameId: game.id, placements }),
    }).then((r) => r.json());
    if (r.error) alert(r.error);
    else onSaved();
  }

  return (
    <div className={"match-card" + (done ? " done" : "")}>
      <h3>{game.name} — Round {round + 1}</h3>
      {group.length === 0 ? (
        <div className="empty">No players scheduled this round.</div>
      ) : (
        <>
          {group.map((row) => (
            <div className="place-row" key={row.player_id}>
              <div className="placelabel">{row.players?.is_filler ? "(filler)" : row.players?.name}</div>
              <select
                disabled={row.players?.is_filler}
                value={sel[row.player_id] || ""}
                onChange={(e) => setSel((s) => ({ ...s, [row.player_id]: e.target.value }))}
              >
                <option value="">Place…</option>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : "4th"} ({PLACE_WOUNDS[n]} wound{PLACE_WOUNDS[n] > 1 ? "s" : ""})
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button className="btn save" style={{ marginTop: 8, width: "100%" }} onClick={save}>
            Save Result
          </button>
        </>
      )}
    </div>
  );
}
