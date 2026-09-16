"use client";
import { useEffect, useRef } from "react";

// Fades + lifts its children in once they scroll into view. Works fine
// wrapping server-rendered content (Reveal itself is the only client part;
// its children are ordinary props).
export default function Reveal({ children, className = "", delay = 0, as: As = "div", id }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <As
      ref={ref}
      id={id}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </As>
  );
}
