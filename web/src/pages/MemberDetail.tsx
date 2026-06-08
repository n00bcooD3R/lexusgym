import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase, apiFetch } from "../lib/supabase";
import { feeStatus, formatDate } from "../lib/fees";
import { generateInvoice, setGymDetails } from "../lib/pdf-bill";
import { Icon } from "../components/Icons";

const PLANS = [
  { id: "flex",      label: "Flex Plan",      months: 1,  days: 30,  fee: 1000,  color: "#06b6d4", glow: "rgba(6,182,212,0.35)" },
  { id: "power",     label: "Power Plan",     months: 3,  days: 90,  fee: 2700,  color: "#8b5cf6", glow: "rgba(139,92,246,0.35)" },
  { id: "transform", label: "Transform Plan", months: 6,  days: 180, fee: 5400,  color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  { id: "prime",     label: "Prime Plan",     months: 12, days: 365, fee: 9999,  color: "#10b981", glow: "rgba(16,185,129,0.35)" },
];

const addDays = (dateStr: string, days: number) => {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const addMonths = (dateStr: string, months: number) => {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [diets, setDiets] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [partner, setPartner] = useState<any>(null);

  const [tab, setTab] = useState<"info" | "payments" | "workouts" | "diets" | "messages" | "portal">("info");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load member data
  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      // Fetch member
      const { data: m, error: mErr } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
      if (mErr || !m) {
        console.error("Member not found", mErr);
        navigate("/members");
        return;
      }
      setMember(m);

      // Fetch related info
      const [
        { data: payData },
        { data: workData },
        { data: dietData },
        { data: msgData }
      ] = await Promise.all([
        supabase.from("payments").select("*").eq("member_id", id).order("paid_on", { ascending: false }),
        supabase.from("workouts").select("*").eq("member_id", id).order("created_at", { ascending: true }),
        supabase.from("diets").select("*").eq("member_id", id).order("created_at", { ascending: true }),
        supabase.from("wa_messages").select("*").eq("member_id", id).order("sent_at", { ascending: false }).limit(10)
      ]);

      setPayments(payData || []);
      setWorkouts(workData || []);
      setDiets(dietData || []);
      setMessages(msgData || []);

      // Partner
      if (m.couple_partner_id) {
        const { data: pData } = await supabase
          .from("members")
          .select("id, name, admission_no, phone, fee_amount, fee_cycle_days")
          .eq("id", m.couple_partner_id)
          .maybeSingle();
        setPartner(pData);
      } else {
        setPartner(null);
      }
    } catch (err) {
      console.error("Failed to load member detail data:", err);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading || !member) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem", color: "var(--text-muted)" }}>
        <span className="spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px", borderTopColor: "var(--accent)" }} />
        Loading member profile…
      </div>
    );
  }

  const status = feeStatus(member.next_due_date, undefined, member.is_staff);
  const statusBadgeClass = status === "overdue" ? "badge-overdue" : status === "due-soon" ? "badge-duesoon" : status === "ok" ? "badge-ok" : status === "staff" ? "badge-staff" : "";
  const statusDot = status === "overdue" ? "🔴" : status === "due-soon" ? "🟡" : status === "ok" ? "🟢" : status === "staff" ? "💜" : "";
  const statusLabel = status === "overdue" ? "OVERDUE" : status === "due-soon" ? "DUE SOON" : status === "ok" ? "PAID" : status === "staff" ? "STAFF / WORKER" : "NO FEE";

  function getDaysLeft() {
    if (!member.next_due_date) return null;
    return Math.ceil((new Date(member.next_due_date).getTime() - Date.now()) / 86400000);
  }

  async function sendReminder() {
    const daysLeft = getDaysLeft();
    let template = "Hello {name},\n\nYour {gym_name} membership expires in {days} days. 💪\nPlease renew soon!\n\n— Team {gym_name}";
    let gymName = "Lexus Fitness Group";
    
    try {
      const resSettings = await apiFetch("/api/settings/list");
      const settings = await resSettings.json();
      if (settings.msg_reminder) template = settings.msg_reminder;
      if (settings.gym_name) gymName = settings.gym_name;
    } catch (err) {
      console.error("Failed to load settings:", err);
    }

    const body = template
      .replace(/{name}/g, member.name)
      .replace(/{gym_name}/g, gymName)
      .replace(/{days}/g, String(daysLeft ?? 30));

    const res = await apiFetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: member.id, body }) });
    const j = await res.json();
    if (j.simulated) {
      alert(`📱 WhatsApp DEMO\n\nTo: ${member.phone}\n${body.substring(0, 100)}...`);
    } else {
      alert(j.ok ? "✓ WhatsApp sent!" : "Failed: " + (j.error || ""));
    }
    loadData();
  }

  const TABS = [
    { id: "info", label: "Info", icon: "info" },
    { id: "payments", label: "Payments", icon: "creditCard" },
    ...(member.is_pt_client ? [
      { id: "workouts", label: "Workouts", icon: "dumbbell" },
      { id: "diets", label: "Diet", icon: "activity" },
      { id: "portal", label: "Portal Access", icon: "user" },
    ] : []),
    { id: "messages", label: "Messages", icon: "mail" },
  ];

  if (isEditing) {
    return (
      <EditFormView
        member={member}
        onCancel={() => setIsEditing(false)}
        onSaved={() => {
          setIsEditing(false);
          loadData();
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Profile Card */}
      <div className="glass" style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
        {member.photo_url
          ? <img src={member.photo_url} alt={member.name} style={{ width: "5.5rem", height: "5.5rem", borderRadius: "50%", objectFit: "cover", border: "3px solid var(--accent)", boxShadow: "0 0 20px rgba(139,92,246,0.4)" }} />
          : <div style={{ width: "5.5rem", height: "5.5rem", borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent2))", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "2.2rem", border: "3px solid var(--border)", flexShrink: 0, boxShadow: "0 0 20px rgba(139,92,246,0.4)" }}>
            {member.name.charAt(0).toUpperCase()}
          </div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text)" }}>{member.name}</h1>
            <span 
              className={`badge ${statusBadgeClass}`} 
              style={{ 
                fontSize: "0.85rem", 
                padding: "0.3rem 0.65rem",
                ...(status === "staff" ? { background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)" } : {})
              }}
            >
              {statusDot} {statusLabel}
            </span>
            {member.is_pt_client && <span className="badge badge-pt" style={{ fontSize: "0.85rem" }}>PT Client</span>}
            {member.couple_partner_id && (
              <Link
                to={`/members/${member.couple_partner_id}`}
                style={{ fontSize: "0.78rem", fontWeight: 700, background: "rgba(244,63,94,0.15)", color: "#f43f5e", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "9999px", padding: "0.2rem 0.65rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
              >
                💑 {member.is_couple_main ? "Couple · Main" : "Couple · Partner"}
                {partner && <span style={{ fontWeight: 400, opacity: 0.8 }}>· {partner.name}</span>}
              </Link>
            )}
          </div>
          <div style={{ fontSize: "1rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            #{member.admission_no} · {member.phone}
          </div>
          <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            {member.is_staff 
              ? "Staff / Employee (Unlimited Access)" 
              : `Next due: ${member.next_due_date ? formatDate(member.next_due_date) : "—"} · ₹${member.fee_amount}`}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {!member.is_staff && <button id="send-reminder-btn" onClick={sendReminder} className="btn btn-cyan"><Icon name="send" size={18} /> Reminder</button>}
          <button onClick={() => setIsEditing(true)} className="btn btn-ghost" id="edit-member-btn"><Icon name="edit" size={18} /> Edit</button>
          <button id="delete-member-btn" onClick={() => setShowDelete(true)} className="btn btn-danger" style={{ fontSize: "0.85rem", padding: "0.4rem" }}><Icon name="trash" size={18} /> Delete</button>
          {showDelete && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", maxWidth: "400px", textAlign: "center" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>Delete Member?</h3>
                <p style={{ marginBottom: "1.5rem", color: "#64748b" }}>This will permanently delete {member.name} and all their records.</p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                  <button className="btn btn-ghost" style={{ color: "#64748b" }} onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</button>
                  <button className="btn btn-danger" onClick={async () => {
                    setDeleting(true);
                    const res = await apiFetch("/api/members/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id }) });
                    const j = await res.json();
                    if (!j.ok) { alert("Delete failed: " + j.error); setDeleting(false); return; }
                    navigate("/members");
                  }} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-scroll">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`tab ${tab === t.id ? "tab-active" : "tab-idle"}`} id={`detail-tab-${t.id}`} style={{ fontSize: "1rem", padding: "0.6rem 1rem" }}>
            <Icon name={t.icon as any} size={18} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab m={member} onReload={loadData} />}
      {tab === "payments" && <PaymentsTab m={member} payments={payments} partner={partner} onReload={loadData} />}
      {tab === "workouts" && <WorkoutsTab m={member} workouts={workouts} onReload={loadData} />}
      {tab === "diets" && <DietsTab m={member} diets={diets} onReload={loadData} />}
      {tab === "portal" && <PortalTab m={member} />}
      {tab === "messages" && <MessagesTab messages={messages} />}
    </div>
  );
}

function InfoTab({ m, onReload }: { m: any; onReload: () => void }) {
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const showUpgradeMsg = (text: string, ok: boolean) => {
    setUpgradeMsg({ text, ok });
    setTimeout(() => setUpgradeMsg(null), 3500);
  };

  async function doUpgrade(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPw) { showUpgradeMsg("Passwords do not match", false); return; }
    if (password.length < 6) { showUpgradeMsg("Password must be at least 6 characters", false); return; }
    if (username.trim().length < 3) { showUpgradeMsg("Username must be at least 3 characters", false); return; }
    setUpgrading(true);
    try {
      // 1. Mark as PT client
      const { error: upErr } = await supabase.from("members").update({ is_pt_client: true }).eq("id", m.id);
      if (upErr) { showUpgradeMsg("Failed to upgrade: " + upErr.message, false); setUpgrading(false); return; }

      // 2. Set credentials
      const res = await apiFetch("/api/pt/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: m.id, username, password }),
      });
      const j = await res.json();
      if (!j.ok) { showUpgradeMsg(j.error || "Credential save failed", false); setUpgrading(false); return; }

      showUpgradeMsg("✓ Upgraded to PT client! Reloading…", true);
      setTimeout(() => onReload(), 1200);
    } catch (err: any) {
      showUpgradeMsg(err.message, false);
    }
    setUpgrading(false);
  }

  const rows = [
    ["Address", m.address], ["Age", m.age], ["Gender", m.gender],
    ["Weight (kg)", m.weight], ["Height (cm)", m.height],
    ["Join Date", m.join_date], ["Fee Amount", `₹${m.fee_amount}`],
    ["Fee Cycle", `${m.fee_cycle_days} days`],
    ["Last Payment", m.last_payment_date], ["Next Due", m.next_due_date],
    ["Notes", m.notes],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass" style={{ padding: "1.5rem" }}>
        <div className="member-info-grid">
        {rows.map(([k, v]) => (
          <div key={k as string} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
            <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.4rem" }}>{k}</div>
            <div style={{ fontSize: "1.15rem", color: "var(--text)", fontWeight: 600 }}>{v || "—"}</div>
          </div>
        ))}
        </div>
      </div>

      {/* Upgrade to PT — only shown for non-PT members */}
      {!m.is_pt_client && (
        <div className="glass" style={{ padding: "1.25rem" }}>
          {!showUpgrade ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>⬆️ Upgrade to PT Client</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Enable workout plan, diet plan & client portal access</div>
              </div>
              <button
                id="upgrade-to-pt-btn"
                onClick={() => setShowUpgrade(true)}
                className="btn btn-primary"
                style={{ fontSize: "0.875rem", padding: "0.55rem 1.25rem", minHeight: 38 }}
              >
                💪 Upgrade to PT
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>💪 Setup PT Client Portal</div>
                <button onClick={() => setShowUpgrade(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: "0.6rem", padding: "0.65rem 0.85rem" }}>
                This will mark <strong style={{ color: "var(--text)" }}>{m.name}</strong> as a PT client and create their portal login credentials.
              </div>

              <form onSubmit={doUpgrade} style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Username</label>
                  <input
                    id="upgrade-username"
                    className="input"
                    type="text"
                    placeholder={`e.g. ${m.phone || "john.doe"}`}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    style={{ fontSize: "0.95rem" }}
                  />
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Tip: use phone number for easy recall</div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="upgrade-password"
                      className="input"
                      type={showPw ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      style={{ fontSize: "0.95rem", paddingRight: "3rem" }}
                    />
                    <button type="button" onClick={() => setShowPw(p => !p)}
                      style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--text-muted)" }}>
                      {showPw ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Confirm Password</label>
                  <input
                    id="upgrade-confirm-pw"
                    className="input"
                    type={showPw ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    required
                    style={{ fontSize: "0.95rem", borderColor: confirmPw && password !== confirmPw ? "var(--danger)" : undefined }}
                  />
                  {confirmPw && password !== confirmPw && <div style={{ fontSize: "0.72rem", color: "var(--danger)", marginTop: "0.2rem" }}>Passwords do not match</div>}
                </div>

                {upgradeMsg && (
                  <div style={{ background: upgradeMsg.ok ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)", border: `1px solid ${upgradeMsg.ok ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`, borderRadius: "0.5rem", padding: "0.6rem 0.85rem", fontSize: "0.875rem", color: upgradeMsg.ok ? "#34d399" : "#fb7185" }}>
                    {upgradeMsg.text}
                  </div>
                )}

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button id="confirm-upgrade-btn" type="submit" className="btn btn-primary" disabled={upgrading} style={{ fontSize: "0.9rem", padding: "0.6rem 1.25rem", minHeight: 40 }}>
                    {upgrading ? <><span className="spinner" /> Upgrading…</> : "💪 Confirm Upgrade"}
                  </button>
                  <button type="button" onClick={() => setShowUpgrade(false)} className="btn btn-ghost" style={{ fontSize: "0.9rem", padding: "0.6rem 1rem", minHeight: 40 }}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentsTab({ m, payments, partner, onReload }: { m: any; payments: any[]; partner: any; onReload: () => void }) {
  const matchedPlan = PLANS.find(p => p.days === m.fee_cycle_days && p.fee === m.fee_amount);
  const [selectedPlan, setSelectedPlan] = useState(matchedPlan ? matchedPlan.id : "manual");

  const [amount, setAmount] = useState(String(m.fee_amount));
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendWA, setSendWA] = useState(true);
  const [cardio, setCardio] = useState(false);
  const [syncPartner, setSyncPartner] = useState(true);
  const [extraCharges, setExtraCharges] = useState({ trainer: 0, diet: 0, admission: 0 });
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));

  const [expiringDate, setExpiringDate] = useState(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return addDays(todayStr, m.fee_cycle_days || 30);
  });

  const [filterMonth, setFilterMonth] = useState("");

  const filteredPayments = filterMonth ? payments.filter((p: any) => p.paid_on?.startsWith(filterMonth)) : payments;

  function handlePlanSelect(planId: string) {
    setSelectedPlan(planId);
    if (planId !== "manual") {
      const p = PLANS.find(x => x.id === planId);
      if (p) {
        setAmount(String(p.fee));
        setExpiringDate(addDays(paymentDate, p.days));
      }
    }
  }

  function handlePaymentDateChange(newDate: string) {
    setPaymentDate(newDate);
    if (selectedPlan !== "manual") {
      const p = PLANS.find(x => x.id === selectedPlan);
      if (p) {
        setExpiringDate(addDays(newDate, p.days));
      }
    }
  }

  function handleDurationSelect(months: number) {
    setSelectedPlan("manual");
    setExpiringDate(addMonths(paymentDate, months));
  }

  async function clearAllPayments() {
    const confirmDelete = confirm("⚠️ WARNING: This will permanently delete ALL recorded payments for this member and reset their payment status to overdue. Are you sure you want to proceed?");
    if (!confirmDelete) return;
    
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from("payments").delete().eq("member_id", m.id);
      if (deleteError) {
        alert("Error deleting payments: " + deleteError.message);
        setBusy(false);
        return;
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${year}-${month}-${day}`;
      
      const { error: updateError } = await supabase.from("members").update({
        last_payment_date: null,
        next_due_date: yesterdayStr
      }).eq("id", m.id);
      
      if (updateError) {
        alert("Error resetting member status: " + updateError.message);
        setBusy(false);
        return;
      }
      
      alert("All payments removed successfully. Member status is now Overdue.");
      onReload();
    } catch (err: any) {
      alert("Error: " + (err.message || "Unknown error"));
    }
    setBusy(false);
  }

  async function deletePayment(id: string) {
    if (!confirm("Delete this payment?")) return;
    await supabase.from("payments").delete().eq("id", id);
    onReload();
  }

  async function updateDate(id: string, d: string) {
    await supabase.from("payments").update({ paid_on: d }).eq("id", id);
    onReload();
  }

  async function record() {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const total = Number(amount) + extraCharges.trainer + extraCharges.diet + extraCharges.admission;
      const finalNotes = notes ? (cardio ? `${notes} + Cardio` : notes) : (cardio ? "Cardio" : "");
      
      const { data: payment, error } = await supabase.from("payments").insert({ 
        member_id: m.id, 
        amount: total, 
        method, 
        notes: finalNotes, 
        paid_on: paymentDate 
      }).select().single();
      
      if (error) {
        alert("Error saving payment: " + error.message);
        setBusy(false);
        return;
      }
      
      await supabase.from("members").update({ 
        last_payment_date: paymentDate,
        next_due_date: expiringDate
      }).eq("id", m.id);
      
      if (sendWA && payment) {
        let gymName = "Lexus Fitness Group";
        let msgTemplate = "Hello {name},\n\nThank you for ₹{amount}! 💪\nMembership active until {expiry}.\n\n— Team {gym_name}";
        try {
          const resSettings = await apiFetch("/api/settings/list");
          const settingsData = await resSettings.json();
          if (settingsData.gym_name) gymName = settingsData.gym_name;
          if (settingsData.msg_payment) msgTemplate = settingsData.msg_payment;
          setGymDetails(settingsData);
        } catch { /* use defaults */ }

        const doc = generateInvoice(m, { ...payment, paid_on: paymentDate }, { trainerCharges: extraCharges.trainer, dietCharges: extraCharges.diet, admissionFee: extraCharges.admission });
        const pdfBlob = doc.output("blob");
        
        const expiryDateObj = new Date(expiringDate);
        const expiry = expiryDateObj.toLocaleDateString("en-IN");
        const paymentMethodStr = method === "upi" ? "UPI/QR" : method === "card" ? "Card" : method === "bank" ? "Bank Transfer" : "Cash";

        const msg = msgTemplate
          .replace(/{name}/g, m.name)
          .replace(/{gym_name}/g, gymName)
          .replace(/{amount}/g, String(total))
          .replace(/{expiry}/g, expiry)
          .replace(/{method}/g, paymentMethodStr);

        const fd = new FormData();
        fd.append("memberId", m.id); fd.append("body", msg);
        fd.append("document", pdfBlob, `Invoice_${m.admission_no}.pdf`);
        await apiFetch("/api/wa/send", { method: "POST", body: fd });
      }
      
      if (m.is_couple_main && m.couple_partner_id && syncPartner && partner) {
        const partnerFee = partner.fee_amount || m.fee_amount;
        
        await supabase.from("payments").insert({
          member_id: m.couple_partner_id,
          amount: partnerFee,
          method,
          notes: `[Couple Pack] Synced from ${m.name}'s payment` + (cardio ? " + Cardio" : ""),
          paid_on: paymentDate,
        });
        await supabase.from("members").update({
          last_payment_date: paymentDate,
          next_due_date: expiringDate,
        }).eq("id", m.couple_partner_id);
      }

      alert("Payment recorded successfully!");
      setCardio(false);
      setNotes("");
      onReload();
    } catch (err: any) {
      alert("Error: " + (err.message || "Unknown error"));
    }
    setBusy(false);
  }

  async function previewInvoice() {
    try {
      const resSettings = await apiFetch("/api/settings/list");
      const settingsData = await resSettings.json();
      setGymDetails(settingsData);
    } catch (e) {
      console.error("Preview settings fetch error", e);
    }
    const finalNotes = notes ? (cardio ? `${notes} + Cardio` : notes) : (cardio ? "Cardio" : "");
    const doc = generateInvoice(m, { id: "preview", paid_on: paymentDate, amount: Number(amount) + extraCharges.trainer + extraCharges.diet + extraCharges.admission, method, notes: finalNotes }, { trainerCharges: extraCharges.trainer, dietCharges: extraCharges.diet, admissionFee: extraCharges.admission });
    doc.save(`Invoice_${m.admission_no}_preview.pdf`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>Record Payment</h3>

        {/* ── Membership Plan Picker ── */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.5rem" }}>Membership Plan</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.5rem" }}>
            {PLANS.map(p => {
              const selected = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`pay-plan-${p.id}`}
                  onClick={() => handlePlanSelect(p.id)}
                  style={{
                    border: `2px solid ${selected ? p.color : "var(--border)"}`,
                    borderRadius: "0.65rem",
                    padding: "0.6rem 0.75rem",
                    background: selected ? `rgba(${p.glow.slice(5,-1)},0.1)` : "var(--surface)",
                    boxShadow: selected ? `0 0 12px ${p.glow}` : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.months === 1 ? "1 Month" : `${p.months} Months`}
                  </span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: selected ? p.color : "var(--text)" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: selected ? p.color : "var(--text-muted)" }}>
                    ₹{p.fee.toLocaleString("en-IN")}
                  </span>
                </button>
              );
            })}

            <button
              key="manual"
              type="button"
              id="pay-plan-manual"
              onClick={() => handlePlanSelect("manual")}
              style={{
                border: `2px solid ${selectedPlan === "manual" ? "var(--accent, #a78bfa)" : "var(--border)"}`,
                borderRadius: "0.65rem",
                padding: "0.6rem 0.75rem",
                background: selectedPlan === "manual" ? "rgba(167,139,250,0.1)" : "var(--surface)",
                boxShadow: selectedPlan === "manual" ? "0 0 12px rgba(167,139,250,0.3)" : "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.18s ease",
                display: "flex",
                flexDirection: "column",
                gap: "0.15rem",
              }}
            >
              <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--accent, #a78bfa)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Custom
              </span>
              <span style={{ fontSize: "0.85rem", fontWeight: 800, color: selectedPlan === "manual" ? "var(--accent, #a78bfa)" : "var(--text)" }}>
                Manual Fees
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Custom Amount
              </span>
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.7rem", marginBottom: "0.8rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Payment Date</label>
            <input id="pay-date" className="input" type="date" value={paymentDate} onChange={e => handlePaymentDateChange(e.target.value)} style={{ fontSize: "0.9rem", width: "100%" }} />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Expiring Date</label>
            <input id="pay-expiry-date" className="input" type="date" value={expiringDate} onChange={e => setExpiringDate(e.target.value)} style={{ fontSize: "0.9rem", width: "100%" }} />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Amount (₹)</label>
            <input id="pay-amount" className="input" type="number" placeholder="Fee" value={amount} onChange={e => { setAmount(e.target.value); setSelectedPlan("manual"); }} style={{ fontSize: "0.9rem", width: "100%" }} />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Method</label>
            <select id="pay-method" className="input" value={method} onChange={e => setMethod(e.target.value)} style={{ fontSize: "0.9rem", width: "100%" }}>
              <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Quick Expiration Presets */}
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Quick Expiry Preset:</div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {[
              { label: "1 Month", val: 1 },
              { label: "2 Months", val: 2 },
              { label: "3 Months", val: 3 },
              { label: "6 Months", val: 6 },
              { label: "12 Months", val: 12 },
            ].map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handleDurationSelect(preset.val)}
                className="btn btn-ghost"
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  minHeight: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: "0.4rem"
                }}
              >
                +{preset.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "0.8rem" }}>
          <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.25rem" }}>Payment Notes</label>
          <input id="pay-notes" className="input" placeholder="Notes (e.g. May dues)" value={notes} onChange={e => setNotes(e.target.value)} style={{ fontSize: "0.9rem", width: "100%" }} />
        </div>

        <div className="charges-grid">
          <input id="pay-trainer" className="input" type="number" placeholder="Trainer" value={extraCharges.trainer || ""} onChange={e => setExtraCharges(x => ({ ...x, trainer: Number(e.target.value) || 0 }))} style={{ fontSize: "0.9rem" }} />
          <input id="pay-diet" className="input" type="number" placeholder="Diet" value={extraCharges.diet || ""} onChange={e => setExtraCharges(x => ({ ...x, diet: Number(e.target.value) || 0 }))} style={{ fontSize: "0.9rem" }} />
          <input id="pay-admission" className="input" type="number" placeholder="Admission" value={extraCharges.admission || ""} onChange={e => setExtraCharges(x => ({ ...x, admission: Number(e.target.value) || 0 }))} style={{ fontSize: "0.9rem" }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", marginTop: "0.7rem", cursor: "pointer" }}>
          <input id="pay-has-cardio" type="checkbox" checked={cardio} onChange={e => setCardio(e.target.checked)} />
          🏃 Cardio Included
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", marginTop: "0.4rem", cursor: "pointer" }}>
          <input id="pay-send-wa" type="checkbox" checked={sendWA} onChange={e => setSendWA(e.target.checked)} />
          Send WhatsApp
        </label>
        {m.is_couple_main && m.couple_partner_id && partner && (
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", marginTop: "0.4rem", cursor: "pointer", color: "#f43f5e" }}>
            <input id="pay-sync-partner" type="checkbox" checked={syncPartner} onChange={e => setSyncPartner(e.target.checked)} />
            💑 Also record payment for partner ({partner.name} · ₹{partner.fee_amount})
          </label>
        )}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem", flexWrap: "wrap", width: "100%" }}>
          <button id="pay-record-btn" onClick={record} className="btn btn-primary" disabled={busy} style={{ fontSize: "0.9rem", padding: "0.6rem 1rem" }}>
            {busy ? <><span className="spinner" /> Saving…</> : <><Icon name="check" size={16} /> Record</>}
          </button>
          <button id="pay-preview-btn" onClick={previewInvoice} className="btn btn-ghost" style={{ fontSize: "0.9rem", padding: "0.6rem 1rem" }}><Icon name="eye" size={16} /> Preview</button>
          <button id="pay-clear-btn" onClick={clearAllPayments} className="btn btn-danger" disabled={busy} style={{ fontSize: "0.9rem", padding: "0.6rem 1rem", marginLeft: "auto" }}>
            {busy ? <><span className="spinner" /> Resetting…</> : <><Icon name="trash" size={16} /> No Payment</>}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "1rem" }}>
          <span>History ({filteredPayments.length}/{payments.length})</span>
          <input type="month" className="input" style={{ width: "auto", padding: "0.3rem 0.5rem", fontSize: "0.8rem", minHeight: "auto" }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        </div>
        <div className="divide-glass">
          {filteredPayments.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "1rem" }}>No payments found.</div>}
          {filteredPayments.map((p: any) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.7rem 1rem", fontSize: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input type="date" className="input" style={{ width: "auto", fontSize: "0.9rem", padding: "0.3rem 0.5rem", minHeight: "auto" }} value={p.paid_on || ""} onChange={e => updateDate(p.id, e.target.value)} />
                <span style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{ textTransform: "capitalize" }}>{p.method}</span>
                  {p.notes && <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic", opacity: 0.9 }}>— {p.notes}</span>}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontWeight: 700, color: "var(--success)" }}>₹{p.amount}</span>
                <button onClick={() => deletePayment(p.id)} style={{ color: "var(--danger)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", padding: "0.2rem" }} title="Delete">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkoutsTab({ m, workouts, onReload }: { m: any; workouts: any[]; onReload: () => void }) {
  const [label, setLabel] = useState("Day 1");
  const [rows, setRows] = useState([{ name: "", sets: "", reps: "", notes: "" }]);

  async function save() {
    const clean = rows.filter(r => r.name.trim());
    if (!clean.length) return;
    const { error } = await supabase.from("workouts").insert({ member_id: m.id, day_label: label, exercises: clean });
    if (error) { alert(error.message); return; }
    onReload();
    setRows([{ name: "", sets: "", reps: "", notes: "" }]);
  }

  async function del(id: string) {
    if (!confirm("Delete workout?")) return;
    await supabase.from("workouts").delete().eq("id", id);
    onReload();
  }

  async function sendPlan() {
    const text = workouts.map((w: any) => {
      const ex = (w.exercises || []).map((e: any) => `• ${e.name} — ${e.sets || "?"}x${e.reps || "?"}${e.notes ? " (" + e.notes + ")" : ""}`).join("\n");
      return `*${w.day_label}*\n${ex}`;
    }).join("\n\n");
    await apiFetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: m.id, body: `Hi ${m.name}, here's your workout plan:\n\n${text}` }) });
    alert("Sent ✓");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>🏋️ Add Workout Day</h3>
        <input id="workout-label" className="input" style={{ marginBottom: "0.75rem" }} placeholder="Day label (e.g. Mon - Push)" value={label} onChange={e => setLabel(e.target.value)} />
        {rows.map((r, i) => (
          <div key={i} className="workout-add-grid">
            <input className="input" placeholder="Exercise" value={r.name} onChange={e => { const c = [...rows]; c[i].name = e.target.value; setRows(c); }} />
            <input className="input" placeholder="Sets" value={r.sets} onChange={e => { const c = [...rows]; c[i].sets = e.target.value; setRows(c); }} />
            <input className="input" placeholder="Reps" value={r.reps} onChange={e => { const c = [...rows]; c[i].reps = e.target.value; setRows(c); }} />
            <input className="input" placeholder="Notes" value={r.notes} onChange={e => { const c = [...rows]; c[i].notes = e.target.value; setRows(c); }} />
          </div>
        ))}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setRows([...rows, { name: "", sets: "", reps: "", notes: "" }])}>+ Row</button>
          <button id="save-workout-btn" className="btn btn-primary" onClick={save}>💾 Save Day</button>
          {workouts.length > 0 && <button className="btn btn-cyan" onClick={sendPlan}>💬 Send via WhatsApp</button>}
        </div>
      </div>
      {workouts.map((w: any) => (
        <div key={w.id} className="glass" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>{w.day_label}</h4>
            <button onClick={() => del(w.id)} className="btn btn-danger" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", minHeight: "auto" }}>Delete</button>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {(w.exercises || []).map((e: any, i: number) => (
              <li key={i} style={{ fontSize: "0.875rem", color: "var(--text)" }}>
                <span style={{ color: "var(--accent)" }}>•</span> {e.name} — {e.sets || "?"}×{e.reps || "?"}{e.notes && <span style={{ color: "var(--text-muted)" }}> ({e.notes})</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DietsTab({ m, diets, onReload }: { m: any; diets: any[]; onReload: () => void }) {
  const [label, setLabel] = useState("Breakfast");
  const [rows, setRows] = useState([{ food: "", qty: "", calories: "" }]);
  const [notes, setNotes] = useState("");

  async function save() {
    const clean = rows.filter(r => r.food.trim());
    if (!clean.length) return;
    const { error } = await supabase.from("diets").insert({ member_id: m.id, meal_label: label, items: clean, notes });
    if (error) { alert(error.message); return; }
    onReload();
    setRows([{ food: "", qty: "", calories: "" }]); setNotes("");
  }

  async function del(id: string) {
    if (!confirm("Delete meal?")) return;
    await supabase.from("diets").delete().eq("id", id);
    onReload();
  }

  async function sendDiet() {
    const text = diets.map((d: any) => {
      const items = (d.items || []).map((it: any) => `• ${it.food} — ${it.qty}${it.calories ? " (" + it.calories + " kcal)" : ""}`).join("\n");
      return `*${d.meal_label}*\n${items}${d.notes ? "\n_" + d.notes + "_" : ""}`;
    }).join("\n\n");
    await apiFetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: m.id, body: `Hi ${m.name}, here's your diet plan:\n\n${text}` }) });
    alert("Sent ✓");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>🥗 Add Meal</h3>
        <select id="diet-label" className="input" style={{ marginBottom: "0.75rem" }} value={label} onChange={e => setLabel(e.target.value)}>
          {["Breakfast","Mid-morning","Lunch","Snack","Dinner","Pre-workout","Post-workout"].map(o => <option key={o}>{o}</option>)}
        </select>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input className="input" placeholder="Food" value={r.food} onChange={e => { const c = [...rows]; c[i].food = e.target.value; setRows(c); }} />
            <input className="input" placeholder="Qty" value={r.qty} onChange={e => { const c = [...rows]; c[i].qty = e.target.value; setRows(c); }} />
            <input className="input" placeholder="Calories" value={r.calories} onChange={e => { const c = [...rows]; c[i].calories = e.target.value; setRows(c); }} />
          </div>
        ))}
        <input className="input" style={{ marginBottom: "0.75rem" }} placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setRows([...rows, { food: "", qty: "", calories: "" }])}>+ Row</button>
          <button id="save-diet-btn" className="btn btn-primary" onClick={save}>💾 Save Meal</button>
          {diets.length > 0 && <button className="btn btn-cyan" onClick={sendDiet}>💬 Send via WhatsApp</button>}
        </div>
      </div>
      {diets.map((d: any) => (
        <div key={d.id} className="glass" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <h4 style={{ fontWeight: 700, fontSize: "0.95rem" }}>{d.meal_label}</h4>
            <button onClick={() => del(d.id)} className="btn btn-danger" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", minHeight: "auto" }}>Delete</button>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {(d.items || []).map((it: any, i: number) => (
              <li key={i} style={{ fontSize: "0.875rem" }}>
                <span style={{ color: "var(--accent2)" }}>•</span> {it.food} — {it.qty}{it.calories && <span style={{ color: "var(--text-muted)" }}> ({it.calories} kcal)</span>}
              </li>
            ))}
          </ul>
          {d.notes && <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>{d.notes}</p>}
        </div>
      ))}
    </div>
  );
}

function PortalTab({ m }: { m: any }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [existingUser, setExistingUser] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("client_tokens").select("username,token").eq("member_id", m.id).single()
      .then(({ data }) => {
        if (data?.username) setExistingUser(data.username);
        if (data?.token) setToken(data.token);
      });
  }, [m.id]);

  const showMsg = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPw) { showMsg("Passwords do not match", false); return; }
    if (password.length < 6) { showMsg("Password must be at least 6 characters", false); return; }
    setSaving(true);
    const res = await apiFetch("/api/pt/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: m.id, username, password }),
    });
    const j = await res.json();
    setSaving(false);
    if (j.ok) {
      setExistingUser(username.toLowerCase().trim());
      setPassword(""); setConfirmPw("");
      showMsg("✓ Credentials saved! Client can now login.", true);
    } else {
      showMsg(j.error || "Failed to save", false);
    }
  }

  const portalUrl = token ? `${window.location.origin}/client/${token}` : null;
  const loginUrl = `${window.location.origin}/client/login`;

  const copyText = (text: string) => { navigator.clipboard.writeText(text); showMsg("Copied!", true); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Status card */}
      <div className="glass" style={{ padding: "1.25rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>🔐 Portal Access Status</div>
        {existingUser ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "9999px", padding: "0.2rem 0.65rem", fontSize: "0.75rem", fontWeight: 700 }}>✓ ACTIVE</span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Username: <strong style={{ color: "var(--text)" }}>{existingUser}</strong></span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <button onClick={() => copyText(loginUrl)} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", minHeight: 34 }}>📋 Copy Login URL</button>
              {portalUrl && <button onClick={() => copyText(portalUrl)} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", minHeight: 34 }}>🔗 Copy Direct Link</button>}
            </div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "var(--accent2)", fontFamily: "monospace", wordBreak: "break-all" }}>
              {loginUrl}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>⚠️ No credentials set. Create below so client can login.</div>
        )}
      </div>

      {/* Credential form */}
      <div className="glass" style={{ padding: "1.25rem" }}>
        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.75rem" }}>
          {existingUser ? "🔄 Update Credentials" : "🔑 Create Client Login"}
        </div>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Username</label>
            <input
              id="portal-username"
              className="input"
              type="text"
              placeholder={existingUser ? `Current: ${existingUser}` : "e.g. john.doe or phone number"}
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              style={{ fontSize: "0.95rem" }}
            />
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Tip: use member's phone number as username for easy recall</div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="portal-password"
                className="input"
                type={showPw ? "text" : "password"}
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ fontSize: "0.95rem", paddingRight: "3rem" }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--text-muted)" }}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.3rem" }}>Confirm Password</label>
            <input
              id="portal-confirm-pw"
              className="input"
              type={showPw ? "text" : "password"}
              placeholder="Re-enter password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              required
              style={{ fontSize: "0.95rem", borderColor: confirmPw && password !== confirmPw ? "var(--danger)" : undefined }}
            />
            {confirmPw && password !== confirmPw && <div style={{ fontSize: "0.72rem", color: "var(--danger)", marginTop: "0.25rem" }}>Passwords do not match</div>}
          </div>

          {msg && (
            <div style={{ background: msg.ok ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)", border: `1px solid ${msg.ok ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.3)"}`, borderRadius: "0.5rem", padding: "0.6rem 0.85rem", fontSize: "0.875rem", color: msg.ok ? "#34d399" : "#fb7185" }}>
              {msg.text}
            </div>
          )}

          <button id="save-portal-credentials-btn" type="submit" className="btn btn-primary" disabled={saving} style={{ fontSize: "0.95rem", padding: "0.65rem 1.25rem", minHeight: 42, alignSelf: "flex-start" }}>
            {saving ? <><span className="spinner" /> Saving…</> : existingUser ? "🔄 Update Credentials" : "🔑 Create Login"}
          </button>
        </form>
      </div>

      {/* Instructions */}
      <div className="card" style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
        <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "0.5rem" }}>📱 Share with Client</div>
        <div>1. Give client the login URL: <strong style={{ color: "var(--accent2)" }}>/client/login</strong></div>
        <div>2. Share their username &amp; password directly</div>
        <div>3. Client logs in → sees workout plan, diet plan &amp; food diary</div>
        <div style={{ marginTop: "0.5rem", color: "var(--warn)" }}>⚠️ Never share the direct token link publicly</div>
      </div>
    </div>
  );
}

function MessagesTab({ messages }: { messages: any[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div className="section-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>💬 Recent WhatsApp ({messages.length})</span>
      </div>
      <div className="divide-glass">
        {messages.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>No messages sent yet.</div>}
        {messages.map((msg: any) => (
          <div key={msg.id} style={{ padding: "0.75rem 1rem", fontSize: "0.875rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              <span>{new Date(msg.sent_at).toLocaleString()}</span>
              <span style={{ color: msg.status === "sent" ? "var(--success)" : "var(--danger)" }}>{msg.status}</span>
            </div>
            <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{msg.body}</div>
            {msg.error && <div style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "0.25rem" }}>{msg.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EDIT FORM VIEW COMPONENT
   ───────────────────────────────────────────────────────────────────────────── */
function EditFormView({ member, onCancel, onSaved }: { member: any; onCancel: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ ...member });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function calcAge(dob: string) {
    if (!dob) return "";
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 ? String(age) : "";
  }

  function set(k: string, v: any) {
    setF((prev: any) => ({ ...prev, [k]: v }));
    if (k === "dob") {
      const a = calcAge(v);
      setF((prev: any) => ({ ...prev, dob: v, age: a }));
    }
  }

  const setDirect = (k: string, v: any) => setF((prev: any) => ({ ...prev, [k]: v }));

  async function save() {
    setErr(""); setBusy(true);
    let photo_url = f.photo_url;
    if (photo) {
      const path = `members/${Date.now()}-${photo.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("member-photos").upload(path, photo);
      if (upErr) { setErr(upErr.message); setBusy(false); return; }
      const { data: pub } = supabase.storage.from("member-photos").getPublicUrl(path);
      photo_url = pub.publicUrl;
    }
    const { error } = await supabase.from("members").update({
      name: f.name, phone: f.phone, address: f.address, age: f.age ? Number(f.age) : null,
      dob: f.dob || null, gender: f.gender, weight: f.weight ? Number(f.weight) : null,
      height: f.height ? Number(f.height) : null, fee_amount: Number(f.fee_amount),
      fee_cycle_days: Number(f.fee_cycle_days), is_pt_client: f.is_pt_client,
      active: f.active, notes: f.notes, photo_url, next_due_date: f.next_due_date,
      join_date: f.join_date || null
    }).eq("id", member.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text)", marginBottom: "1rem" }}>Edit Member</h1>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <L label="Name"><input className="input" value={f.name || ""} onChange={e => set("name", e.target.value)} /></L>
          <L label="Phone"><input className="input" value={f.phone || ""} onChange={e => set("phone", e.target.value)} /></L>
          <L label="Join Date"><input type="date" className="input" value={f.join_date || ""} onChange={e => set("join_date", e.target.value)} /></L>
          <L label="Date of Birth"><input type="date" className="input" value={f.dob || ""} onChange={e => set("dob", e.target.value)} /></L>
          <L label="Age"><input type="number" className="input" value={f.age || ""} onChange={e => setDirect("age", e.target.value)} /></L>
          <L label="Gender">
            <select className="input" value={f.gender || "M"} onChange={e => set("gender", e.target.value)}>
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </select>
          </L>
          <L label="Weight (kg)"><input type="number" step="0.1" className="input" value={f.weight || ""} onChange={e => set("weight", e.target.value)} /></L>
          <L label="Height (cm)"><input type="number" step="0.1" className="input" value={f.height || ""} onChange={e => set("height", e.target.value)} /></L>
          <L label="Fee (₹)"><input type="number" className="input" value={f.fee_amount || 0} onChange={e => set("fee_amount", e.target.value)} /></L>
        </div>

        {/* ── Membership Plan Picker ── */}
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.5rem" }}>Membership Plan</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.5rem" }}>
            {PLANS.map(p => {
              const selected = Number(f.fee_cycle_days) === p.days;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set("fee_cycle_days", p.days)}
                  style={{
                    border: `2px solid ${selected ? p.color : "var(--border)"}`,
                    borderRadius: "0.65rem",
                    padding: "0.6rem 0.75rem",
                    background: selected ? `rgba(${p.glow.slice(5,-1)},0.1)` : "var(--surface)",
                    boxShadow: selected ? `0 0 12px ${p.glow}` : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                    color: "var(--text)"
                  }}
                >
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.months === 1 ? "1 Month" : `${p.months} Months`}
                  </span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 800, color: selected ? p.color : "inherit" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{p.days} days</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: "0.45rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Custom days:</span>
            <input
              type="number"
              className="input"
              style={{ maxWidth: "90px", fontSize: "0.85rem", padding: "0.25rem 0.5rem", minHeight: "auto" }}
              value={f.fee_cycle_days || 30}
              onChange={e => set("fee_cycle_days", e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <L label="Next Due Date"><input type="date" className="input" value={f.next_due_date || ""} onChange={e => set("next_due_date", e.target.value)} /></L>
        </div>
        <L label="Address"><textarea className="input" rows={2} value={f.address || ""} onChange={e => set("address", e.target.value)} /></L>
        <L label="Notes"><textarea className="input" rows={2} value={f.notes || ""} onChange={e => set("notes", e.target.value)} /></L>
        <L label="Update Photo">
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <label className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                <Icon name="camera" size={18} /> Camera
                <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
              <label className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                <Icon name="upload" size={18} /> Upload
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
              </label>
              {photo && <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>✓ {photo.name}</span>}
            </div>
          </L>
        <label className="flex items-center gap-2 text-sm" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.is_pt_client} onChange={e => set("is_pt_client", e.target.checked)} /> PT Client
        </label>
        <label className="flex items-center gap-2 text-sm" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={!!f.active} onChange={e => set("active", e.target.checked)} /> Active
        </label>
        {err && <p style={{ color: "var(--danger)", fontSize: "0.875rem" }}>{err}</p>}
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <><span className="spinner" /> Saving...</> : <><Icon name="check" size={18} /> Save</>}</button>
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: any) {
  return <label style={{ display: "block" }}><span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span><div style={{ marginTop: "0.25rem" }}>{children}</div></label>;
}
