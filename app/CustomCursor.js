"use client";
import { useEffect, useRef } from "react";

// The sword itself is a native CSS cursor (see globals.css) so it never lags.
// This adds the soft glow that eases along a frame behind it. Skipped on
// touch devices, where there's no pointer to trail.
export default function CustomCursor() {
  const glowRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let tx = -300, ty = -300, gx = -300, gy = -300, raf;

    function onMove(e) {
      tx = e.clientX;
      ty = e.clientY;
    }
    function loop() {
      gx += (tx - gx) * 0.14;
      gy += (ty - gy) * 0.14;
      if (glowRef.current) glowRef.current.style.transform = `translate(${gx}px, ${gy}px)`;
      raf = requestAnimationFrame(loop);
    }

    document.body.classList.add("custom-cursor-active");
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);

    return () => {
      document.body.classList.remove("custom-cursor-active");
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div className="cursor-glow" ref={glowRef} aria-hidden="true" />;
}
