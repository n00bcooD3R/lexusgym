import { useState, useEffect } from "react";
import { supabase, apiFetch } from "../lib/supabase";
import { Icon } from "../components/Icons";
import { setGymDetails } from "../lib/pdf-bill";

const SETTINGS_KEYS: Record<string, string> = {
  gym_name: "Gym Name", gym_tagline: "Tagline", gym_address: "Address",
  gym_phone: "Phone", gym_email: "Email", gym_gst: "GST Number",
  wa_bridge_url: "WhatsApp Bridge URL",
  owner_wa_number: "Owner WhatsApp Notification Number",
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
  wa_bridge_url: "http://140.245.215.154:3001",
  owner_wa_number: "",
  msg_welcome: "Hello {name}, 👋\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today. Whether your goal is muscle building, fat loss, strength improvement, endurance, or overall fitness, our team is here to support and guide you every step of the way.\n\nAt {gym_name}, we believe that consistency, discipline, and dedication create real transformation. With our professional training environment, modern equipment, and motivating atmosphere, you now have everything you need to become the strongest version of yourself.\n\nRemember:\n✅ Every workout brings progress\n✅ Every drop of sweat is an investment in yourself\n✅ Small daily efforts create big results over time\n\nWe encourage you to stay committed to your training schedule, maintain proper nutrition, and never give up on your goals. Results take time, but with patience and consistency, success is guaranteed.\n\nIf you need any assistance regarding workouts, diet guidance, membership support, or gym facilities, feel free to contact our team anytime. We are always happy to help.\n\nThank you once again for trusting {gym_name} with your fitness journey.\n\nLet’s train hard, stay focused, and achieve greatness together! 🔥🏋️\n\n— Team {gym_name}",
  msg_renewal: "Hello {name},\n\nYour {gym_name} membership has been renewed! 💪🔥\n\n— Team {gym_name}",
  msg_reminder: "Hello {name},\n\nYour {gym_name} membership expires in {days} days. 💪\nPlease renew soon!\n\n— Team {gym_name}",
  msg_expired: "Hello {name},\n\nYour {gym_name} membership has expired. 😔\nPlease renew to continue.\n\n— Team {gym_name}",
  msg_payment: "Hello {name},\n\nThank you for ₹{amount}! 💪\nMembership active until {expiry}.\n\n— Team {gym_name}"
};

const GYM_KEYS = ["gym_name", "gym_tagline", "gym_address", "gym_phone", "gym_email", "gym_gst", "wa_bridge_url", "owner_wa_number"];
const MSG_KEYS = ["msg_welcome", "msg_renewal", "msg_reminder", "msg_expired", "msg_payment"];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"gym" | "messages" | "qr" | "staff">("gym");

  const [waStatus, setWaStatus] = useState<string>("checking");
  const [waProvider, setWaProvider] = useState<string>("");
  const [qrCodeBase64, setQrCodeBase64] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string>("");

  async function fetchWaStatus() {
    setWaStatus("checking");
    try {
      const res = await apiFetch("/api/wa/status");
      if (res.ok) {
        const data = await res.json();
        setWaProvider(data.provider || "");
        if (data.ok) {
          const status = data.status || "close";
          setWaStatus(status);
          if (status === "close" && data.provider === "evolution") {
            fetchQrCode();
          }
        } else {
          setWaStatus("error");
          setQrError(data.error || "Status check failed");
        }
      } else {
        setWaStatus("error");
        setQrError("Failed to fetch WhatsApp status");
      }
    } catch (e: any) {
      console.error(e);
      setWaStatus("error");
      setQrError(e.message || "Connection error checking status");
    }
  }

  async function fetchQrCode() {
    setLoadingQr(true);
    setQrError("");
    setQrCodeBase64("");
    try {
      const res = await apiFetch("/api/wa/qr");
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.base64) {
          setQrCodeBase64(data.base64);
        } else {
          setQrError(data.error || "Failed to fetch QR code from server");
        }
      } else {
        setQrError("Server error fetching QR code");
      }
    } catch (e: any) {
      setQrError(e.message || "An error occurred fetching QR code");
    } finally {
      setLoadingQr(false);
    }
  }

  useEffect(() => {
    if (tab === "qr") {
      fetchWaStatus();
    }
  }, [tab]);

  const TABS = [
    { id: "gym", label: "Gym Details", icon: "settings" },
    { id: "messages", label: "Messages", icon: "mail" },
    { id: "qr", label: "WhatsApp QR", icon: "eye" },
    { id: "staff", label: "Staff List", icon: "user" },
  ];

  // Staff list state
  const [staff, setStaff] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Load staff function
  async function loadStaff() {
    try {
      const { data } = await supabase.from("members").select("id, name, phone, admission_no, is_staff").eq("is_staff", true).order("name");
      setStaff(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  // Load staff on tab switch to staff
  useEffect(() => {
    if (tab === "staff") {
      loadStaff();
    }
  }, [tab]);

  // Search members to add to staff
  async function searchMember(q: string) {
    setSearchQuery(q);
    if (q.length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await apiFetch(`/api/members/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setSearchResults(data.filter((m: any) => !m.is_staff));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error("Staff Search client error:", err);
      setSearchResults([]);
    }
    setSearching(false);
  }

  // Add staff
  async function addStaff(m: any) {
    try {
      const { error } = await supabase.from("members").update({ is_staff: true }).eq("id", m.id);
      if (error) {
        alert("Error adding staff: " + error.message);
      } else {
        setSearchQuery("");
        setSearchResults([]);
        loadStaff();
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Remove staff
  async function removeStaff(id: string) {
    try {
      const { error } = await supabase.from("members").update({ is_staff: false }).eq("id", id);
      if (error) {
        alert("Error removing staff: " + error.message);
      } else {
        loadStaff();
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/settings/list");
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          const cleanData = { ...data };
          delete cleanData.detail;
          setSettings({ ...DEFAULT_SETTINGS, ...cleanData });
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function saveAll() {
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings");
      }
      setGymDetails(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(err.message || "An error occurred while saving settings.");
    } finally {
      setSaving(false);
    }
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
          Settings
        </h1>
        <button id="save-settings-btn" onClick={saveAll} className={`btn ${saved ? "btn-success" : "btn-primary"}`} disabled={saving} style={{ fontSize: "0.95rem", padding: "0.6rem 1.2rem" }}>
          {saving ? <><span className="spinner" /> Saving…</> : saved ? <><Icon name="check" size={18} /> Saved!</> : <><Icon name="download" size={18} /> Save All</>}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`tab ${tab === t.id ? "tab-active" : "tab-idle"}`} style={{ fontSize: "1rem", padding: "0.6rem 1rem" }}>
            <Icon name={t.icon as any} size={18} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "gym" && (
        <div className="glass" style={{ padding: "1.25rem" }}>
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
      )}

      {tab === "messages" && (
        <div className="glass" style={{ padding: "1.25rem" }}>
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
                  style={{ fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical" }}
                  value={settings[key] || ""}
                  onChange={e => upd(key, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "qr" && (
        <div className="glass" style={{ padding: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", margin: 0 }}>WhatsApp Integration</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0.25rem 0 0 0" }}>
                Active Provider: <strong style={{ color: "var(--accent)" }}>{waProvider || "detecting..."}</strong>
              </p>
            </div>
            <button 
              onClick={fetchWaStatus} 
              className="btn btn-ghost" 
              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem", minHeight: "38px" }}
              disabled={waStatus === "checking"}
            >
              {waStatus === "checking" ? (
                <><span className="spinner" style={{ width: "0.85rem", height: "0.85rem", marginRight: "0.5rem" }} /> Checking Status...</>
              ) : (
                <><span style={{ marginRight: "0.5rem", display: "inline-flex" }}><Icon name="activity" size={16} /></span> Refresh Status</>
              )}
            </button>
          </div>

          {/* Status Indicator */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            background: waStatus === "open" ? "rgba(16,185,129,0.1)" : waStatus === "close" ? "rgba(245,158,11,0.1)" : waStatus === "checking" ? "rgba(255,255,255,0.03)" : "rgba(244,63,94,0.1)",
            border: `1px solid ${waStatus === "open" ? "rgba(16,185,129,0.25)" : waStatus === "close" ? "rgba(245,158,11,0.25)" : waStatus === "checking" ? "rgba(255,255,255,0.08)" : "rgba(244,63,94,0.25)"}`,
          }}>
            <div style={{
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              background: waStatus === "open" ? "rgba(16,185,129,0.2)" : waStatus === "close" ? "rgba(245,158,11,0.2)" : waStatus === "checking" ? "rgba(255,255,255,0.05)" : "rgba(244,63,94,0.2)",
              color: waStatus === "open" ? "#10b981" : waStatus === "close" ? "#f59e0b" : waStatus === "checking" ? "var(--text-muted)" : "#f43f5e"
            }}>
              {waStatus === "open" ? "✓" : waStatus === "close" ? "⚠️" : waStatus === "checking" ? "⏳" : "✕"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: waStatus === "open" ? "#34d399" : waStatus === "close" ? "#fbbf24" : waStatus === "checking" ? "var(--text)" : "#f87171" }}>
                {waStatus === "open" ? "WhatsApp Connected" : waStatus === "close" ? "WhatsApp Disconnected" : waStatus === "checking" ? "Checking connection status..." : "Connection Error"}
              </div>
              <div style={{ fontSize: "0.825rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                {waStatus === "open" && "The system is successfully connected to WhatsApp. Ready to send messages, payment receipts, and templates."}
                {waStatus === "close" && "The system is disconnected. Please scan the QR code below using your mobile app to link and reactivate the service."}
                {waStatus === "checking" && "Inquiring status from the WhatsApp provider server. Please hold on..."}
                {waStatus === "error" && (qrError || "Could not reach the WhatsApp server. Please check the network connectivity or credentials.")}
              </div>
            </div>
          </div>

          {/* QR Code display section */}
          {waStatus === "close" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginTop: "1rem" }}>
              <div style={{
                position: "relative",
                width: "280px",
                height: "280px",
                borderRadius: "1rem",
                overflow: "hidden",
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "4px solid var(--border)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
              }}>
                {loadingQr ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", color: "#333" }}>
                    <span className="spinner" style={{ width: "2rem", height: "2rem", borderTopColor: "var(--accent)" }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Fetching QR Code...</span>
                  </div>
                ) : qrCodeBase64 ? (
                  <img
                    src={qrCodeBase64}
                    style={{ width: "100%", height: "100%", objectFit: "contain", padding: "1rem" }}
                    alt="WhatsApp Connection QR"
                  />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1.5rem", color: "#333", textAlign: "center" }}>
                    <span style={{ fontSize: "2rem" }}>⚠️</span>
                    <span style={{ fontSize: "0.85rem", marginTop: "0.5rem", color: "var(--danger)" }}>{qrError || "Failed to load QR code"}</span>
                    <button onClick={fetchQrCode} className="btn btn-primary" style={{ marginTop: "1rem", minHeight: "36px", padding: "0.4rem 1rem", fontSize: "0.8rem" }}>
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              <div style={{ maxWidth: "420px", textAlign: "center" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text)" }}>Connection Instructions</h4>
                <ol style={{ textAlign: "left", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: "1.6", margin: "0 auto", paddingLeft: "1.25rem" }}>
                  <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                  <li>Tap <strong>Menu</strong> (on Android) or <strong>Settings</strong> (on iPhone).</li>
                  <li>Select <strong>Linked Devices</strong> and tap <strong>Link a Device</strong>.</li>
                  <li>Point your phone camera to this screen and scan the QR code above.</li>
                  <li>Once paired, wait a moment and tap <strong>Refresh Status</strong> to verify.</li>
                </ol>
              </div>
            </div>
          )}

          {waStatus === "open" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "2rem 0", color: "var(--text-muted)", textAlign: "center" }}>
              <div style={{ fontSize: "3rem" }}>✨</div>
              <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text)", margin: 0 }}>All Set!</h4>
              <p style={{ fontSize: "0.85rem", maxWidth: "320px", margin: 0 }}>
                Your WhatsApp integration is operational. If you need to switch accounts, log out from Linked Devices on your phone first.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "staff" && (
        <div className="glass" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.5rem" }}>Manage Gym Staff</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Staff members are gym workers who have unlimited access and do not require fee tracking. They are hidden from the overdue and due-soon lists.
            </p>
          </div>

          {/* Add Staff Search */}
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
              Search Member to Add as Staff
            </span>
            <input
              type="text"
              className="input"
              placeholder="Type member name..."
              value={searchQuery}
              onChange={e => searchMember(e.target.value)}
              style={{ fontSize: "0.95rem" }}
            />
            {searching && (
              <span className="spinner" style={{ position: "absolute", right: "0.75rem", bottom: "0.6rem", width: "1.2rem", height: "1.2rem" }} />
            )}
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "var(--bg2)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                zIndex: 10,
                maxHeight: "180px",
                overflowY: "auto",
                marginTop: "0.25rem"
              }}>
                {searchResults.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => addStaff(m)}
                    style={{
                      padding: "0.6rem 0.85rem",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.15s"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{m.name} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({m.phone})</span></span>
                    <span style={{ fontSize: "0.75rem", color: "var(--accent)" }}>Add to Staff +</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Staff List */}
          <div style={{ marginTop: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>
              Current Staff Members ({staff.length})
            </span>
            <div style={{ border: "1px solid var(--border)", borderRadius: "0.5rem", overflow: "hidden" }}>
              {staff.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No staff members added yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {staff.map((s: any, idx: number) => (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.6rem 0.85rem",
                        fontSize: "0.9rem",
                        borderBottom: idx < staff.length - 1 ? "1px solid var(--border)" : "none",
                        background: "var(--surface)"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>#{s.admission_no} · {s.phone}</div>
                      </div>
                      <button
                        onClick={() => removeStaff(s.id)}
                        className="btn btn-danger"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", minHeight: "auto", width: "auto" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      </div>
  );
}
