"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { feeStatus, formatDate } from "@/lib/fees";
import { motion } from "framer-motion";

type M = {
  id: string; admission_no: string; name: string; phone: string;
  photo_url: string | null; fee_amount: number;
  next_due_date: string | null; last_payment_date: string | null;
  is_pt_client: boolean; active: boolean;
};

export default function DashboardClient({ members }: { members: M[] }) {
  const [sending, setSending] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  const grouped = useMemo(() => {
    const overdue: M[] = [], dueSoon: M[] = [], ok: M[] = [];
    for (const m of members) {
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
    const res = await fetch("/api/wa/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: m.id })
    });
    const json = await res.json();
    setSending(null);
    setToast(json.ok ? `✓ Sent to ${m.name}` : `✗ ${json.error || "Failed"}`);
    setTimeout(() => setToast(""), 4000);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          🚀 Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginTop: "0.25rem" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
        <StatCard label="Overdue" value={grouped.overdue.length} variant="danger" icon="🔴" />
        <StatCard label="Due Soon" value={grouped.dueSoon.length} variant="warn" icon="🟡" />
        <StatCard label="Active" value={members.length} variant="success" icon="🟢" />
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}

      {/* Sections */}
      <Section title="🔴 Overdue" rows={grouped.overdue} sending={sending} onSend={sendReminder} variant="overdue" />
      <Section title="🟡 Due Soon" rows={grouped.dueSoon} sending={sending} onSend={sendReminder} variant="duesoon" />
      <Section title="🟢 All Good" rows={grouped.ok} sending={sending} onSend={sendReminder} variant="ok" />
    </div>
  );
}

function StatCard({ label, value, variant, icon }: { label: string; value: number; variant: string; icon: string }) {
  return (
    <motion.div 
      className={`stat-card ${variant}`}
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -2 }}
    >
      <div style={{ fontSize: "1.2rem", marginBottom: "0.4rem" }}>{icon}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color: variant === "danger" ? "var(--danger)" : variant === "warn" ? "var(--warn)" : "var(--success)", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem", fontWeight: 500 }}>{label}</div>
    </motion.div>
  );
}

function Section({ title, rows, sending, onSend, variant }: {
  title: string; rows: any[]; sending: string | null;
  onSend: (m: any) => void; variant: "overdue" | "duesoon" | "ok";
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
        {title} ({rows.length})
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
  const status = feeStatus(m.next_due_date);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", transition: "background 0.2s" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
      <Link href={`/members/${m.id}`} style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0, textDecoration: "none", color: "var(--text)" }}>
        <Avatar src={m.photo_url} name={m.name} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: variant === "overdue" ? "#fb7185" : variant === "duesoon" ? "#fbbf24" : "var(--text)" }}>
            {m.name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            #{m.admission_no} · {m.phone}
            {m.is_pt_client && <span className="badge badge-pt">PT</span>}
          </div>
        </div>
      </Link>
      <div style={{ textAlign: "right", fontSize: "0.75rem", display: "none" }} className="sm-show">
        <div style={{ color: variant === "overdue" ? "#fb7185" : variant === "duesoon" ? "#fbbf24" : "var(--text-muted)" }}>
          {m.next_due_date ? formatDate(m.next_due_date) : "—"}
        </div>
        <div style={{ color: "var(--text-muted)" }}>₹{m.fee_amount}</div>
      </div>
      <button
        disabled={sending === m.id}
        onClick={() => onSend(m)}
        className="btn btn-primary"
        id={`send-reminder-${m.id}`}
        style={{ padding: "0.4rem 0.85rem", fontSize: "0.8rem", minWidth: "auto", flexShrink: 0 }}
      >
        {sending === m.id ? <span className="spinner" /> : "💬"}
        <span className="hidden sm:inline">Send</span>
      </button>
    </div>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) return <img src={src} alt={name} className="avatar" style={{ width: "2.25rem", height: "2.25rem" }} />;
  return <div className="avatar-initials">{name.charAt(0).toUpperCase()}</div>;
}
