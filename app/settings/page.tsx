"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

const SETTINGS_KEYS: Record<string, string> = {
  gym_name: "Gym Name", gym_tagline: "Tagline", gym_address: "Address",
  gym_phone: "Phone", gym_email: "Email", gym_gst: "GST Number",
  msg_welcome: "Welcome Message", msg_renewal: "Renewal Message",
  msg_reminder: "Reminder Message (Before Expiry)",
  msg_expired: "Expired Message", msg_payment: "Payment Confirmation Message"
};

const PLACEHOLDERS: Record<string, string> = {
  msg_welcome: "{name} · {gym_name}",
  msg_renewal: "{name} · {gym_name}",
  msg_reminder: "{name} · {days} · {gym_name}",
  msg_expired: "{name} · {gym_name}",
  msg_payment: "{name} · {amount} · {expiry} · {gym_name}"
};

const DEFAULT_SETTINGS: Record<string, string> = {
  gym_name: "Lexus Fitness Group",
  gym_tagline: "Fitness Center & Personal Training",
  gym_address: "123 Fitness Street, City - 123456",
  gym_phone: "+91 9876543210",
  gym_email: "info@lexusfitness.com",
  gym_gst: "27AAABCU9603R1ZM",
  msg_welcome: "Hello {name}, 👋\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today. Whether your goal is muscle building, fat loss, strength improvement, endurance, or overall fitness, our team is here to support and guide you every step of the way.\n\nAt {gym_name}, we believe that consistency, discipline, and dedication create real transformation. With our professional training environment, modern equipment, and motivating atmosphere, you now have everything you need to become the strongest version of yourself.\n\nRemember:\n✅ Every workout brings progress\n✅ Every drop of sweat is an investment in yourself\n✅ Small daily efforts create big results over time\n\nWe encourage you to stay committed to your training schedule, maintain proper nutrition, and never give up on your goals. Results take time, but with patience and consistency, success is guaranteed.\n\nIf you need any assistance regarding workouts, diet guidance, membership support, or gym facilities, feel free to contact our team anytime. We are always happy to help.\n\nThank you once again for trusting {gym_name} with your fitness journey.\n\nLet’s train hard, stay focused, and achieve greatness together! 🔥🏋️\n\n— Team {gym_name}",
  msg_renewal: "Hello {name},\n\nYour {gym_name} membership has been renewed! 💪🔥\n\n— Team {gym_name}",
  msg_reminder: "Hello {name},\n\nYour {gym_name} membership expires in {days} days. 💪\nPlease renew soon!\n\n— Team {gym_name}",
  msg_expired: "Hello {name},\n\nYour {gym_name} membership has expired. 😔\nPlease renew to continue.\n\n— Team {gym_name}",
  msg_payment: "Hello {name},\n\nThank you for ₹{amount}! 💪\nMembership active until {expiry}.\n\n— Team {gym_name}"
};

const GYM_KEYS = ["gym_name", "gym_tagline", "gym_address", "gym_phone", "gym_email", "gym_gst"];
const MSG_KEYS = ["msg_welcome", "msg_renewal", "msg_reminder", "msg_expired", "msg_payment"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sb = createClient();
        const { data } = await sb.from("settings").select("key, value");
        if (data && data.length > 0) {
          const obj: Record<string, string> = {};
          data.forEach((s: any) => { obj[s.key] = s.value || ""; });
          setSettings({ ...DEFAULT_SETTINGS, ...obj });
        }
      } catch { /* use defaults */ }
      setLoading(false);
    }
    load();
  }, []);

  async function saveAll() {
    setSaving(true);
    const sb = createClient();
    for (const [key, value] of Object.entries(settings)) {
      await sb.from("settings").upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    }
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const upd = (k: string, v: string) => setSettings(s => ({ ...s, [k]: v }));

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem", color: "var(--text-muted)" }}>
      <span className="spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px", borderTopColor: "var(--accent)" }} />
      Loading settings…
    </div>
  );

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          ⚙️ Settings
        </h1>
        <button id="save-settings-btn" onClick={saveAll} className={`btn ${saved ? "btn-success" : "btn-primary"}`} disabled={saving} style={{ fontSize: "0.95rem", padding: "0.6rem 1.2rem" }}>
          {saving ? <><span className="spinner" /> Saving…</> : saved ? "✅ Saved!" : "💾 Save All"}
        </button>
      </div>

      {/* Gym Details */}
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          🏢 <span>Gym Details</span>
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.85rem" }}>
          {GYM_KEYS.map(key => (
            <label key={key} style={{ display: "block" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
                {SETTINGS_KEYS[key]}
              </span>
              <input
                id={`setting-${key}`}
                className="input"
                style={{ fontSize: "0.95rem", padding: "0.55rem 0.75rem", minHeight: "40px" }}
                value={settings[key] || ""}
                onChange={e => upd(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      {/* Message Templates */}
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          💬 <span>Message Templates</span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {MSG_KEYS.map(key => (
            <div key={key}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{SETTINGS_KEYS[key]}</span>
                {PLACEHOLDERS[key] && (
                  <span style={{ fontSize: "0.7rem", color: "var(--accent2)", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.2)", borderRadius: "0.375rem", padding: "0.1rem 0.4rem" }}>
                    {PLACEHOLDERS[key]}
                  </span>
                )}
              </label>
              <textarea
                id={`setting-${key}`}
                className="input"
                rows={5}
                style={{ fontFamily: "monospace", fontSize: "0.82rem", resize: "vertical" }}
                value={settings[key] || ""}
                onChange={e => upd(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}