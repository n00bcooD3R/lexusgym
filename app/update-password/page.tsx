"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets session from URL hash — wait for auth state
    const sb = createClient();
    const { data: { subscription } } = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) { setErr("Passwords don't match."); return; }
    if (pw.length < 6) { setErr("Password must be at least 6 characters."); return; }
    setErr(""); setLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setOk(true);
    setTimeout(() => router.push("/login"), 2500);
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
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "80px", height: "80px",
            borderRadius: "1.5rem",
            background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.3))",
            border: "1px solid rgba(139,92,246,0.4)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            marginBottom: "1rem",
            boxShadow: "0 0 40px rgba(139,92,246,0.3)",
            animation: "pulseGlow 3s ease-in-out infinite",
          }}>🔑</div>
          <h1 style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            margin: "0 0 0.25rem",
          }}>Set New Password</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Lexus Fitness Admin</p>
        </div>

        <div className="glass" style={{ padding: "2rem", boxShadow: "0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(139,92,246,0.1)" }}>
          {ok ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
              <p style={{ color: "#34d399", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.4rem" }}>Password updated!</p>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Redirecting to sign in…</p>
            </div>
          ) : !ready ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              <span className="spinner" style={{ marginRight: "0.5rem" }} />
              Verifying reset link…
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1.5rem", color: "var(--text)", textAlign: "center" }}>
                🔒 Choose New Password
              </h2>
              <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
                    New Password
                  </label>
                  <input
                    id="new-password"
                    className="input"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={pw}
                    onChange={e => setPw(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: "0.4rem", fontWeight: 500 }}>
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    className="input"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
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

                <button
                  id="update-password-submit"
                  className="btn btn-primary"
                  disabled={loading}
                  style={{ width: "100%", padding: "0.8rem", fontSize: "1rem", marginTop: "0.25rem" }}
                >
                  {loading ? (
                    <><span className="spinner" /> Updating…</>
                  ) : "🔐 Update Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
