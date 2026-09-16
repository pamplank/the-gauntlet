import Nav from "../Nav";
import SectionLabel from "../SectionLabel";
import Reveal from "../Reveal";
import HashScroll from "../HashScroll";
import {
  PRIVACY_NOTICE,
  PRIVACY_CONSENT,
  CANCELLATION_TERMS,
  SAFETY_TERMS,
} from "../../lib/registration";

export const metadata = {
  title: "Policies · The Gauntlet",
  description:
    "Data privacy, cancellation and slot policy, and the safety and venue waiver for The Gauntlet.",
};

export default function PoliciesPage() {
  return (
    <div className="wrap">
      <Nav />
      <HashScroll />

      <Reveal as="section" className="panel">
        <SectionLabel>The fine print</SectionLabel>
        <h2>Policies</h2>
        <p className="hint">
          The same terms you agree to when you register — here in full so you can read them
          before you decide to book.
        </p>

        <div className="policy" id="privacy">
          <h3>Data privacy notice &amp; consent</h3>
          {PRIVACY_NOTICE.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="policy-consent">{PRIVACY_CONSENT}</p>
        </div>

        <div className="policy" id="cancellation">
          <h3>Cancellation and slot policy</h3>
          <ul>
            {CANCELLATION_TERMS.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        <div className="policy" id="safety">
          <h3>Safety and venue waiver</h3>
          <ul>
            {SAFETY_TERMS.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>

        <p className="hint" style={{ marginTop: 34 }}>
          Questions about any of this? Ask before you pay — <a href="/book">booking</a> means
          agreeing to all three.
        </p>
      </Reveal>
    </div>
  );
}
