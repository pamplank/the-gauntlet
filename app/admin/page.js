"use client";
import { useEffect, useState } from "react";
import Nav from "../Nav";

const PLACE_WOUNDS = { 1: 1, 2: 2, 3: 3, 4: 4 };
const PLACE_LABEL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

function gameCode(name) {
  const words = (name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return (words[0] || "?").slice(0, 5).toUpperCase();
  return words.map((w) => w[0]).join("").toUpperCase().slice(0, 6);
}

// Phone photos can be several MB straight off the camera, and every one of
// them rides along in /api/players' response for every dropdown and list
// in the app. Resize + recompress client-side before it ever gets stored.
function resizeImage(file, maxDim = 480, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const [session, setSession] = useState(null); // {needsSetup, loggedIn}
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [round, setRound] = useState(0);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [results, setResults] = useState([]);
  const [allSchedule, setAllSchedule] = useState([]);
  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [mmMode, setMmMode] = useState("manual");
  const [mmPlayer, setMmPlayer] = useState("");
  const [mmGame, setMmGame] = useState("");
  const [mmMsg, setMmMsg] = useState("");
  const [randomSelected, setRandomSelected] = useState([]);
  const [randomMsg, setRandomMsg] = useState("");
  const [randomizing, setRandomizing] = useState(false);

  // A single flaky fetch (cold serverless function, a dropped connection)
  // used to be able to break every load after it in the chain, silently —
  // a few retries with backoff, and each loader runs independently so one
  // failure can't block the others.
  async function fetchJSON(url) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url);
        return await r.json();
      } catch (e) {
        if (attempt === 2) {
          console.error("Failed to load", url, e);
          return null;
        }
        await new Promise((res) => setTimeout(res, 400 * (attempt + 1)));
      }
    }
  }

  async function loadSession() {
    const r = await fetchJSON("/api/session");
    if (!r) return;
    setSession(r);
    if (r.loggedIn) {
      loadPlayers();
      loadGames();
      loadAdminData(round);
      loadTracker();
    }
  }
  async function loadPlayers() {
    const r = await fetchJSON("/api/players");
    if (r) setPlayers(r.players || []);
  }
  async function loadGames() {
    const r = await fetchJSON("/api/games");
    if (r) setGames(r.games || []);
  }
  async function loadAdminData(r0) {
    const r = await fetchJSON(`/api/admin-data?round=${r0}`);
    if (r) {
      setScheduleRows(r.schedule || []);
      setResults(r.results || []);
    }
  }
  async function loadTracker() {
    const r = await fetchJSON("/api/tracker");
    if (r) setAllSchedule(r.schedule || []);
  }

  useEffect(() => {
    loadSession();
  }, []);
  useEffect(() => {
    if (session?.loggedIn) loadAdminData(round);
    setMmPlayer("");
    setMmGame("");
    setMmMsg("");
    setRandomSelected([]);
    setRandomMsg("");
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
    resizeImage(f).then(setImage);
  }
  async function addPlayer() {
    if (!name.trim()) return;
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
    resizeImage(f).then(setEditImage);
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
  async function assignPlayer() {
    if (!mmPlayer || !mmGame) return;
    setMmMsg("");
    const r = await fetch("/api/matchmake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, gameId: mmGame, playerId: mmPlayer }),
    }).then((r) => r.json());
    if (r.error) {
      setMmMsg(r.error);
      return;
    }
    setMmPlayer("");
    setMmGame("");
    loadAdminData(round);
    loadTracker();
  }
  function toggleRandomSelect(id) {
    setRandomSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  async function runRandomize() {
    if (randomSelected.length === 0) return;
    setRandomizing(true);
    setRandomMsg("");
    const r = await fetch("/api/randomize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, playerIds: randomSelected }),
    }).then((r) => r.json());
    setRandomizing(false);
    if (r.error) {
      setRandomMsg(r.error);
      return;
    }
    const nameOf = (id) => players.find((p) => p.id === id)?.name || "?";
    const parts = [`Placed ${r.assignedCount} player${r.assignedCount === 1 ? "" : "s"}.`];
    if (r.unplacedIds?.length) {
      parts.push(`Couldn't place (already played everything open this round): ${r.unplacedIds.map(nameOf).join(", ")}.`);
    }
    if (r.skippedIds?.length) {
      parts.push(`Already assigned this round, skipped: ${r.skippedIds.map(nameOf).join(", ")}.`);
    }
    setRandomMsg(parts.join(" "));
    setRandomSelected([]);
    loadAdminData(round);
    loadTracker();
  }
  async function unassignPlayer(gameId, playerId) {
    const r = await fetch(`/api/matchmake?round=${round}&gameId=${gameId}&playerId=${playerId}`, {
      method: "DELETE",
    }).then((r) => r.json());
    if (r.error) {
      alert(r.error);
      return;
    }
    loadAdminData(round);
    loadTracker();
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

  const playedGamesByPlayer = {};
  const assignedThisRound = new Set();
  allSchedule.forEach((row) => {
    playedGamesByPlayer[row.player_id] = playedGamesByPlayer[row.player_id] || new Set();
    playedGamesByPlayer[row.player_id].add(row.game_id);
    if (row.round === round) assignedThisRound.add(row.player_id);
  });

  const unassignedPlayers = players.filter((p) => !assignedThisRound.has(p.id));
  const availableGames = mmPlayer
    ? games.filter((g) => !playedGamesByPlayer[mmPlayer]?.has(g.id) && (byGame[g.id] || []).length < 4)
    : [];

  // Tracker: order columns by scarcity (fewest total plays first) so the most
  // neglected game sits right next to the names, and flag the scarcest ones.
  const gameTotals = games.map((g) => ({
    ...g,
    total: players.filter((p) => playedGamesByPlayer[p.id]?.has(g.id)).length,
  }));
  const scarceOrder = gameTotals.slice().sort((a, b) => a.total - b.total);
  const scarceIds = new Set(scarceOrder.slice(0, 2).map((g) => g.id));
  const trackedPlayers = players
    .slice()
    .sort((a, b) => (playedGamesByPlayer[a.id]?.size || 0) - (playedGamesByPlayer[b.id]?.size || 0));

  return (
    <div className="wrap">
      <Nav />

      <div className="panel">
        <h2>Combatants ({players.length} / 36)</h2>
        <p className="hint">
          Add each player's name and optional photo. Use Matchmaking below to place them into a
          game once they're actually here — there's no fixed schedule to generate anymore. Click{" "}
          <strong>Edit</strong> on any combatant to rename them or add/change their photo at any
          time.
        </p>
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
        <div className="games-name-grid">
          {games.map((g, i) => (
            <div className="games-name-row" key={g.id}>
              <span className="games-name-num">{i + 1}</span>
              <input
                type="text"
                value={g.name}
                onChange={(e) => renameGame(g.id, e.target.value)}
                onBlur={(e) => saveGameName(g.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Matchmaking — Round {round + 1}</h2>
        <p className="hint">
          Place whoever's actually present into a game for this round. A player can't be placed
          into a game they've already played, or into a game that's already full (4), or into two
          games in the same round.
        </p>
        <div className="round-selector">
          {games.map((_, r) => (
            <button key={r} className={round === r ? "active" : ""} onClick={() => setRound(r)}>
              Round {r + 1}
            </button>
          ))}
        </div>

        <div className="mode-toggle">
          <button className={mmMode === "manual" ? "active" : ""} onClick={() => setMmMode("manual")}>Manual</button>
          <button className={mmMode === "random" ? "active" : ""} onClick={() => setMmMode("random")}>Randomizer</button>
        </div>

        {mmMode === "manual" ? (
          <>
            <div className="swap-row">
              <select value={mmPlayer} onChange={(e) => { setMmPlayer(e.target.value); setMmGame(""); }}>
                <option value="">Pick a present player…</option>
                {unassignedPlayers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <span>→</span>
              <select value={mmGame} onChange={(e) => setMmGame(e.target.value)} disabled={!mmPlayer}>
                <option value="">Pick a game…</option>
                {availableGames.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <button className="btn small gold" onClick={assignPlayer} disabled={!mmPlayer || !mmGame}>
                Assign
              </button>
            </div>
            {mmPlayer && availableGames.length === 0 && (
              <div className="msg err">This player has already played every game, or all remaining games are full this round.</div>
            )}
            {mmMsg && <div className="msg err">{mmMsg}</div>}
          </>
        ) : (
          <>
            <p className="hint" style={{ marginTop: -6 }}>
              Check everyone who's here for this round, then randomize once — it clusters them into
              as few games as possible (up to 4 each) while skipping games they've already played.
            </p>
            <div className="checkbox-list">
              {unassignedPlayers.map((p) => (
                <label key={p.id} className={"checkbox-item" + (randomSelected.includes(p.id) ? " checked" : "")}>
                  <input
                    type="checkbox"
                    checked={randomSelected.includes(p.id)}
                    onChange={() => toggleRandomSelect(p.id)}
                  />
                  {p.image_url ? (
                    <img className="avatar tiny" src={p.image_url} />
                  ) : (
                    <div className="avatar tiny placeholder">{(p.name || "?")[0]?.toUpperCase()}</div>
                  )}
                  {p.name}
                </label>
              ))}
            </div>
            <div className="swap-row">
              <button className="btn small ghost" onClick={() => setRandomSelected(unassignedPlayers.map((p) => p.id))}>
                Select All
              </button>
              <button className="btn small ghost" onClick={() => setRandomSelected([])}>Clear</button>
              <button className="btn gold" onClick={runRandomize} disabled={randomSelected.length === 0 || randomizing}>
                {randomizing ? "Randomizing…" : `Randomize & Assign (${randomSelected.length})`}
              </button>
            </div>
            {randomMsg && <div className="msg">{randomMsg}</div>}
          </>
        )}

        {unassignedPlayers.length === 0 && players.length > 0 && (
          <div className="hint" style={{ marginTop: 10 }}>Everyone's already placed into a game this round.</div>
        )}
      </div>

      <div className="panel">
        <h2>Tracker</h2>
        <p className="hint">
          Games each combatant has already played (any round). Columns are ordered by scarcity —
          whichever game has been played the least sits right next to the names, flagged in{" "}
          <span style={{ color: "var(--warn)" }}>magenta</span>.
        </p>
        {players.length === 0 ? (
          <div className="empty">No combatants yet.</div>
        ) : (
          <div className="tracker-wrap">
            <table className="tracker-table">
              <thead>
                <tr>
                  <th>Combatant</th>
                  {scarceOrder.map((g) => (
                    <th key={g.id} title={g.name} className={scarceIds.has(g.id) ? "scarce" : ""}>
                      {gameCode(g.name)}
                      {scarceIds.has(g.id) && <span className="count-badge">{g.total} played</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trackedPlayers.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="tracker-name">
                        {p.image_url ? (
                          <img className="avatar tiny" src={p.image_url} />
                        ) : (
                          <div className="avatar tiny placeholder">{(p.name || "?")[0]?.toUpperCase()}</div>
                        )}
                        {p.name}
                      </div>
                    </td>
                    {scarceOrder.map((g) => {
                      const on = playedGamesByPlayer[p.id]?.has(g.id);
                      return (
                        <td key={g.id} className={scarceIds.has(g.id) ? "scarce-col" : ""}>
                          {on ? <span className="mark-yes">✓</span> : <span className="mark-no"></span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Record Match Results</h2>
        <p className="hint">
          Each game master records their own game's results, per round. Selecting a placement for
          everyone currently assigned saves automatically and updates the leaderboard.
        </p>
        <div className="round-selector">
          {games.map((_, r) => (
            <button key={r} className={round === r ? "active" : ""} onClick={() => setRound(r)}>
              Round {r + 1}
            </button>
          ))}
        </div>
        <div className="match-grid">
          {games.map((g) => {
            const existing = resultLookup[g.id] || {};
            return (
              <MatchCard
                key={g.id + "-" + round + "-" + Object.keys(existing).length}
                game={g}
                round={round}
                group={byGame[g.id] || []}
                existing={existing}
                onSaved={() => { loadAdminData(round); loadTracker(); }}
                onUnassign={(playerId) => unassignPlayer(g.id, playerId)}
              />
            );
          })}
        </div>
      </div>

      <button className="btn ghost" onClick={loadSession}>↻ Refresh Data</button>{" "}
      <button className="btn ghost" onClick={logout}>Log Out</button>
    </div>
  );
}

function MatchCard({ game, round, group, existing, onSaved, onUnassign }) {
  const [sel, setSel] = useState(() => ({ ...existing }));
  const done = group.length > 0 && Object.keys(existing).length === group.length;

  async function save() {
    const placements = {};
    let valid = true;
    group.forEach((row) => {
      const val = sel[row.player_id];
      if (!val) {
        valid = false;
        return;
      }
      placements[row.player_id] = parseInt(val, 10);
    });
    if (!valid) {
      alert("Assign a place to every player before saving.");
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
        <div className="empty">No players placed here this round.</div>
      ) : (
        <>
          {group.map((row) => (
            <div className="place-row" key={row.player_id}>
              <div className="placelabel">{row.players?.name}</div>
              <select
                value={sel[row.player_id] || ""}
                onChange={(e) => setSel((s) => ({ ...s, [row.player_id]: e.target.value }))}
              >
                <option value="">Place…</option>
                {Array.from({ length: group.length }).map((_, i) => {
                  const n = i + 1;
                  return (
                    <option key={n} value={n}>
                      {PLACE_LABEL[n]} ({PLACE_WOUNDS[n]} wound{PLACE_WOUNDS[n] > 1 ? "s" : ""})
                    </option>
                  );
                })}
              </select>
              {!existing[row.player_id] && (
                <button className="btn small ghost" onClick={() => onUnassign(row.player_id)}>✕</button>
              )}
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
