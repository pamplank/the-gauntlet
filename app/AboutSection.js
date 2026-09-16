"use client";
import { useState } from "react";
import { EXPECT, EXPECT_KICKER } from "../lib/expect";
import { FAQS, FAQ_GROUPS } from "../lib/faqs";

export default function AboutSection() {
  // Questions are filtered to one group at a time — ten collapsed rows at once
  // reads as a chore. Open tracks the question text, not an index, so it stays
  // correct when the visible set changes.
  const [group, setGroup] = useState(FAQ_GROUPS[0]);
  const [open, setOpen] = useState(FAQS[0].q);
  const shown = FAQS.filter((f) => f.group === group);

  return (
    <>
      <div className="expect-grid">
        {EXPECT.map((e, i) => (
          <div className="expect-cell" key={e.t}>
            <span className="expect-n">{String(i + 1).padStart(2, "0")}</span>
            <h3>{e.t}</h3>
            <p>{e.d}</p>
          </div>
        ))}
      </div>

      <p className="expect-kicker">{EXPECT_KICKER}</p>

      <h3 className="faq-title">Frequently asked</h3>
      <div className="faq">
        <div className="faq-rail">
          {FAQ_GROUPS.map((g) => (
            <button
              key={g}
              className={"faq-tab" + (g === group ? " on" : "")}
              aria-pressed={g === group}
              onClick={() => {
                setGroup(g);
                setOpen(FAQS.find((f) => f.group === g).q);
              }}
            >
              <span>{g}</span>
              <span className="faq-count">{FAQS.filter((f) => f.group === g).length}</span>
            </button>
          ))}
        </div>

        <div className="faq-list">
          {shown.map((f) => (
            <div className={"faq-item" + (open === f.q ? " open" : "")} key={f.q}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === f.q ? null : f.q)}
                aria-expanded={open === f.q}
              >
                <span>{f.q}</span>
                <span className="faq-sign" aria-hidden="true" />
              </button>
              <div className="faq-a">
                <p>
                  {f.lead ? <strong>{f.lead} </strong> : null}
                  {f.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
