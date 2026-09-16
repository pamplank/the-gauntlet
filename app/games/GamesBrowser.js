"use client";
import { useState } from "react";
import { artFor, galleryFor, tintFor } from "../../lib/gameArt";

export default function GamesBrowser({ games }) {
  const [cur, setCur] = useState(0);
  const [shot, setShot] = useState(0);

  const game = games[cur];
  if (!game) return <div className="empty">No games configured yet.</div>;

  const cover = artFor(game.name);
  const gallery = galleryFor(game.name);
  // The cover is always the first image in the strip.
  const images = cover ? [cover, ...gallery] : gallery;
  const showing = images[shot] || cover;

  function pick(i) {
    setCur(i);
    setShot(0);
  }

  return (
    <div className="gx">
      <div className="gx-list" role="tablist" aria-label="The nine games">
        {games.map((g, i) => {
          const thumb = artFor(g.name);
          return (
            <button
              key={g.id}
              role="tab"
              aria-selected={i === cur}
              className={"gx-item" + (i === cur ? " on" : "")}
              onClick={() => pick(i)}
            >
              <span className="gx-thumb">
                {thumb ? <img src={thumb} alt="" loading="lazy" /> : <span className="gx-thumb-x">?</span>}
              </span>
              <span className="gx-name">{g.name}</span>
              {g.is_favorite && <span className="gx-star" title="Crowd favourite">★</span>}
            </button>
          );
        })}
      </div>

      <div className="gx-pane" key={game.id}>
        <div
          className="gx-wash"
          aria-hidden="true"
          style={{ background: `radial-gradient(75% 110% at 22% 0%, ${tintFor(game.name)}3d, transparent 72%)` }}
        />

        <div className="gx-art-col">
          <div className="gx-art">
            {showing ? (
              <img src={showing} alt={`${game.name} box art`} />
            ) : (
              <div className="gx-art-x">No art yet</div>
            )}
          </div>

          {images.length > 1 && (
            <div className="gx-shots">
              {images.map((src, i) => (
                <button
                  key={src}
                  className={"gx-shot" + (i === shot ? " on" : "")}
                  onClick={() => setShot(i)}
                  aria-label={`View image ${i + 1} of ${images.length}`}
                >
                  <img src={src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="gx-copy">
          <span className="gx-idx">Game {String(cur + 1).padStart(2, "0")}</span>
          <h3>{game.name}</h3>
          {game.is_favorite && <span className="fav-badge">★ Crowd Favourite</span>}
          {game.description ? (
            game.description
              .split(/\n{2,}/)
              .map((para, i) => <p key={i}>{para}</p>)
          ) : (
            <p className="muted">Description coming soon.</p>
          )}
        </div>
      </div>
    </div>
  );
}
