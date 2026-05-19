"use client";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import SettingsLoader from "@/components/SettingsLoader";
import { motion, AnimatePresence } from "framer-motion";

const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: Math.random() * 2.5 + 0.5,
  dur: Math.random() * 4 + 2,
  delay: Math.random() * 5,
  bright: Math.random() * 0.6 + 0.3,
}));

const FLOAT_ICONS = [
  { icon: "🏋️", dur: 18, delay: 0, left: 8, fs: "2rem", op: 0.1 },
  { icon: "💪", dur: 22, delay: 3, left: 20, fs: "1.5rem", op: 0.08 },
  { icon: "⭐", dur: 16, delay: 1, left: 35, fs: "1.2rem", op: 0.12 },
  { icon: "🌟", dur: 25, delay: 6, left: 50, fs: "1.8rem", op: 0.09 },
  { icon: "🪐", dur: 20, delay: 2, left: 65, fs: "2rem", op: 0.08 },
  { icon: "✨", dur: 14, delay: 4, left: 78, fs: "1.3rem", op: 0.14 },
  { icon: "🌙", dur: 28, delay: 8, left: 88, fs: "1.5rem", op: 0.07 },
  { icon: "🔥", dur: 19, delay: 5, left: 12, fs: "1.4rem", op: 0.09 },
  { icon: "💎", dur: 23, delay: 7, left: 55, fs: "1.2rem", op: 0.1 },
  { icon: "🚀", dur: 17, delay: 9, left: 40, fs: "1.6rem", op: 0.08 },
];

const NAV_LINKS = [
  { href: "/dashboard", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z", label: "Dashboard" },
  { href: "/members", icon: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", label: "Members" },
  { href: "/members/new", icon: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z", label: "Add" },
  { href: "/pt", icon: "M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1l-5.2 2.2v4.7h2v-3.4l1.8-.7-1.6 8.1-4.9-1-.4 2 7 1.4z", label: "PT" },
  { href: "/settings", icon: "M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z", label: "Settings" },
];

function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("gym-theme");
    const isDark = saved ? saved === "dark" : true;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("gym-theme", next ? "dark" : "light");
  }, [dark]);

  return (
    <button
      onClick={toggle}
      className="theme-icon-btn"
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
      id="theme-toggle-btn"
    >
      {dark ? (
        <span className="theme-icon-inner" title="Light mode">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </span>
      ) : (
        <span className="theme-icon-inner" title="Dark mode">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </span>
      )}
    </button>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={`nav-item ${active ? "nav-item-active" : ""}`} id={`nav-${label.toLowerCase()}`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: active ? 1 : 0.7 }}>
        <path d={icon} />
      </svg>
      <span>{label}</span>
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en" data-theme="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Lexus Fitness Group</title>
        <meta name="description" content="Premium gym management for Lexus Fitness Group" />
      </head>
      <body>
        <SettingsLoader />

        {/* Stars */}
        <div className="stars-layer" aria-hidden="true">
          {STARS.map(s => (
            <span key={s.id} style={{
              top: `${s.top}%`, left: `${s.left}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              ["--dur" as any]: `${s.dur}s`,
              ["--delay" as any]: `${s.delay}s`,
              ["--bright" as any]: s.bright,
            }} />
          ))}
        </div>

        {/* Floating Icons */}
        <div className="float-icons" aria-hidden="true">
          {FLOAT_ICONS.map((f, i) => (
            <div key={i} className="float-icon" style={{
              left: `${f.left}%`,
              ["--dur" as any]: `${f.dur}s`,
              ["--delay" as any]: `${f.delay}s`,
              ["--fs" as any]: f.fs,
              ["--op" as any]: f.op,
              animationDelay: `${f.delay}s`,
            }}>{f.icon}</div>
          ))}
        </div>

        {/* Planets */}
        <div className="planet planet-1" aria-hidden="true" />
        <div className="planet planet-2" aria-hidden="true" />

        {/* Desktop Header */}
        <header className="app-header hidden sm:block" id="main-header">
          <div className="container-responsive flex items-center justify-between py-3">
            <Link href={isLoginPage ? "/login" : "/dashboard"} id="logo-link" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 800, fontSize: "1.2rem", textDecoration: "none" }}>
              <span style={{ background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LEXUS</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="url(#gymgrad)" style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.7))" }}>
                <defs><linearGradient id="gymgrad"><stop offset="0%" stopColor="#a78bfa"/><stop offset="100%" stopColor="#67e8f9"/></linearGradient></defs>
                <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z" fill="url(#gymgrad)"/>
              </svg>
              <span style={{ background: "linear-gradient(135deg, #67e8f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GYM</span>
            </Link>
            {!isLoginPage && (
              <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                {NAV_LINKS.map(n => (
                  <Link key={n.href} href={n.href} id={`desk-nav-${n.label.toLowerCase()}`} style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "0.625rem",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    textDecoration: "none",
                    transition: "all 0.2s",
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    color: pathname.startsWith(n.href) ? "var(--accent)" : "var(--text-muted)",
                    background: pathname.startsWith(n.href) ? "rgba(139,92,246,0.15)" : "transparent",
                    border: pathname.startsWith(n.href) ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent",
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.8 }}><path d={n.icon} /></svg>{n.label}
                  </Link>
                ))}
                <form action="/api/auth/signout" method="post" style={{ display: "inline" }}>
                  <button id="logout-btn" className="btn btn-ghost" style={{ padding: "0.4rem 0.85rem", fontSize: "0.875rem", minHeight: 36 }}>
                    🚪 Logout
                  </button>
                </form>
              </nav>
            )}
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile Header */}
        <header className="app-header sm:hidden" id="mobile-header">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 1rem" }}>
            <Link href={isLoginPage ? "/login" : "/dashboard"} id="mobile-logo" style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontWeight: 800, fontSize: "0.95rem", textDecoration: "none" }}>
              <span style={{ background: "linear-gradient(135deg, #a78bfa, #67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LEXUS</span>
              <span style={{ fontSize: "1.2rem" }}>🏋️</span>
              <span style={{ background: "linear-gradient(135deg, #67e8f9, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>GYM</span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {!isLoginPage && (
                <form action="/api/auth/signout" method="post">
                  <button id="mobile-logout-btn" className="btn btn-ghost" style={{ padding: "0.3rem 0.7rem", fontSize: "0.75rem", minHeight: 32 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
                  </button>
                </form>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Main */}
        <main style={{ maxWidth: "72rem", margin: "0 auto", padding: "1rem", paddingBottom: "6rem", position: "relative", zIndex: 1 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{ width: "100%", maxWidth: "100%" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Nav - hidden on login */}
        {!isLoginPage && (
          <nav className="nav-mobile sm:hidden" id="bottom-nav">
            {NAV_LINKS.map(n => (
              <NavLink key={n.href} href={n.href} icon={n.icon} label={n.label} active={pathname.startsWith(n.href)} />
            ))}
          </nav>
        )}
      </body>
    </html>
  );
}