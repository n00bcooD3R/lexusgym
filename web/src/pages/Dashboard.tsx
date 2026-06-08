import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase, apiFetch } from "../lib/supabase";
import { feeStatus, formatDate } from "../lib/fees";
import { motion } from "framer-motion";
import { Icon } from "../components/Icons";

type M = {
  id: string; admission_no: string; name: string; phone: string;
  photo_url: string | null; fee_amount: number;
  next_due_date: string | null; last_payment_date: string | null;
  is_pt_client: boolean; active: boolean; is_staff: boolean;
};

export default function DashboardPage() {
  const [members, setMembers] = useState<M[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  async function loadData() {
    try {
      const { data } = await supabase
        .from("members")
        .select("id, admission_no, name, phone, photo_url, fee_amount, next_due_date, last_payment_date, is_pt_client, active, is_staff")
        .eq("active", true)
        .order("next_due_date", { ascending: true, nullsFirst: false });
      setMembers(data || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const grouped = useMemo(() => {
    const overdue: M[] = [], dueSoon: M[] = [], ok: M[] = [];
    for (const m of members) {
      if (m.is_staff) {
        ok.push(m);
        continue;
      }
      const s = feeStatus(m.next_due_date);
      if (s === "overdue") overdue.push(m);
      else if (s === "due-soon") dueSoon.push(m);
      else ok.push(m);
    }
    return { overdue, dueSoon, ok };
  }, [members]);

  async function sendReminder(m: M) {
    setSending(m.id);
    setToast("");
    try {
      const res = await apiFetch("/api/wa/send", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ memberId: m.id })
      });
      const json = await res.json();
      setToast(json.ok ? `✓ Sent to ${m.name}` : `✗ ${json.error || "Failed"}`);
    } catch (err: any) {
      setToast(`✗ ${err.message || "Failed to connect to API"}`);
    } finally {
      setSending(null);
      setTimeout(() => setToast(""), 4000);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: "1rem", color: "var(--text-muted)" }}>
        <span className="spinner" style={{ width: "2rem", height: "2rem", borderWidth: "3px", borderTopColor: "var(--accent)" }} />
        Loading dashboard metrics…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
        <StatCard label="Overdue" value={grouped.overdue.length} variant="danger" dot="🔴" />
        <StatCard label="Due Soon" value={grouped.dueSoon.length} variant="warn" dot="🟡" />
        <StatCard label="Active" value={members.length} variant="success" dot="🟢" />
      </div>

      {/* Toast Alert */}
      {toast && <div className="toast">{toast}</div>}

      {/* List Sections */}
      <Section title="Overdue" rows={grouped.overdue} sending={sending} onSend={sendReminder} variant="overdue" dot="🔴" />
      <Section title="Due Soon" rows={grouped.dueSoon} sending={sending} onSend={sendReminder} variant="duesoon" dot="🟡" />
      <Section title="All Good" rows={grouped.ok} sending={sending} onSend={sendReminder} variant="ok" dot="🟢" />
    </div>
  );
}

function StatCard({ label, value, variant, dot }: { label: string; value: number; variant: string; dot?: string }) {
  return (
    <motion.div 
      className={`stat-card ${variant}`}
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -2 }}
    >
      <div style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>{dot}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: variant === "danger" ? "var(--danger)" : variant === "warn" ? "var(--warn)" : "var(--success)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 500 }}>{label}</div>
    </motion.div>
  );
}

function Section({ title, rows, sending, onSend, variant, dot }: {
  title: string; rows: any[]; sending: string | null;
  onSend: (m: any) => void; variant: "overdue" | "duesoon" | "ok"; dot?: string;
}) {
  if (!rows.length) return null;

  const borderColor = variant === "overdue" ? "rgba(244,63,94,0.3)"
    : variant === "duesoon" ? "rgba(245,158,11,0.3)"
    : "rgba(16,185,129,0.2)";

  return (
    <motion.div 
      className="card" 
      style={{ padding: 0, overflow: "hidden", borderColor }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="section-header" style={{ borderBottom: `1px solid ${borderColor}` }}>
        {dot} {title} ({rows.length})
      </div>
      <div className="divide-glass">
        {rows.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
          >
            <MemberRow m={m} sending={sending} onSend={onSend} variant={variant} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function MemberRow({ m, sending, onSend, variant }: any) {
  const status = feeStatus(m.next_due_date, undefined, m.is_staff);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", transition: "background 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <Link to={`/members/${m.id}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0, textDecoration: "none", color: "var(--text)" }}>
        <Avatar src={m.photo_url} name={m.name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: status === "staff" ? "#a78bfa" : variant === "overdue" ? "#fb7185" : variant === "duesoon" ? "#fbbf24" : "var(--text)" }}>
            {m.name}
            {m.is_staff && <span className="badge" style={{ marginLeft: "0.4rem", background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.3)", fontSize: "0.7rem", padding: "0.1rem 0.35rem" }}>Staff</span>}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            #{m.admission_no} · {m.phone}
            {m.is_pt_client && <span className="badge badge-pt">PT</span>}
          </div>
        </div>
      </Link>
      <div style={{ textAlign: "right", fontSize: "0.75rem", display: "none" }} className="sm-show">
        <div style={{ color: status === "staff" ? "#a78bfa" : variant === "overdue" ? "#fb7185" : variant === "duesoon" ? "#fbbf24" : "var(--text-muted)" }}>
          {status === "staff" ? "Staff" : m.next_due_date ? formatDate(m.next_due_date) : "—"}
        </div>
        <div style={{ color: "var(--text-muted)" }}>
          {status === "staff" ? "Unlimited" : `₹${m.fee_amount}`}
        </div>
      </div>
      {status !== "staff" && (
        <button
          disabled={sending === m.id}
          onClick={() => onSend(m)}
          className="btn btn-primary"
          id={`send-reminder-${m.id}`}
          style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", minWidth: "auto", flexShrink: 0 }}
        >
          {sending === m.id ? <span className="spinner" /> : <Icon name="send" size={16} />}
          <span className="hidden sm:inline">Send</span>
        </button>
      )}
    </div>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) return <img src={src} alt={name} className="avatar" style={{ width: "2.25rem", height: "2.25rem" }} />;
  return <div className="avatar-initials">{name.charAt(0).toUpperCase()}</div>;
}
