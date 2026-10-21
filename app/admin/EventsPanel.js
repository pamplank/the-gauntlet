"use client";
import { useEffect, useState } from "react";
import SectionLabel from "../SectionLabel";
import { EVENT_STATUS_LABEL, seatsLeft } from "../../lib/events";

// Self-contained: does its own loading and state rather than threading more
// through the main admin component, which is already very large.
const BLANK = {
  name: "",
  tagline: "",
  eventDate: "",
  timeLabel: "",
  price: "",
  capacity: "",
  posterPath: "",
  details: "",
};

export default function EventsPanel() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [msg, setMsg] = useState("");
  const [openId, setOpenId] = useState("");
  const [regs, setRegs] = useState([]);
  const [regMsg, setRegMsg] = useState("");

  const set = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const good = (m) => m === "Saved." || m.startsWith("Created");

  async function load() {
    const r = await fetch("/api/events?all=1", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null);
    if (r?.events) setEvents(r.events);
  }

  async function loadRegs(id) {
    if (!id) return setRegs([]);
    const r = await fetch(`/api/event-registrations?eventId=${id}`, { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null);
    setRegs(r?.registrations || []);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadRegs(openId);
  }, [openId]);

  async function create() {
    setMsg("");
    const r = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((x) => x.json());
    if (r.error) return setMsg(r.error);
    setMsg(`Created "${r.event.name}".`);
    setForm(BLANK);
    load();
  }

  async function patch(id, body) {
    setMsg("");
    const r = await fetch("/api/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    }).then((x) => x.json());
    if (r.error) return setMsg(r.error);
    setMsg("Saved.");
    load();
  }

  async function setRegStatus(id, status) {
    if (status === "rejected" && !confirm("Reject this booking?")) return;
    setRegMsg("");
    const r = await fetch("/api/event-registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).then((x) => x.json());
    if (r.error) return setRegMsg(r.error);
    loadRegs(openId);
  }

  async function viewProof(id) {
    setRegMsg("");
    const r = await fetch(`/api/event-registrations/proof?id=${id}`).then((x) => x.json());
    if (r.error) return setRegMsg(r.error);
    window.open(r.url, "_blank", "noopener");
  }

  const open = events.find((e) => e.id === openId) || null;

  return (
    <div className="panel">
      <SectionLabel>At @ RUMBLE</SectionLabel>
      <h2>Events</h2>
      <p className="hint">
        Anything that isn&apos;t The Gauntlet — parties, one-offs. Each has its own price, its own
        guest list and its own page. Two nights means two events, so each night sells its own
        tickets.
      </p>

      {msg && <div className={"msg " + (good(msg) ? "ok" : "err")}>{msg}</div>}

      <div className="reg-grid" style={{ marginBottom: 12 }}>
        <label className="reg-field">
          <span>Name <b>*</b></span>
          <input type="text" value={form.name} onChange={set("name")} placeholder="Scared Sober — Oct 30" />
        </label>
        <label className="reg-field">
          <span>Entrance <b>*</b></span>
          <input type="text" value={form.price} onChange={set("price")} placeholder="₱666" />
        </label>
        <label className="reg-field">
          <span>Date</span>
          <input type="date" value={form.eventDate} onChange={set("eventDate")} />
        </label>
        <label className="reg-field">
          <span>Time</span>
          <input type="text" value={form.timeLabel} onChange={set("timeLabel")} placeholder="7PM – 3AM" />
        </label>
        <label className="reg-field">
          <span>Capacity</span>
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={set("capacity")}
            placeholder="blank = no limit"
          />
        </label>
        <label className="reg-field">
          <span>Poster path</span>
          <input
            type="text"
            value={form.posterPath}
            onChange={set("posterPath")}
            placeholder="/scared-sober.webp"
          />
        </label>
      </div>

      <label className="reg-field" style={{ marginBottom: 10 }}>
        <span>Tagline</span>
        <input
          type="text"
          value={form.tagline}
          onChange={set("tagline")}
          placeholder="Alcohol-free Halloween party. Come in costume."
        />
      </label>

      <label className="reg-field" style={{ marginBottom: 14 }}>
        <span>Details</span>
        <textarea
          rows={3}
          value={form.details}
          onChange={set("details")}
          placeholder="What the night is. A blank line starts a new paragraph."
        />
      </label>

      <button className="btn gold" onClick={create} disabled={!form.name.trim() || !form.price.trim()}>
        Create Event
      </button>

      {events.length > 0 && (
        <div style={{ marginTop: 26 }}>
          {events.map((e) => {
            const left = seatsLeft(e, e.taken);
            return (
              <div className={"week-banner" + (openId === e.id ? " selected" : "")} key={e.id}>
                <div>
                  <strong>{e.name}</strong>{" "}
                  <span className="status-pill">{EVENT_STATUS_LABEL[e.status]}</span>
                  <div className="hint" style={{ marginTop: 4 }}>
                    {e.price} · {e.taken} booked
                    {left !== null ? ` · ${left} left` : " · no limit"}
                    {e.event_date ? ` · ${e.event_date}` : ""} ·{" "}
                    <a href={`/events/${e.slug}`} target="_blank" rel="noopener noreferrer">
                      /events/{e.slug}
                    </a>
                  </div>
                </div>
                <div className="swap-row" style={{ marginTop: 8 }}>
                  <select value={e.status} onChange={(ev) => patch(e.id, { status: ev.target.value })}>
                    {Object.entries(EVENT_STATUS_LABEL).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn small ghost"
                    onClick={() => setOpenId(openId === e.id ? "" : e.id)}
                  >
                    {openId === e.id ? "Hide bookings" : `Bookings (${e.taken})`}
                  </button>
                  <a className="btn small ghost" href={`/api/event-registrations/export?eventId=${e.id}`}>
                    Export CSV
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 18, marginBottom: 10 }}>{open.name} — bookings</h3>
          {regMsg && <div className="msg err">{regMsg}</div>}
          {regs.length === 0 ? (
            <div className="empty">No bookings yet.</div>
          ) : (
            <table className="lb">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Paid</th>
                  <th>Ref</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.full_name}
                      <div style={{ fontSize: 12, color: "var(--bone-dim)" }}>{r.email}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{r.contact_number}</td>
                    <td style={{ fontSize: 13, textTransform: "capitalize" }}>{r.payment_method}</td>
                    <td style={{ fontSize: 13 }}>{r.reference_number}</td>
                    <td>
                      <span className={"reg-status " + r.status}>{r.status}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn small ghost" onClick={() => viewProof(r.id)}>
                        Proof
                      </button>{" "}
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
          )}
        </div>
      )}
    </div>
  );
}
