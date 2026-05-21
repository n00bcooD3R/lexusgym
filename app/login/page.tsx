"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

type View = "login" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");

  // Login state
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [resetEmail, setResetEmail] = useState("");
  const [resetErr, setResetErr] = useState("");
  const [resetOk, setResetOk] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    router.push("/dashboard");
    router.refresh();
  }

  async function submitReset(e: React.FormEvent) {
    e.preventDefault();
    setResetErr(""); setResetLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setResetLoading(false);
    if (error) { setResetErr(error.message); return; }
    setResetOk(true);
  }

  function switchToForgot() {
    setResetEmail(email); // pre-fill email if typed
    setResetErr("");
    setResetOk(false);
    setView("forgot");
  }

  return (
    <div style={{
      minHeight: "80vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "100px", height: "100px",
            borderRadius: "1.5rem",
            background: "linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.2))",
            border: "1px solid rgba(139,92,246,0.3)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            boxShadow: "0 0 40px rgba(139,92,246,0.3)",
            animation: "pulseGlow 3s ease-in-out infinite",
            overflow: "hidden",
          }}>
            <img src="/logo.png" alt="Lexus Gym" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
          </div>
          <h1 style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0 0 0.25rem",
          }}>Lexus Fitness</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Admin Portal</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(139,92,246,0.1)" }}>

          {/* ── LOGIN VIEW ── */}
          {view === "login" && (
            <>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text)", textAlign: "center" }}>
                🔐 Sign In
              </h2>
              <form onSubmit={submitLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
                    Email Address
                  </label>
                  <input
                    id="login-email"
                    className="input"
                    type="email"
                    placeholder="admin@lexusfitness.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
                    Password
                  </label>
                  <input
                    id="login-password"
                    className="input"
                    type="password"
                    placeholder="••••••••"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    required
                  />
                </div>

                {/* Forgot password link */}
                <div style={{ textAlign: "right", marginTop: "-0.4rem" }}>
                  <button
                    type="button"
                    id="forgot-password-link"
                    onClick={switchToForgot}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.78rem",
                      color: "var(--accent)",
                      fontFamily: "inherit",
                      padding: 0,
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                      opacity: 0.85,
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "0.85")}
                  >
                    Forgot password?
                  </button>
                </div>

                {err && (
                  <div style={{
                    background: "rgba(244,63,94,0.1)",
                    border: "1px solid rgba(244,63,94,0.3)",
                    borderRadius: "0.5rem",
                    padding: "0.6rem 0.9rem",
                    color: "#fb7185",
                    fontSize: "0.85rem",
                  }}>
                    ⚠️ {err}
                  </div>
                )}

                <button id="login-submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "0.25rem", padding: "0.8rem", fontSize: "1rem" }}>
                  {loading ? (
                    <><span className="spinner" /> Signing in…</>
                  ) : "🚀 Sign In"}
                </button>
              </form>
            </>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === "forgot" && (
            <>
              <button
                type="button"
                onClick={() => setView("login")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontFamily: "inherit",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  marginBottom: "1rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                ← Back to sign in
              </button>

              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text)", textAlign: "center" }}>
                🔑 Reset Password
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                Enter your email — we&apos;ll send a reset link.
              </p>

              {resetOk ? (
                <div style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📬</div>
                  <p style={{ color: "#34d399", fontWeight: 600, marginBottom: "0.25rem" }}>Email sent!</p>
                  <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    Check <strong style={{ color: "var(--text)" }}>{resetEmail}</strong> for the reset link.
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setView("login")}
                    style={{ marginTop: "1rem", width: "100%", fontSize: "0.85rem" }}
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={submitReset} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
                      Email Address
                    </label>
                    <input
                      id="reset-email"
                      className="input"
                      type="email"
                      placeholder="admin@lexusfitness.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                    />
                  </div>

                  {resetErr && (
                    <div style={{
                      background: "rgba(244,63,94,0.1)",
                      border: "1px solid rgba(244,63,94,0.3)",
                      borderRadius: "0.5rem",
                      padding: "0.6rem 0.9rem",
                      color: "#fb7185",
                      fontSize: "0.85rem",
                    }}>
                      ⚠️ {resetErr}
                    </div>
                  )}

                  <button
                    id="reset-submit"
                    className="btn btn-primary"
                    disabled={resetLoading}
                    style={{ width: "100%", padding: "0.8rem", fontSize: "1rem" }}
                  >
                    {resetLoading ? (
                      <><span className="spinner" /> Sending…</>
                    ) : "📨 Send Reset Link"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
          Create admin via Supabase Dashboard → Auth → Users
        </p>
      </div>
    </div>
  );
}
