"use client";
import { useEffect, useState } from "react";
import SectionLabel from "../SectionLabel";
import { SETTING_FIELDS } from "../../lib/settings";

export default function SettingsPanel() {
  const [values, setValues] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/settings", { cache: "no-store" })
      .then((x) => x.json())
      .catch(() => null);
    if (r?.settings) setValues(r.settings);
    else setMsg(r?.error || "Couldn't load settings.");
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    setMsg("");
    setSaving(true);
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
      .then((x) => x.json())
      .catch(() => ({ error: "Couldn't reach the server." }));
    setSaving(false);
    if (r.error) return setMsg(r.error);
    setValues(r.settings);
    setMsg("Saved.");
  }

  return (
    <div className="panel">
      <SectionLabel>Admin</SectionLabel>
      <h2>Settings</h2>
      <p className="hint">
        The Gauntlet&apos;s ticket price and seat count. Changing these updates the homepage, the
        booking page, the registration form and the footer straight away — no deploy needed.
        Scared Sober and other events price themselves, over in Events.
      </p>

      {msg && <div className={"msg " + (msg === "Saved." ? "ok" : "err")}>{msg}</div>}

      {!values ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="reg-grid" style={{ marginBottom: 14 }}>
            {SETTING_FIELDS.map((f) => (
              <label className="reg-field" key={f.key}>
                <span>
                  {f.label} {f.allowBlank ? null : <b>*</b>}
                </span>
                <input
                  type="text"
                  value={values[f.key] ?? ""}
                  placeholder={f.placeholder}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                />
                <small>{f.hint}</small>
              </label>
            ))}
          </div>

          <div className="swap-row">
            <button className="btn gold" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
            <button className="btn ghost" onClick={load} disabled={saving}>
              Discard changes
            </button>
          </div>
        </>
      )}
    </div>
  );
}
