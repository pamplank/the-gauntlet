"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Sections live on the homepage and are reached by scrolling; pages are
// separate routes. From another route an anchor has to carry "/" with it.
// "home" is the hero itself — observed like any other section so the Home tab
// lights up at the top of the page instead of About winning by default.
const SECTIONS = [
  ["home", "Home"],
  ["about", "About"],
  ["games", "Games"],
  ["venue", "Venue"],
];
const PAGES = [
  ["/now", "Now Playing"],
  ["/weeks", "Weeks"],
  ["/players", "Leaderboard"],
  ["/admin", "Admin"],
];

export default function Nav() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight whichever section is currently in view.
  useEffect(() => {
    if (!onHome) return;
    const els = SECTIONS.map(([id]) => document.getElementById(id)).filter(Boolean);
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [onHome]);

  function sectionHref(id) {
    if (id === "home") return onHome ? "#" : "/";
    return onHome ? `#${id}` : `/#${id}`;
  }

  function onSectionClick(e, id) {
    if (!onHome) return; // let the browser navigate to /#id
    e.preventDefault();

    // Home scrolls to the very top — scrolling the hero into view would stop
    // just under the sticky nav and leave a sliver of page above it.
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", "/");
      setActive("home");
      return;
    }

    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  }

  return (
    <header className={"top" + (scrolled ? " scrolled" : "")}>
      <a className="brand" href="/" aria-label="The Gauntlet — home">
        <img src="/logo.png" alt="The Gauntlet" />
      </a>
      <nav className="nav-links">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={sectionHref(id)}
            className={
              onHome && (active === id || (!active && id === "home")) ? "active" : ""
            }
            onClick={(e) => onSectionClick(e, id)}
          >
            {label}
          </a>
        ))}
        {PAGES.map(([href, label]) => (
          <a key={href} href={href} className={pathname === href ? "active" : ""}>
            {label}
          </a>
        ))}
      </nav>
      <a className="btn gold pill nav-cta" href="/book">
        Book Now <span aria-hidden="true">→</span>
      </a>
    </header>
  );
}
