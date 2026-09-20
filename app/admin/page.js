"use client";
import { useEffect, useState } from "react";
import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import { artFor } from "../../lib/gameArt";
import { woundsFor, formatWounds } from "../../lib/scoring";

const PLACE_WOUNDS = { 1: 1, 2: 2, 3: 3, 4: 4 };

// Tables can seat more than four now, so placements run past "4th" and a
// placement's wound cost depends on how many played.
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
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
  const [allResults, setAllResults] = useState([]);
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
  const [weeks, setWeeks] = useState([]);
  const [weekLabel, setWeekLabel] = useState("");
  const [weekDate, setWeekDate] = useState("");
  const [weekMsg, setWeekMsg] = useState("");
  const [weekBookings, setWeekBookings] = useState([]);
  const [addBookingName, setAddBookingName] = useState("");
  const [addBookingMsg, setAddBookingMsg] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [regFilter, setRegFilter] = useState("all");
  const [regMsg, setRegMsg] = useState("");
  const [openReg, setOpenReg] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [recapWeekId, setRecapWeekId] = useState("");
  const [recapText, setRecapText] = useState("");
  const [recapCover, setRecapCover] = useState("");
  const [recapMsg, setRecapMsg] = useState("");
  const [runWeekId, setRunWeekId] = useState("");
  const [photoMsg, setPhotoMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  // Several weeks can be open for booking at once. Only one is ever being
  // played, though, so the game panels below need one unambiguous target:
  // whatever is in progress, else the soonest open week, else an explicit pick.
  const openWeeks = weeks
    .filter((w) => w.status === "booking" || w.status === "in_progress")
    .sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
  const runningWeek = weeks.find((w) => w.status === "in_progress") || null;
  const activeWeek =
    weeks.find((w) => w.id === runWeekId) || runningWeek || openWeeks[0] || null;
  const weekId = activeWeek?.id || null;

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
      loadWeeks();
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
  async function loadAdminData(r0, wid) {
    if (!wid) {
      setScheduleRows([]);
      setResults([]);
      return;
    }
    const r = await fetchJSON(`/api/admin-data?round=${r0}&weekId=${wid}`);
    if (r) {
      setScheduleRows(r.schedule || []);
      setResults(r.results || []);
    }
  }
  async function loadTracker(wid) {
    if (!wid) {
      setAllSchedule([]);
      setAllResults([]);
      return;
    }
    const r = await fetchJSON(`/api/tracker?weekId=${wid}`);
    if (r) {
      setAllSchedule(r.schedule || []);
      setAllResults(r.results || []);
    }
  }
  async function loadWeeks() {
    const r = await fetchJSON("/api/weeks");
    if (r) setWeeks(r.weeks || []);
  }
  async function loadRegistrations(wid) {
    const r = await fetchJSON(`/api/registrations${wid ? `?weekId=${wid}` : ""}`);
    if (r) setRegistrations(r.registrations || []);
  }
  async function setRegStatus(id, status) {
    if (status === "rejected" && !confirm("Reject this registration? They won't be added to the roster.")) return;
    setRegMsg("");
    const r = await fetch("/api/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).then((r) => r.json());
    if (r.error) {
      setRegMsg(r.error);
      return;
    }
    loadRegistrations(weekId);
    loadWeekBookings(weekId);
    loadPlayers();
  }
  async function viewProof(id) {
    setRegMsg("");
    const r = await fetch(`/api/registrations/proof?id=${id}`).then((r) => r.json());
    if (r.error) {
      setRegMsg(r.error);
      return;
    }
    window.open(r.url, "_blank", "noopener");
  }

  async function loadWeekBookings(weekId) {
    if (!weekId) {
      setWeekBookings([]);
      return;
    }
    const r = await fetchJSON(`/api/bookings?weekId=${weekId}`);
    if (r) setWeekBookings(r.bookings || []);
  }

  async function loadPhotos() {
    const r = await fetchJSON("/api/photos");
    if (r) setPhotos(r.photos || []);
  }

  async function uploadPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // let the same file be picked again after a failure
    if (files.length === 0) return;

    setPhotoMsg("");
    setUploading(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("photos", f));

    const r = await fetch("/api/photos", { method: "POST", body: fd })
      .then((res) => res.json())
      .catch(() => ({ error: "Upload failed — check your connection and try again." }));
    setUploading(false);

    if (r.error) {
      setPhotoMsg(r.error);
      return;
    }
    setPhotoMsg(`Added ${r.added} photo${r.added === 1 ? "" : "s"}.`);
    loadPhotos();
  }

  async function deletePhoto(id) {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    setPhotoMsg("");
    const r = await fetch(`/api/photos?id=${id}`, { method: "DELETE" }).then((res) => res.json());
    if (r.error) {
      setPhotoMsg(r.error);
      return;
    }
    loadPhotos();
  }

  async function saveRecap() {
    if (!recapWeekId) return;
    setRecapMsg("");
    const r = await fetch("/api/weeks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recapWeekId, highlight: recapText, coverPhotoId: recapCover || null }),
    }).then((res) => res.json());
    if (r.error) {
      setRecapMsg(r.error);
      return;
    }
    setRecapMsg("Recap saved.");
    loadWeeks();
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (session?.loggedIn) {
      loadAdminData(round, weekId);
      loadTracker(weekId);
    }
    setMmPlayer("");
    setMmGame("");
    setMmMsg("");
    setRandomSelected([]);
    setRandomMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, weekId, session?.loggedIn]);
  useEffect(() => {
    if (session?.loggedIn && weekId) loadWeekBookings(weekId);
    else setWeekBookings([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, session?.loggedIn]);
  useEffect(() => {
    if (session?.loggedIn) loadRegistrations(weekId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekId, session?.loggedIn]);
  useEffect(() => {
    if (session?.loggedIn) loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.loggedIn]);
  // Load whichever week's recap is selected into the editor, so switching
  // weeks never shows another week's text in the box.
  useEffect(() => {
    const w = weeks.find((x) => x.id === recapWeekId);
    setRecapText(w?.highlight || "");
    setRecapCover(w?.cover_photo_id || "");
    setRecapMsg("");
  }, [recapWeekId, weeks]);

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
  function editGameField(id, field, value) {
    setGames((gs) => gs.map((g) => (g.id === id ? { ...g, [field]: value } : g)));
  }
  async function saveGame(id, patch) {
    const r = await fetch("/api/games", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    }).then((r) => r.json());
    if (r.error) alert(r.error);
  }
  async function assignPlayer() {
    if (!mmPlayer || !mmGame) return;
    setMmMsg("");
    const r = await fetch("/api/matchmake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ round, gameId: mmGame, playerId: mmPlayer, weekId }),
    }).then((r) => r.json());
    if (r.error) {
      setMmMsg(r.error);
      return;
    }
    setMmPlayer("");
    setMmGame("");
    loadAdminData(round, weekId);
    loadTracker(weekId);
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
      body: JSON.stringify({ round, playerIds: randomSelected, weekId }),
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
    loadAdminData(round, weekId);
    loadTracker(weekId);
  }
  async function unassignPlayer(gameId, playerId) {
    const q = `round=${round}&gameId=${gameId}&playerId=${playerId}&weekId=${weekId}`;
    const r = await fetch(`/api/matchmake?${q}`, { method: "DELETE" }).then((r) => r.json());
    if (r.error) {
      alert(r.error);
      return;
    }
    loadAdminData(round, weekId);
    loadTracker(weekId);
  }

  async function openWeek() {
    if (!weekLabel.trim()) return;
    setWeekMsg("");
    const r = await fetch("/api/weeks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: weekLabel, eventDate: weekDate || null }),
    }).then((r) => r.json());
    if (r.error) {
      setWeekMsg(r.error);
      return;
    }
    setWeekLabel("");
    setWeekDate("");
    loadWeeks();
  }
  async function transitionWeek(id, status) {
    if (status === "canceled" && !confirm("Cancel this week? This can't be undone.")) return;
    const r = await fetch("/api/weeks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).then((r) => r.json());
    if (r.error) {
      alert(r.error);
      return;
    }
    loadWeeks();
  }
  async function removeWeekBooking(id) {
    if (!confirm("Remove this booking?")) return;
    await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    loadWeekBookings(activeWeek?.id);
    loadWeeks();
  }
  async function addBookingManually() {
    if (!activeWeek || !addBookingName.trim()) return;
    setAddBookingMsg("");
    const r = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekId: activeWeek.id, name: addBookingName.trim() }),
    }).then((r) => r.json());
    if (r.error) {
      setAddBookingMsg(r.error);
      return;
    }
    setAddBookingName("");
    loadWeekBookings(activeWeek.id);
    loadWeeks();
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

  // Assigned = seated at that game, which is what blocks a repeat.
  // Recorded = a result has actually been saved for it.
  const recordedGamesByPlayer = {};
  allResults.forEach((row) => {
    recordedGamesByPlayer[row.player_id] = recordedGamesByPlayer[row.player_id] || new Set();
    recordedGamesByPlayer[row.player_id].add(row.game_id);
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
    ? games.filter(
        (g) =>
          !playedGamesByPlayer[mmPlayer]?.has(g.id) &&
          // Per-game seat limit, not a flat four — and 0 means benched.
          (g.max_players ?? 4) > 0 &&
          (byGame[g.id] || []).length < (g.max_players ?? 4)
      )
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

  const pastWeeks = weeks.filter((w) => w.status === "completed" || w.status === "canceled");
  const scopeLabel = activeWeek?.label || "No active week";

  return (
    <div className="wrap">
      <Nav />

      <div className="panel">
        <SectionLabel>Admin</SectionLabel>
        <h2>Weeks</h2>
        <p className="hint">
          Open as many weeks for booking as you like — when the nearest sells out, people book the
          one after it. Only one week can be <em>in progress</em> at a time, and that&apos;s the
          one Matchmaking, the Tracker and Results operate on.
        </p>

        {weekMsg && <div className="msg err">{weekMsg}</div>}

        <div className="swap-row" style={{ marginBottom: 18 }}>
          <input
            type="text"
            placeholder="Week label (e.g. Week 20 — Sept 26)"
            value={weekLabel}
            onChange={(e) => setWeekLabel(e.target.value)}
          />
          <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
          <button className="btn gold" onClick={openWeek}>Open Week for Booking</button>
        </div>

        {openWeeks.length > 1 && (
          <div className="swap-row" style={{ marginBottom: 14 }}>
            <span className="book-label" style={{ alignSelf: "center" }}>Panels below act on</span>
            <select value={weekId || ""} onChange={(e) => setRunWeekId(e.target.value)}>
              {openWeeks.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label} ({w.status})
                </option>
              ))}
            </select>
          </div>
        )}

        {openWeeks.length === 0 && (
          <div className="empty">No weeks open. Create one above to start taking bookings.</div>
        )}

        {openWeeks.map((activeWeek) => (
          <div
            className={"week-banner" + (activeWeek.id === weekId ? " selected" : "")}
            key={activeWeek.id}
          >
            <div>
              <strong>{activeWeek.label}</strong>{" "}
              <span className="status-pill">
                {activeWeek.status === "booking" ? "Booking Open" : "In Progress"}
              </span>
              <div className="hint" style={{ marginTop: 4 }}>
                {/* Per-week count from the API — weekBookings only holds the
                    selected week, so using it here would repeat one number
                    across every banner. */}
                {activeWeek.bookingCount ?? 0} / 36 booked
                {activeWeek.event_date ? ` · ${activeWeek.event_date}` : ""}
              </div>
            </div>
            <div className="swap-row" style={{ marginTop: 8 }}>
              {activeWeek.status === "booking" && (
                <button className="btn small gold" onClick={() => transitionWeek(activeWeek.id, "in_progress")}>
                  Close Booking &amp; Start Matchmaking
                </button>
              )}
              {activeWeek.status === "in_progress" && (
                <button className="btn small gold" onClick={() => transitionWeek(activeWeek.id, "completed")}>
                  Complete Week
                </button>
              )}
              <button className="btn small ghost" onClick={() => transitionWeek(activeWeek.id, "canceled")}>
                Cancel Week
              </button>
            </div>

            {/* Roster editing only on the selected week — the name field and
                the bookings list are single-week state. */}
            {activeWeek.id === weekId && activeWeek.status === "booking" && (
              <div className="swap-row" style={{ marginTop: 12 }}>
                <input
                  type="text"
                  list="admin-known-players"
                  placeholder="Add a confirmed booking by name…"
                  value={addBookingName}
                  onChange={(e) => setAddBookingName(e.target.value)}
                />
                <datalist id="admin-known-players">
                  {players.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <button className="btn small gold" onClick={addBookingManually} disabled={!addBookingName.trim()}>
                  Add Booking
                </button>
              </div>
            )}
            {activeWeek.id === weekId && addBookingMsg && (
              <div className="msg err" style={{ marginTop: 8 }}>{addBookingMsg}</div>
            )}

            {activeWeek.id === weekId && weekBookings.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {weekBookings.map((b) => (
                  <div className="player-row" key={b.id}>
                    {b.players?.image_url ? (
                      <img className="avatar tiny" src={b.players.image_url} />
                    ) : (
                      <div className="avatar tiny placeholder">{(b.players?.name || "?")[0]?.toUpperCase()}</div>
                    )}
                    <span className="name">{b.players?.name}</span>
                    <button className="btn small ghost" onClick={() => removeWeekBooking(b.id)}>Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {pastWeeks.length > 0 && (
          <div className="hint" style={{ marginTop: 12 }}>
            Past weeks:{" "}
            {pastWeeks.map((w) => (
              <a key={w.id} href={`/weeks/${w.id}`} style={{ marginRight: 10 }}>
                {w.label} ({w.status})
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <SectionLabel>Bookings</SectionLabel>
        <h2>Registrations</h2>
        <p className="hint">
          Everyone who submitted the form on <a href="/book">Book a Spot</a>. Check the payment
          proof, then confirm to add them to the roster — confirming creates or matches their
          combatant record automatically.
        </p>

        {regMsg && <div className="msg err">{regMsg}</div>}

        <div className="swap-row" style={{ marginBottom: 16 }}>
          <div className="mode-toggle" style={{ marginBottom: 0 }}>
            {["all", "pending", "confirmed", "rejected"].map((f) => (
              <button key={f} className={regFilter === f ? "active" : ""} onClick={() => setRegFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)}
                {f !== "all" && ` (${registrations.filter((r) => r.status === f).length})`}
              </button>
            ))}
          </div>
          <a
            className="btn small ghost"
            href={`/api/registrations/export${weekId ? `?weekId=${weekId}` : ""}`}
          >
            ↓ Export CSV
          </a>
        </div>

        {registrations.length === 0 ? (
          <div className="empty">No registrations yet.</div>
        ) : (
          <div className="tracker-wrap">
            <table className="lb reg-table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Paid via</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {registrations
                  .filter((r) => regFilter === "all" || r.status === regFilter)
                  .map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button className="link-btn" onClick={() => setOpenReg(openReg === r.id ? null : r.id)}>
                          {r.nickname}
                        </button>
                        <div style={{ fontSize: 12, color: "var(--bone-dim)" }}>{r.full_name}</div>
                      </td>
                      <td style={{ fontSize: 13 }}>
                        {r.contact_number}
                        {r.email && (
                          <div style={{ fontSize: 12, color: "var(--bone-dim)" }}>{r.email}</div>
                        )}
                      </td>
                      <td style={{ fontSize: 13, textTransform: "capitalize" }}>{r.payment_method}</td>
                      <td style={{ fontSize: 13 }}>{r.reference_number}</td>
                      <td>
                        <span className={"reg-status " + r.status}>{r.status}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button className="btn small ghost" onClick={() => viewProof(r.id)}>Proof</button>{" "}
                        {r.status !== "confirmed" && (
                          <button className="btn small gold" onClick={() => setRegStatus(r.id, "confirmed")}>
                            Confirm
                          </button>
                        )}{" "}
                        {r.status !== "rejected" && (
                          <button className="btn small ghost" onClick={() => setRegStatus(r.id, "rejected")}>
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {openReg && (
          <div className="reg-detail">
            {(() => {
              const r = registrations.find((x) => x.id === openReg);
              if (!r) return null;
              const rows = [
                ["Full name", r.full_name],
                ["Nickname", r.nickname],
                ["Age range", r.age_range],
                ["Gender", r.gender],
                ["Contact", r.contact_number],
                ["Email", r.email],
                ["Facebook", r.facebook],
                ["Instagram", r.instagram],
                ["Board game familiarity", r.familiarity ? `${r.familiarity} / 5` : null],
                ["Joining as", r.joining_as],
                ["Heard about us from", r.heard_from],
                ["Paid via", r.payment_method],
                ["Reference", r.reference_number],
              ];
              return (
                <>
                  <h3>{r.nickname}</h3>
                  <dl>
                    {rows
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt>{k}</dt>
                          <dd>{v}</dd>
                        </div>
                      ))}
                  </dl>
                  <button className="btn small ghost" onClick={() => setOpenReg(null)}>Close</button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      <div className="panel">
        <SectionLabel>Weeks</SectionLabel>
        <h2>Week recaps</h2>
        <p className="hint">
          A couple of sentences about how a week actually went, plus a cover shot. These show on
          the public <a href="/weeks">Weeks</a> page once a week is completed.
        </p>

        {recapMsg && (
          <div className={"msg " + (recapMsg === "Recap saved." ? "ok" : "err")}>{recapMsg}</div>
        )}

        <div className="swap-row" style={{ marginBottom: 14 }}>
          <select value={recapWeekId} onChange={(e) => setRecapWeekId(e.target.value)}>
            <option value="">Choose a week…</option>
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} ({w.status})
              </option>
            ))}
          </select>
        </div>

        {recapWeekId && (
          <>
            <label className="reg-field" style={{ marginBottom: 14 }}>
              <span>The vibe that week</span>
              <textarea
                rows={3}
                value={recapText}
                onChange={(e) => setRecapText(e.target.value)}
                placeholder="e.g. Cash and Guns got loud enough that the neighbours checked in. Three people came solo and left in a group chat."
              />
            </label>

            <div className="reg-field" style={{ marginBottom: 16 }}>
              <span>Cover photo</span>
              {photos.length === 0 ? (
                <small>Upload photos below first — they become selectable here.</small>
              ) : (
                <div className="cover-picker">
                  <button
                    type="button"
                    className={"cover-none" + (recapCover === "" ? " on" : "")}
                    onClick={() => setRecapCover("")}
                  >
                    None
                  </button>
                  {photos.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className={"cover-cell" + (recapCover === p.id ? " on" : "")}
                      onClick={() => setRecapCover(p.id)}
                      aria-pressed={recapCover === p.id}
                    >
                      <img src={p.url} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="btn gold" onClick={saveRecap}>Save Recap</button>
          </>
        )}
      </div>

      <div className="panel">
        <SectionLabel>Event photos</SectionLabel>
        <h2>Photos</h2>
        <p className="hint">
          One pool of photos for the whole site — they show in the strip on the homepage. Upload
          new ones whenever, delete the ones you're tired of. No redeploy needed.
        </p>

        {photoMsg && (
          <div className={"msg " + (photoMsg.startsWith("Added") ? "ok" : "err")}>{photoMsg}</div>
        )}

        <div className="swap-row" style={{ marginBottom: 16 }}>
          <label className="btn small gold" style={{ cursor: uploading ? "wait" : "pointer" }}>
            {uploading ? "Uploading…" : "Add Photos"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              onChange={uploadPhotos}
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
        </div>

        {photos.length === 0 ? (
          <div className="empty">No photos yet.</div>
        ) : (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>
              {photos.length} photo{photos.length === 1 ? "" : "s"} · shown in this order
            </p>
            <div className="photo-admin-grid">
              {photos.map((p) => (
                <figure className="photo-admin-cell" key={p.id}>
                  <img src={p.url} alt="" loading="lazy" />
                  <button className="btn small ghost" onClick={() => deletePhoto(p.id)}>
                    Delete
                  </button>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="panel">
        <SectionLabel>Roster</SectionLabel>
        <h2>Combatants ({players.length})</h2>
        <p className="hint">
          Add each player's name and optional photo. Use Matchmaking below to place them into a
          game once they're actually here — there's no fixed schedule to generate anymore. Click{" "}
          <strong>Edit</strong> on any combatant to rename them or add/change their photo at any
          time. This roster is shared across every week.
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
        <SectionLabel>Configuration</SectionLabel>
        <h2>The 9 Games</h2>
        <p className="hint">
          Write each game's description — it saves when you click away, and shows on the public{" "}
          <a href="/games">Games</a> page. Box art is matched automatically from the image files
          in <code>/public</code>; if a thumbnail is missing below, the game's name no longer
          matches its filename.
        </p>
        <div className="game-edit-grid">
          {games.map((g, i) => {
            const art = artFor(g.name);
            return (
              <div className="game-edit" key={g.id}>
                <div className="game-edit-head">
                  <span className="games-name-num">{i + 1}</span>
                  <input
                    type="text"
                    value={g.name || ""}
                    onChange={(e) => editGameField(g.id, "name", e.target.value)}
                    onBlur={(e) => saveGame(g.id, { name: e.target.value })}
                  />
                </div>

                {art ? (
                  <div className="game-edit-thumb">
                    <img src={art} alt={g.name} />
                  </div>
                ) : (
                  <div className="game-edit-thumb empty-thumb">No art matched</div>
                )}

                <textarea
                  rows={4}
                  placeholder="What is this game, and how do you win it?"
                  value={g.description || ""}
                  onChange={(e) => editGameField(g.id, "description", e.target.value)}
                  onBlur={(e) => saveGame(g.id, { description: e.target.value })}
                />

                <label className={"seat-cap" + (Number(g.max_players) === 0 ? " benched" : "")}>
                  <span>{Number(g.max_players) === 0 ? "Benched this week" : "Seats at this table"}</span>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={g.max_players ?? 4}
                    onChange={(e) => editGameField(g.id, "max_players", e.target.value)}
                    onBlur={(e) => saveGame(g.id, { maxPlayers: e.target.value })}
                  />
                </label>

                <label className={"fav-toggle" + (g.is_favorite ? " on" : "")}>
                  <input
                    type="checkbox"
                    checked={!!g.is_favorite}
                    onChange={(e) => {
                      editGameField(g.id, "is_favorite", e.target.checked);
                      saveGame(g.id, { isFavorite: e.target.checked });
                    }}
                  />
                  ★ Crowd Favourite
                </label>
              </div>
            );
          })}
        </div>
      </div>

      {!weekId ? (
        <div className="panel">
          <SectionLabel>Matchmaking</SectionLabel>
          <h2>No active week</h2>
          <p className="hint">
            Matchmaking, the tracker and result recording all belong to a week. Open one in the
            Weeks panel above to start placing players into games.
          </p>
        </div>
      ) : (
      <>
      <div className="panel">
        <SectionLabel>{scopeLabel}</SectionLabel>
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
        <SectionLabel>{scopeLabel}</SectionLabel>
        <h2>Tracker</h2>
        <p className="hint">
          Games each combatant has taken this week, any round. <span className="mark-yes">✓</span>{" "}
          means the result is saved; <span className="mark-seated">○</span> means they&apos;re seated
          but the Game Master hasn&apos;t recorded it yet. Both block a repeat. Columns are ordered
          by scarcity — whichever game has been played least sits next to the names, flagged in{" "}
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
                      const seated = playedGamesByPlayer[p.id]?.has(g.id);
                      const recorded = recordedGamesByPlayer[p.id]?.has(g.id);
                      return (
                        <td key={g.id} className={scarceIds.has(g.id) ? "scarce-col" : ""}>
                          {recorded ? (
                            <span className="mark-yes" title="Result saved">✓</span>
                          ) : seated ? (
                            <span className="mark-seated" title="Seated — result not saved yet">
                              ○
                            </span>
                          ) : (
                            <span className="mark-no"></span>
                          )}
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
        <SectionLabel>{scopeLabel}</SectionLabel>
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
                key={g.id + "-" + round + "-" + weekId + "-" + Object.keys(existing).length}
                game={g}
                round={round}
                weekId={weekId}
                group={byGame[g.id] || []}
                existing={existing}
                onSaved={() => { loadAdminData(round, weekId); loadTracker(weekId); }}
                onUnassign={(playerId) => unassignPlayer(g.id, playerId)}
              />
            );
          })}
        </div>
      </div>
      </>
      )}

      <button className="btn ghost" onClick={loadSession}>↻ Refresh Data</button>{" "}
      <button className="btn ghost" onClick={logout}>Log Out</button>
    </div>
  );
}

function MatchCard({ game, round, weekId, group, existing, onSaved, onUnassign }) {
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
      body: JSON.stringify({ round, gameId: game.id, placements, weekId }),
    }).then((r) => r.json());
    if (r.error) alert(r.error);
    else onSaved();
  }

  async function unsave() {
    if (!confirm("Clear the recorded result for this match? You'll be able to unassign players and re-enter placements afterward.")) return;
    const q = `round=${round}&gameId=${game.id}${weekId ? `&weekId=${weekId}` : ""}`;
    const r = await fetch(`/api/results?${q}`, { method: "DELETE" }).then((r) => r.json());
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
                      {n === 1
                        ? `${ordinal(n)} (recovery — 1 wound back)`
                        : `${ordinal(n)} (${formatWounds(woundsFor(n, group.length))} wounds)`}
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
          {done && (
            <button className="btn small ghost" style={{ marginTop: 6, width: "100%" }} onClick={unsave}>
              ↺ Unsave Result
            </button>
          )}
        </>
      )}
    </div>
  );
}
