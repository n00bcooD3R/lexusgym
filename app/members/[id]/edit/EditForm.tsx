"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { Icon } from "@/components/Icons";

const PLANS = [
  { id: "flex",      label: "Flex Plan",      months: 1,  days: 30,  color: "#06b6d4", glow: "rgba(6,182,212,0.35)" },
  { id: "power",     label: "Power Plan",     months: 3,  days: 90,  color: "#8b5cf6", glow: "rgba(139,92,246,0.35)" },
  { id: "transform",label: "Transform Plan", months: 6,  days: 180, color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  { id: "prime",     label: "Prime Plan",     months: 12, days: 365, color: "#10b981", glow: "rgba(16,185,129,0.35)" },
];

export default function EditForm({ member }: { member: any }) {
  const router = useRouter();
  const [f, setF] = useState({ ...member });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    const sb = createClient();
    let photo_url = f.photo_url;
    if (photo) {
      const path = `members/${Date.now()}-${photo.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const { error: upErr } = await sb.storage.from("member-photos").upload(path, photo);
      if (upErr) { setErr(upErr.message); setBusy(false); return; }
      const { data: pub } = sb.storage.from("member-photos").getPublicUrl(path);
      photo_url = pub.publicUrl;
    }
    const { error } = await sb.from("members").update({
      name: f.name, phone: f.phone, address: f.address, age: f.age ? Number(f.age) : null,
      dob: f.dob || null, gender: f.gender, weight: f.weight ? Number(f.weight) : null,
      height: f.height ? Number(f.height) : null, fee_amount: Number(f.fee_amount),
      fee_cycle_days: Number(f.fee_cycle_days), is_pt_client: f.is_pt_client,
      active: f.active, notes: f.notes, photo_url, next_due_date: f.next_due_date,
      join_date: f.join_date || null
    }).eq("id", member.id);
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push(`/members/${member.id}`);
  }

  async function doDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: member.id })
      });
      const j = await res.json();
      if (!j.ok) { alert("Delete failed: " + j.error); setDeleting(false); return; }
      router.push("/members");
    } catch (err: any) { alert("Delete error: " + err.message); setDeleting(false); }
  }

  function remove() {
    setShowDelete(true);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {showDelete && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", maxWidth: "400px", textAlign: "center" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 700 }}>Delete Member?</h3>
            <p style={{ marginBottom: "1.5rem", color: "#666" }}>This will permanently delete {member.name} and all their records.</p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button className="btn btn-ghost" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</button>
              <button className="btn btn-danger" onClick={doDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-xl font-bold mb-4">Edit Member</h1>
      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
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
          <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 500, marginBottom: "0.5rem" }}>Membership Plan</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "0.5rem" }}>
            {PLANS.map(p => {
              const selected = Number(f.fee_cycle_days) === p.days;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set("fee_cycle_days", p.days)}
                  style={{
                    border: `2px solid ${selected ? p.color : "#e2e8f0"}`,
                    borderRadius: "0.65rem",
                    padding: "0.6rem 0.75rem",
                    background: selected ? `rgba(${p.glow.slice(5,-1)},0.1)` : "var(--surface, #f8fafc)",
                    boxShadow: selected ? `0 0 12px ${p.glow}` : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.1rem",
                  }}
                >
                  <span style={{ fontSize: "0.65rem", fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.months === 1 ? "1 Month" : `${p.months} Months`}
                  </span>
                  <span style={{ fontSize: "0.875rem", fontWeight: 800, color: selected ? p.color : "inherit" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>{p.days} days</span>
                </button>
              );
            })}
          </div>
          <div style={{ marginTop: "0.45rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#94a3b8", whiteSpace: "nowrap" }}>Custom days:</span>
            <input
              type="number"
              className="input"
              style={{ maxWidth: "90px", fontSize: "0.85rem", padding: "0.25rem 0.5rem", minHeight: "auto" }}
              value={f.fee_cycle_days || 30}
              onChange={e => set("fee_cycle_days", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
            </div>
          </L>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f.is_pt_client} onChange={e => set("is_pt_client", e.target.checked)} /> PT Client
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!f.active} onChange={e => set("active", e.target.checked)} /> Active
        </label>
        {err && <p className="text-rose-600 text-sm">{err}</p>}
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <><span className="spinner" /> Saving...</> : <><Icon name="check" size={18} /> Save</>}</button>
          <a className="btn btn-ghost" href={`/members/${member.id}`}>Cancel</a>
          <button type="button" className="btn btn-danger ml-auto" onClick={remove}>Delete Member</button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: any) {
  return <label className="block"><span className="text-xs text-slate-600">{label}</span><div className="mt-1">{children}</div></label>;
}
