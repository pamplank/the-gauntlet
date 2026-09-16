"use client";
import { useEffect } from "react";

// The browser jumps to #hash before webfonts have swapped in. Once NeueBit
// replaces the fallback, every heading changes height, the document grows and
// the target has drifted — on /policies it overshot by ~114px and landed
// pinned to the bottom of the page. Re-apply the scroll once layout settles.
export default function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let cancelled = false;
    const settle = () => {
      if (cancelled) return;
      const el = document.getElementById(id);
      // scrollIntoView honours the element's scroll-margin-top, so the sticky
      // nav offset stays defined in one place (the CSS) rather than here.
      if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
    };

    const fonts = document.fonts?.ready ?? Promise.resolve();
    fonts.then(() => requestAnimationFrame(settle));

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
