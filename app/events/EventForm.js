"use client";
import { useState } from "react";
import { PAYMENT_METHODS, PRIVACY_NOTICE, PRIVACY_CONSENT } from "../../lib/registration";
import { EMAIL_RE } from "../../lib/events";

const EMPTY = { fullName: "", contactNumber: "", email: "", paymentMethod: "", referenceNumber: "" };

export default function EventForm({ event }) {
  const [v, setV] = useState(EMPTY);
  const [privacy, setPrivacy] = useState(false);
  const [proof, setProof] = useState(null);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));

  function problem() {
    if (!privacy) return "Please read and accept the privacy notice.";
    if (!v.fullName.trim() || !v.contactNumber.trim()) return "Please fill in your name and contact number.";
    if (!v.email.trim()) return "Please enter your email address.";
    if (!EMAIL_RE.test(v.email.trim())) return "That email address doesn't look right — please check it.";
    if (!v.paymentMethod) return "Please tell us which method you paid with.";
    if (!v.referenceNumber.trim()) return "Please enter your reference or transaction number.";
    if (!proof) return "Please attach a screenshot of your payment.";
    return "";
  }

  async function submit(e) {
    e.preventDefault();
    const p = problem();
    if (p) return setErr(p);
    setErr("");

    const fd = new FormData();
    fd.set("eventId", event.id);
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    fd.set("agreedPrivacy", "true");
    fd.set("proof", proof);

    setSending(true);
    let r;
    try {
      r = await fetch("/api/event-registrations", { method: "POST", body: fd }).then((res) => res.json());
    } catch {
      setSending(false);
      return setErr("Couldn't reach the server. Check your connection and try again.");
    }
    setSending(false);
    if (r.error) return setErr(r.error);
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="reg-done">
        <span className="reg-done-mark" aria-hidden="true">✓</span>
        <h3>You&apos;re on the list</h3>
        <p>
          Thanks, {v.fullName}. We&apos;ll verify your payment and confirm your spot for{" "}
          <strong>{event.name}</strong>. If anything looks off we&apos;ll reach you on{" "}
          {v.contactNumber}.
        </p>
        <a className="btn ghost pill" href="/events">See other events</a>
      </div>
    );
  }

  return (
    <form className="reg-form" onSubmit={submit} noValidate>
      <fieldset className="reg-block privacy">
        <legend>Data privacy notice &amp; consent <b>*</b></legend>
        {PRIVACY_NOTICE.map((para, i) => (
          <p className="reg-note" key={i}>{para}</p>
        ))}
        <label className="reg-check">
          <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
          <span>{PRIVACY_CONSENT}</span>
        </label>
      </fieldset>

      <fieldset className="reg-block">
        <legend>Who&apos;s coming</legend>
        <div className="reg-grid">
          <label className="reg-field">
            <span>Full name <b>*</b></span>
            <input type="text" value={v.fullName} onChange={set("fullName")} autoComplete="name" />
          </label>
          <label className="reg-field">
            <span>Contact number <b>*</b></span>
            <input type="tel" value={v.contactNumber} onChange={set("contactNumber")} autoComplete="tel" />
          </label>
          <label className="reg-field">
            <span>Email address <b>*</b></span>
            <input type="email" value={v.email} onChange={set("email")} autoComplete="email" inputMode="email" />
          </label>
        </div>
      </fieldset>

      <fieldset className="reg-block">
        <legend>Payment — {event.price}</legend>
        <p className="reg-note">
          Send {event.price} to either account below, then enter the reference number and attach
          your receipt. Your spot is held once we&apos;ve verified it.
        </p>
        <div className="reg-qrs">
          {PAYMENT_METHODS.map((m) => (
            <label key={m.id} className={"reg-qr" + (v.paymentMethod === m.id ? " on" : "")}>
              <input
                type="radio"
                name="paymentMethod"
                value={m.id}
                checked={v.paymentMethod === m.id}
                onChange={set("paymentMethod")}
              />
              <strong>{m.label}</strong>
              <img src={m.qr} alt={`${m.label} QR code`} />
              <small>{v.paymentMethod === m.id ? "✓ Paid with this" : "I paid with this"}</small>
            </label>
          ))}
        </div>
        <div className="reg-grid">
          <label className="reg-field">
            <span>Reference / transaction number <b>*</b></span>
            <input type="text" value={v.referenceNumber} onChange={set("referenceNumber")} />
          </label>
          <label className="reg-field">
            <span>Proof of payment <b>*</b></span>
            <input type="file" accept="image/*" onChange={(e) => setProof(e.target.files?.[0] || null)} />
            {proof && <small>Attached: {proof.name}</small>}
          </label>
        </div>
      </fieldset>

      {err && <div className="msg err">{err}</div>}

      <div className="reg-nav">
        <button className="btn gold pill" type="submit" disabled={sending}>
          {sending ? "Submitting…" : `Submit — ${event.price}`}
        </button>
      </div>
    </form>
  );
}
