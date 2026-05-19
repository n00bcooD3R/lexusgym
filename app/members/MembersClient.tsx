"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { feeStatus, formatDate } from "@/lib/fees";
import { Icon } from "@/components/Icons";

type Tab = "name" | "admission" | "phone";

export default function MembersClient({ members }: { members: any[] }) {
  const [tab, setTab] = useState<Tab>("name");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return members;
    return members.filter((m) => {
      if (tab === "name") return m.name.toLowerCase().includes(needle);
      if (tab === "admission") return m.admission_no.toLowerCase().includes(needle);
      if (tab === "phone") return (m.phone || "").toLowerCase().includes(needle);
      return true;
    });
  }, [members, tab, q]);

  const placeholder = tab === "name" ? "Search by name…"
    : tab === "admission" ? "Search by admission no…"
    : "Search by phone…";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          Members ({members.length})
        </h1>
        <Link href="/members/new" className="btn btn-primary" id="new-member-btn">
          <Icon name="add" size={18} /> New Member
        </Link>
      </div>

      {/* Search Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid var(--border)" }}>
        {(["name", "admission", "phone"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? "tab-active" : "tab-idle"}`} id={`tab-${t}`}>
            <Icon name="user" size={16} /> {t === "name" ? "Name" : t === "admission" ? "Admission" : "Phone"}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div style={{ position: "relative" }}>
        <svg style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", width: "1.3rem", height: "1.3rem" }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          id="member-search"
          className="input"
          style={{ paddingLeft: "2.5rem" }}
          autoFocus
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Member List */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🔭</div>
            No members found.
          </div>
        )}
        <div className="divide-glass">
          {filtered.map((m) => {
            const s = feeStatus(m.next_due_date);
            const nameColor = s === "overdue" ? "#fb7185" : s === "due-soon" ? "#fbbf24" : "var(--text)";
            return (
              <Link key={m.id} href={`/members/${m.id}`} id={`member-row-${m.id}`}
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", textDecoration: "none", color: "var(--text)", transition: "background 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <Avatar src={m.photo_url} name={m.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: nameColor }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                    #{m.admission_no} · {m.phone}
                    {m.is_pt_client && <span className="badge badge-pt">PT</span>}
                    {!m.active && <span className="badge" style={{ background: "rgba(148,163,184,0.15)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>Inactive</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.75rem" }}>
                  <div style={{ color: nameColor, fontWeight: 500 }}>{m.next_due_date ? formatDate(m.next_due_date) : "—"}</div>
                  <div style={{ color: "var(--text-muted)" }}>₹{m.fee_amount}</div>
                </div>
                {s === "overdue" && <span className="badge badge-overdue">!</span>}
                {s === "due-soon" && <span className="badge badge-duesoon">~</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (src) return <img src={src} alt={name} className="avatar" style={{ width: "2.25rem", height: "2.25rem" }} />;
  return <div className="avatar-initials">{name.charAt(0).toUpperCase()}</div>;
}
