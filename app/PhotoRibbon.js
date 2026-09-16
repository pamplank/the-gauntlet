// A full-bleed strip of photos that drifts sideways on its own. Server
// component — the motion is pure CSS, so there's no client JS here.
export default function PhotoRibbon({ photos }) {
  if (!photos || photos.length === 0) return null;

  // The keyframe translates by -50%, so the list has to be doubled for the
  // loop to be seamless. With very few photos, repeat until the strip is
  // wide enough that the seam never lands on screen.
  const reps = photos.length < 6 ? Math.ceil(6 / photos.length) : 1;
  const base = Array.from({ length: reps }, () => photos).flat();
  const loop = [...base, ...base];

  // The track is several thousand pixels wide, so lazy-loading every tile
  // means most are still unfetched when the animation carries them into view
  // and they pop in blank. The opening tiles are on screen immediately —
  // load those eagerly and leave the rest lazy so the page stays light.
  const EAGER = 5;

  return (
    <section className="ribbon-block" aria-label="Photos from The Gauntlet">
      <div className="ribbon-head">
        <p className="section-label">Inside The Gauntlet</p>
        <h2>36 people who didn&apos;t know each other</h2>
      </div>

      <div className="ribbon">
        <div className="ribbon-track">
          {loop.map((p, i) => (
            <figure className="ribbon-item" key={`${p.id}-${i}`}>
              <img
                src={p.url}
                alt={p.caption || ""}
                loading={i < EAGER ? "eager" : "lazy"}
                fetchPriority={i < EAGER ? "high" : "auto"}
                decoding="async"
                /* Hidden from assistive tech when it's decoration with no
                   caption — an empty alt on a repeated loop is the honest
                   description. */
                aria-hidden={p.caption ? undefined : "true"}
              />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
