"use client";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const tabs = [
    ["/", "Leaderboard"],
    ["/schedule", "Games & Schedule"],
    ["/admin", "Admin"],
  ];
  return (
    <header className="top">
      <div className="title">
        <h1>⚔ The Gauntlet</h1>
        <p>9 games · 4 combatants each · 9 rounds · fewer wounds, higher glory</p>
      </div>
      <nav className="tabs">
        {tabs.map(([href, label]) => (
          <a key={href} href={href} className={pathname === href ? "active" : ""}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  );
}
