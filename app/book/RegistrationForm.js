"use client";
import { useState } from "react";
import {
  AGE_RANGES,
  GENDERS,
  JOINING_OPTIONS,
  HEARD_FROM_OPTIONS,
  PAYMENT_METHODS,
  CANCELLATION_TERMS,
  SAFETY_TERMS,
  PRIVACY_NOTICE,
  PRIVACY_CONSENT,
} from "../../lib/registration";
import { SOCIALS } from "../../lib/site";

// Same source as the footer, so the invite link only ever lives in one file.
const discord = SOCIALS.find((s) => s.label === "Discord" && s.url) || null;

const STEPS = ["Privacy", "About you", "Your play", "Payment"];

const EMPTY = {
  fullName: "",
  nickname: "",
  ageRange: "",
  gender: "",
  contactNumber: "",
  email: "",
  facebook: "",
  instagram: "",
  familiarity: "",
  joiningAs: "",
  heardFrom: "",
  heardFromOther: "",
  paymentMethod: "",
  referenceNumber: "",
};

export default function RegistrationForm({ weeks = [], price, priceOriginal }) {
  // Defaults to the soonest week with room; the picker only appears when
  // there's an actual choice to make.
  const [weekId, setWeekId] = useState(weeks[0]?.id || "");
  const week = weeks.find((w) => w.id === weekId) || weeks[0] || null;
  const [step, setStep] = useState(0);
  const [v, setV] = useState(EMPTY);
  const [privacy, setPrivacy] = useState(false);
  const [cancelChecks, setCancelChecks] = useState(CANCELLATION_TERMS.map(() => false));
  const [safetyChecks, setSafetyChecks] = useState(SAFETY_TERMS.map(() => false));
  const [proof, setProof] = useState(null);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const allCancel = cancelChecks.every(Boolean);
  const allSafety = safetyChecks.every(Boolean);

  function toggle(list, setList, i) {
    setList(list.map((c, idx) => (idx === i ? !c : c)));
  }

  // What has to be true before each step will let you move on.
  function validate(which) {
    if (which === 0 && !privacy) {
      return "Please read and accept the Data Privacy Notice before continuing.";
    }
    if (which === 1) {
      if (!v.fullName.trim() || !v.nickname.trim() || !v.contactNumber.trim()) {
        return "Please fill in your full name, nickname and contact number.";
      }
      if (!v.email.trim()) return "Please enter your email address.";
      // Deliberately loose: something@something.something. Anything stricter
      // rejects valid addresses, and only sending mail proves an address works.
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) {
        return "That email address doesn't look right — please check it.";
      }
      if (!v.ageRange || !v.gender) return "Please select your age range and gender.";
    }
    if (which === 3) {
      if (!v.paymentMethod) return "Please tell us which method you paid with.";
      if (!v.referenceNumber.trim()) return "Please enter your reference or transaction number.";
      if (!proof) return "Please attach a screenshot of your payment.";
      if (!allCancel) return "Please accept all three points of the cancellation and slot policy.";
      if (!allSafety) return "Please accept both points of the safety and venue waiver.";
    }
    return "";
  }

  function go(next) {
    const problem = validate(step);
    if (problem) {
      setErr(problem);
      return;
    }
    setErr("");
    setStep(next);
    document.getElementById("reg-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function submit(e) {
    e.preventDefault();
    for (let i = 0; i <= 3; i++) {
      const problem = validate(i);
      if (problem) {
        setErr(problem);
        setStep(i);
        return;
      }
    }

    const fd = new FormData();
    fd.set("weekId", week.id);
    Object.entries(v).forEach(([k, val]) => fd.set(k, val));
    fd.set("agreedCancellation", "true");
    fd.set("agreedSafety", "true");
    fd.set("agreedPrivacy", "true");
    fd.set("proof", proof);

    setSending(true);
    let r;
    try {
      r = await fetch("/api/registrations", { method: "POST", body: fd }).then((res) => res.json());
    } catch {
      setSending(false);
      setErr("Couldn't reach the server. Check your connection and try again.");
      return;
    }
    setSending(false);
    if (r.error) {
      setErr(r.error);
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <div className="reg-done">
        <span className="reg-done-mark" aria-hidden="true">✓</span>
        <h3>Registration received</h3>
        <p>
          Thanks, {v.nickname || v.fullName}. We'll verify your payment and add you to the roster
          for <strong>{week.label}</strong>. Your spot isn't final until that's confirmed — if
          anything looks off with the payment we'll reach you on {v.contactNumber}.
        </p>

        {discord && (
          <div className="reg-discord">
            <h4>One more thing — come say hi</h4>
            <p>
              Everyone playing hangs out on our Discord. Meet the people you&apos;ll be sat with,
              ask anything before the day, and find out the moment the next week opens.
            </p>
            <a
              className="btn gold pill"
              href={discord.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Join the Discord <span aria-hidden="true">→</span>
            </a>
          </div>
        )}

        <a className="btn ghost pill" href="/weeks">See the week</a>
      </div>
    );
  }

  const last = step === STEPS.length - 1;

  return (
    <form className="reg-form" onSubmit={submit} noValidate>
      <div id="reg-top" />

      {weeks.length > 1 && (
        <fieldset className="reg-block reg-weekpick">
          <legend>Which day are you coming? <b>*</b></legend>
          <div className="reg-choices">
            {weeks.map((w) => (
              <label key={w.id} className={"reg-chip wide" + (weekId === w.id ? " on" : "")}>
                <input
                  type="radio"
                  name="weekPick"
                  value={w.id}
                  checked={weekId === w.id}
                  onChange={() => setWeekId(w.id)}
                />
                <span>
                  <strong>{w.label}</strong>
                  <small>
                    {w.event_date ? `${w.event_date} · ` : ""}
                    {w.seatsLeft} left
                  </small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="reg-steps">
        {STEPS.map((name, i) => (
          <button
            type="button"
            key={name}
            className={"reg-step" + (i < step ? " done" : "") + (i === step ? " now" : "")}
            onClick={() => (i < step ? setStep(i) : go(i))}
          >
            <span className="reg-step-bar" />
            <span className="reg-step-name">{name}</span>
          </button>
        ))}
      </div>

      {/* ── 1 · Privacy ── */}
      {step === 0 && (
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
      )}

      {/* ── 2 · Basic information ── */}
      {step === 1 && (
        <fieldset className="reg-block">
          <legend>Basic information</legend>
          <div className="reg-grid">
            <label className="reg-field">
              <span>Full name <b>*</b></span>
              <input id="reg-fullname" type="text" value={v.fullName} onChange={set("fullName")} autoComplete="name" />
            </label>
            <label className="reg-field">
              <span>Nickname <b>*</b></span>
              <input id="reg-nickname" type="text" value={v.nickname} onChange={set("nickname")} />
              <small>This is the name that appears on the leaderboard.</small>
            </label>
          </div>

          <div className="reg-field">
            <span>Age range <b>*</b></span>
            <div className="reg-choices">
              {AGE_RANGES.map((a) => (
                <label key={a} className={"reg-chip" + (v.ageRange === a ? " on" : "")}>
                  <input type="radio" name="ageRange" value={a} checked={v.ageRange === a} onChange={set("ageRange")} />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="reg-field">
            <span>Gender <b>*</b></span>
            <div className="reg-choices">
              {GENDERS.map((g) => (
                <label key={g} className={"reg-chip" + (v.gender === g ? " on" : "")}>
                  <input type="radio" name="gender" value={g} checked={v.gender === g} onChange={set("gender")} />
                  {g}
                </label>
              ))}
            </div>
          </div>

          <div className="reg-grid">
            <label className="reg-field">
              <span>Contact number <b>*</b></span>
              <input id="reg-contact" type="tel" value={v.contactNumber} onChange={set("contactNumber")} autoComplete="tel" />
            </label>
            <label className="reg-field">
              <span>Email address <b>*</b></span>
              <input
                id="reg-email"
                type="email"
                value={v.email}
                onChange={set("email")}
                autoComplete="email"
                inputMode="email"
              />
              <small>Where we'll send your confirmation and event details.</small>
            </label>
            <label className="reg-field">
              <span>Facebook profile / handle</span>
              <input id="reg-fb" type="text" value={v.facebook} onChange={set("facebook")} />
            </label>
            <label className="reg-field">
              <span>Instagram handle</span>
              <input id="reg-ig" type="text" value={v.instagram} onChange={set("instagram")} />
            </label>
          </div>
        </fieldset>
      )}

      {/* ── 3 · Your play ── */}
      {step === 2 && (
        <fieldset className="reg-block">
          <legend>Your play</legend>

          <div className="reg-field">
            <span>How familiar are you with board games?</span>
            <div className="reg-scale">
              <small>Completely new</small>
              <div className="reg-scale-dots">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={"reg-dot" + (v.familiarity === String(n) ? " on" : "")}>
                    <input
                      type="radio"
                      name="familiarity"
                      value={n}
                      checked={v.familiarity === String(n)}
                      onChange={set("familiarity")}
                    />
                    {n}
                  </label>
                ))}
              </div>
              <small>One of my main hobbies</small>
            </div>
          </div>

          <div className="reg-field">
            <span>How are you joining The Gauntlet?</span>
            <div className="reg-choices">
              {JOINING_OPTIONS.map((j) => (
                <label key={j} className={"reg-chip" + (v.joiningAs === j ? " on" : "")}>
                  <input type="radio" name="joiningAs" value={j} checked={v.joiningAs === j} onChange={set("joiningAs")} />
                  {j}
                </label>
              ))}
            </div>
          </div>

          <div className="reg-field">
            <span>How did you hear about The Gauntlet?</span>
            <div className="reg-choices">
              {HEARD_FROM_OPTIONS.map((h) => (
                <label key={h} className={"reg-chip" + (v.heardFrom === h ? " on" : "")}>
                  <input type="radio" name="heardFrom" value={h} checked={v.heardFrom === h} onChange={set("heardFrom")} />
                  {h}
                </label>
              ))}
            </div>
            {v.heardFrom === "Other" && (
              <input
                id="reg-heard-other"
                type="text"
                placeholder="Tell us where"
                value={v.heardFromOther}
                onChange={set("heardFromOther")}
                style={{ marginTop: 10 }}
              />
            )}
          </div>
        </fieldset>
      )}

      {/* ── 4 · Payment + policies ── */}
      {step === 3 && (
        <>
          <fieldset className="reg-block">
            <legend>
              Payment —{" "}
              {priceOriginal ? (
                <s className="reg-was" aria-label={`was ${priceOriginal}`}>
                  {priceOriginal}
                </s>
              ) : null}{" "}
              {price}
            </legend>
            <p className="reg-note">
              Send the entry fee to either account below, then enter the reference number and
              attach your receipt. Your spot is held once we've verified it.
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
                  <span className="reg-qr-head">{m.label}</span>
                  <img src={m.qr} alt={`${m.label} QR code`} />
                  <span className="reg-qr-pick">
                    {v.paymentMethod === m.id ? "✓ Paid with this" : "I paid with this"}
                  </span>
                </label>
              ))}
            </div>

            <div className="reg-grid">
              <label className="reg-field">
                <span>Reference / transaction number <b>*</b></span>
                <input id="reg-ref" type="text" value={v.referenceNumber} onChange={set("referenceNumber")} />
              </label>
              <label className="reg-field">
                <span>Proof of payment <b>*</b></span>
                <input
                  id="reg-proof"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
                <small>{proof ? `Attached: ${proof.name}` : "A screenshot of your payment. Max 10 MB."}</small>
              </label>
            </div>
          </fieldset>

          <fieldset className="reg-block">
            <legend>Cancellation and slot policy <b>*</b></legend>
            {CANCELLATION_TERMS.map((t, i) => (
              <label key={i} className="reg-check">
                <input type="checkbox" checked={cancelChecks[i]} onChange={() => toggle(cancelChecks, setCancelChecks, i)} />
                <span>{t}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="reg-block">
            <legend>Safety and venue waiver <b>*</b></legend>
            {SAFETY_TERMS.map((t, i) => (
              <label key={i} className="reg-check">
                <input type="checkbox" checked={safetyChecks[i]} onChange={() => toggle(safetyChecks, setSafetyChecks, i)} />
                <span>{t}</span>
              </label>
            ))}
          </fieldset>
        </>
      )}

      {err && <div className="msg err">{err}</div>}

      <div className="reg-nav">
        <button
          type="button"
          className="btn ghost pill"
          onClick={() => go(step - 1)}
          disabled={step === 0}
        >
          Back
        </button>
        {last ? (
          <button className="btn gold pill" type="submit" disabled={sending}>
            {sending ? "Submitting…" : `Submit registration — ${price}`}
          </button>
        ) : (
          <button type="button" className="btn gold pill" onClick={() => go(step + 1)}>
            Continue <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </form>
  );
}
