"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const FEATURES = [
  { icon: "👥", title: "Member Management", desc: "Track all members, fees, and membership status in one place." },
  { icon: "💬", title: "WhatsApp Alerts", desc: "Auto-send renewal reminders and receipts via WhatsApp." },
  { icon: "📊", title: "Live Dashboard", desc: "Real-time stats — overdue, expiring soon, active members." },
  { icon: "🏃", title: "PT Tracking", desc: "Manage personal training sessions and PT-only members." },
  { icon: "🧾", title: "PDF Receipts", desc: "Auto-generate and send payment receipts instantly." },
  { icon: "⚙️", title: "Custom Settings", desc: "Personalise gym name, messages, and billing details." },
];

const STATS = [
  { value: "∞", label: "Members" },
  { value: "Free", label: "WhatsApp msgs/mo*" },
  { value: "24/7", label: "Auto Reminders" },
  { value: "1", label: "Click Receipts" },
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflowX: "hidden" }}>

      {/* ── HERO ── */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem 1rem",
        position: "relative",
      }}>

        {/* Logo badge */}
        <div style={{
          width: "100px", height: "100px",
          borderRadius: "2rem",
          background: "linear-gradient(135deg, rgba(139,92,246,0.35), rgba(6,182,212,0.35))",
          border: "1px solid rgba(139,92,246,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "3.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 0 60px rgba(139,92,246,0.4), 0 0 120px rgba(139,92,246,0.15)",
          animation: "pulseGlow 3s ease-in-out infinite",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.6s",
        }}>🏋️</div>

        {/* Brand name */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.6rem",
          marginBottom: "0.5rem",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s 0.1s",
        }}>
          <span style={{
            fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
            fontWeight: 900,
            background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>LEXUS</span>
          <span style={{ fontSize: "clamp(2.5rem, 8vw, 4rem)" }}>🏋️</span>
          <span style={{
            fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
            fontWeight: 900,
            background: "linear-gradient(135deg, #67e8f9, #a78bfa)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>GYM</span>
        </div>

        {/* Tagline */}
        <p style={{
          fontSize: "clamp(1rem, 3vw, 1.35rem)",
          color: "var(--text-muted)",
          maxWidth: "520px",
          lineHeight: 1.6,
          marginBottom: "2.5rem",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s 0.2s",
        }}>
          Premium gym management — members, fees, WhatsApp reminders, and receipts. All in one galaxy-class dashboard.
        </p>

        {/* CTA buttons */}
        <div style={{
          display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center",
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.7s 0.3s",
        }}>
          <Link href="/login" id="hero-login-btn" className="btn btn-primary" style={{
            padding: "0.9rem 2.5rem",
            fontSize: "1.05rem",
            fontWeight: 700,
            borderRadius: "1rem",
            boxShadow: "0 0 30px rgba(139,92,246,0.5), 0 8px 30px rgba(139,92,246,0.3)",
            letterSpacing: "0.02em",
          }}>
            🚀 Admin Login
          </Link>
          <a href="#features" className="btn btn-ghost" style={{
            padding: "0.9rem 2rem",
            fontSize: "1.05rem",
            fontWeight: 600,
            borderRadius: "1rem",
          }}>
            Explore Features ↓
          </a>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          animation: "bounce 2s ease-in-out infinite",
          opacity: 0.6,
        }}>
          scroll
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        padding: "4rem 1rem",
        maxWidth: "72rem",
        margin: "0 auto",
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
        }}>
          {STATS.map((s, i) => (
            <div key={i} className="glass" style={{
              padding: "1.75rem 1rem",
              textAlign: "center",
              borderRadius: "1.25rem",
              transition: "transform 0.3s, box-shadow 0.3s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(139,92,246,0.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}
            >
              <div style={{
                fontSize: "2.25rem",
                fontWeight: 900,
                background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "0.4rem",
              }}>{s.value}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "0.75rem", opacity: 0.6 }}>
          *1,000 free messages/month with Meta WhatsApp Cloud API
        </p>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "4rem 1rem 6rem", maxWidth: "72rem", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{
            fontSize: "clamp(1.75rem, 5vw, 2.75rem)",
            fontWeight: 800,
            background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.75rem",
          }}>Everything You Need</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "480px", margin: "0 auto", lineHeight: 1.6 }}>
            Built for gym owners who want results, not complexity.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.25rem",
        }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="glass" style={{
              padding: "1.75rem",
              borderRadius: "1.25rem",
              transition: "transform 0.3s, border-color 0.3s, box-shadow 0.3s",
              cursor: "default",
            }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-6px)";
                el.style.borderColor = "rgba(139,92,246,0.4)";
                el.style.boxShadow = "0 16px 40px rgba(139,92,246,0.2)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "";
                el.style.borderColor = "";
                el.style.boxShadow = "";
              }}
            >
              <div style={{
                width: "52px", height: "52px",
                borderRadius: "1rem",
                background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))",
                border: "1px solid rgba(139,92,246,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.75rem",
                marginBottom: "1rem",
              }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "0.5rem", color: "var(--text)" }}>
                {f.title}
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", lineHeight: 1.6, margin: 0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section style={{
        padding: "5rem 1rem",
        textAlign: "center",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <h2 style={{
          fontSize: "clamp(1.75rem, 5vw, 3rem)",
          fontWeight: 800,
          background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "1rem",
        }}>Ready to Manage Smarter?</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "1rem" }}>
          Log in to your admin panel and take control.
        </p>
        <Link href="/login" id="bottom-login-btn" className="btn btn-primary" style={{
          padding: "1rem 3rem",
          fontSize: "1.1rem",
          fontWeight: 700,
          borderRadius: "1rem",
          boxShadow: "0 0 40px rgba(139,92,246,0.5)",
        }}>
          🔐 Go to Admin Login
        </Link>

        <p style={{ marginTop: "3rem", color: "var(--text-muted)", fontSize: "0.75rem", opacity: 0.5 }}>
          © {new Date().getFullYear()} Lexus Gym. All rights reserved.
        </p>
      </section>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </div>
  );
}
