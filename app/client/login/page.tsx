"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import "../../globals.css";

export default function ClientLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/pt/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = await res.json();
      if (j.ok) {
        router.push(`/client/${j.token}`);
      } else {
        setError(j.error || "Login failed");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "1.5rem", fontFamily: "Outfit,sans-serif",
    }}>
      {/* Galaxy background blobs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 20% 10%,rgba(139,92,246,0.18) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(6,182,212,0.12) 0%,transparent 60%)" }} />

      <div style={{ width: "100%", maxWidth: "400px", position: "relative", zIndex: 1 }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>💪</div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: "0 0 0.25rem" }}>
            Lexus Fitness
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>Client Portal — Sign in to your fitness plan</p>
        </div>

        {/* Card */}
        <form onSubmit={login} style={{
          background: "var(--surface)", backdropFilter: "blur(16px)", border: "1px solid var(--border)",
          borderRadius: "1.25rem", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem",
          boxShadow: "0 0 40px rgba(139,92,246,0.15)"
        }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Username
            </label>
            <input
              id="client-username"
              className="input"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
              style={{ fontSize: "1rem" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              Password
            </label>
            <input
              id="client-password"
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ fontSize: "1rem" }}
            />
          </div>

          {error && (
            <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "0.6rem", padding: "0.65rem 1rem", color: "#fb7185", fontSize: "0.875rem" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            id="client-login-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: "0.25rem", fontSize: "1rem" }}
          >
            {loading ? <><span className="spinner" /> Signing in…</> : "🔓 Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
          Contact your trainer if you don't have login details.
        </p>
      </div>
    </div>
  );
}
