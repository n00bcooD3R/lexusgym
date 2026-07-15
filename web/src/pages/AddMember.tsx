import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, apiFetch } from "../lib/supabase";
import { compressImage } from "../lib/image";
import { Icon } from "../components/Icons";

const PLANS = [
  { id: "flex",      label: "Flex Plan",      months: 1,  days: 30,  fee: 1000,  color: "#06b6d4", glow: "rgba(6,182,212,0.35)" },
  { id: "power",     label: "Power Plan",     months: 3,  days: 90,  fee: 2700,  color: "#8b5cf6", glow: "rgba(139,92,246,0.35)" },
  { id: "transform",label: "Transform Plan", months: 6,  days: 180, fee: 5400,  color: "#f59e0b", glow: "rgba(245,158,11,0.35)" },
  { id: "prime",     label: "Prime Plan",     months: 12, days: 365, fee: 9999,  color: "#10b981", glow: "rgba(16,185,129,0.35)" },
];

import { generateInvoice, setGymDetails } from "../lib/pdf-bill";

const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (dateStr: string, days: number) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const diffDays = (dateStr1: string, dateStr2: string) => {
  if (!dateStr1 || !dateStr2) return 0;
  const [y1, m1, d1] = dateStr1.split("-").map(Number);
  const [y2, m2, d2] = dateStr2.split("-").map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

export default function NewMember() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [admError, setAdmError] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [cardio, setCardio] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [selectedPlan, setSelectedPlan] = useState<string>("flex");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  // Couple pack state
  const [coupleSearch, setCoupleSearch] = useState("");
  const [coupleResults, setCoupleResults] = useState<any[]>([]);
  const [couplePartner, setCouplePartner] = useState<{ id: string; name: string; admission_no: string } | null>(null);
  const [coupleSearching, setCoupleSearching] = useState(false);
  const [form, setForm] = useState({
    admission_no: "", name: "", phone: "+91", address: "",
    dob: "", age: "", gender: "M", weight: "", height: "",
    fee_amount: "1000", fee_cycle_days: "30", admission_fee: "",
    is_pt_client: false, notes: "", join_date: getTodayString(),
    next_due_date: addDays(getTodayString(), 30)
  });

  useEffect(() => {
    async function load() {
      const res = await apiFetch("/api/settings/list");
      const data = await res.json();
      setSettings(data);
      setGymDetails(data);
    }
    load();
  }, []);

  useEffect(() => {
    async function fetchNextAdm() {
      const { data } = await supabase.from("members").select("admission_no").order("admission_no", { ascending: false }).limit(1);
      let next = 1;
      if (data && data.length > 0 && data[0].admission_no) {
        next = (parseInt(data[0].admission_no) || 0) + 1;
      }
      const f = String(next).padStart(4, "0");
      setForm(prev => ({ ...prev, admission_no: f }));
    }
    fetchNextAdm();
  }, []);

  function calcAge(dob: string) {
    if (!dob) return "";
    const birth = new Date(dob), today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() - birth.getMonth() < 0 || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age > 0 ? String(age) : "";
  }

  function upd(k: string, v: any) {
    if (k === "dob") {
      setForm(prev => ({ ...prev, dob: v, age: calcAge(v) }));
      return;
    }
    if (k === "join_date") {
      setForm(prev => {
        const nextDue = addDays(v, Number(prev.fee_cycle_days || 30));
        return { ...prev, join_date: v, next_due_date: nextDue };
      });
      return;
    }
    if (k === "fee_cycle_days") {
      const numericDays = typeof v === "string" ? v.replace(/\D/g, "") : String(v);
      setForm(prev => {
        const nextDue = addDays(prev.join_date, Number(numericDays || 30));
        return { ...prev, fee_cycle_days: numericDays, next_due_date: nextDue };
      });
      return;
    }
    if (k === "next_due_date") {
      setForm(prev => {
        const diff = diffDays(prev.join_date, v);
        const cycleDays = diff > 0 ? String(diff) : prev.fee_cycle_days;
        return { ...prev, next_due_date: v, fee_cycle_days: cycleDays };
      });
      return;
    }
    if (typeof v === "string") {
      if (k === "phone") v = v.replace(/[^\d+]/g, "");
      else if (["admission_no", "age", "fee_amount", "admission_fee"].includes(k)) v = v.replace(/\D/g, "");
      else if (["weight", "height"].includes(k)) v = v.replace(/[^\d.]/g, "");
    }
    setForm(prev => ({ ...prev, [k]: v }));
  }

  function selectPlan(planId: string) {
    setSelectedPlan(planId);
    if (planId === "couple") {
      // couple pack: clear preset values so user fills manually
      setForm(prev => {
        const nextDue = addDays(prev.join_date, 30);
        return { ...prev, fee_cycle_days: "30", fee_amount: "", next_due_date: nextDue };
      });
    } else {
      const p = PLANS.find(x => x.id === planId);
      if (p) {
        setForm(prev => {
          const nextDue = addDays(prev.join_date, p.days);
          return { ...prev, fee_cycle_days: String(p.days), fee_amount: String(p.fee), next_due_date: nextDue };
        });
      }
    }
  }

  async function searchCouple(q: string) {
    setCoupleSearch(q);
    if (q.length < 2) { setCoupleResults([]); return; }
    setCoupleSearching(true);
    const res = await apiFetch(`/api/members/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setCoupleResults(data);
    setCoupleSearching(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    console.log("Form submitted. sendWelcome:", sendWelcome, "phone:", form.phone);
    setErr(""); setAdmError(""); setLoading(true);
    
    if (!form.admission_no.trim()) { setErr("Admission No is required"); setLoading(false); return; }
    if (!form.name.trim()) { setErr("Full Name is required"); setLoading(false); return; }
    if (!form.phone.trim() || form.phone === "+91") { setErr("Phone is required"); setLoading(false); return; }
    
    const { data: ex } = await supabase.from("members").select("id").eq("admission_no", form.admission_no).maybeSingle();
    if (ex) { setAdmError("Admission number already exists."); setLoading(false); return; }

    let photo_url: string | null = null;
    if (photo) {
      let uploadFile: Blob | File = photo;
      let filename = photo.name.replace(/[^a-z0-9.]/gi, "_");
      try {
        const compressedBlob = await compressImage(photo);
        const baseName = photo.name.replace(/\.[^/.]+$/, "");
        const cleanBaseName = baseName.replace(/[^a-z0-9]/gi, "_");
        filename = `${cleanBaseName}.jpg`;
        uploadFile = new File([compressedBlob], filename, { type: "image/jpeg" });
      } catch (compressErr) {
        console.error("Error compressing image, uploading original instead:", compressErr);
      }

      const path = `members/${Date.now()}-${filename}`;
      const { error: upErr } = await supabase.storage.from("member-photos").upload(path, uploadFile, { upsert: true });
      if (upErr) { setErr("Photo upload: " + upErr.message); setLoading(false); return; }
      photo_url = supabase.storage.from("member-photos").getPublicUrl(path).data.publicUrl;
    }

    const joinDateStr = form.join_date || getTodayString();
    const dueDateStr = form.next_due_date || addDays(joinDateStr, 30);

    const isCouple = selectedPlan === "couple";
    const baseFee = Number(form.fee_amount || 0);
    const cardioFee = cardio ? 200 : 0;
    const finalFee = baseFee + cardioFee;

    const payload: any = {
      admission_no: form.admission_no, name: form.name, phone: form.phone,
      address: form.address, dob: form.dob || null,
      age: form.age ? Number(form.age) : null, gender: form.gender,
      weight: form.weight ? Number(form.weight) : null, height: form.height ? Number(form.height) : null,
      fee_amount: finalFee, fee_cycle_days: Number(form.fee_cycle_days || 30),
      is_pt_client: form.is_pt_client, notes: form.notes, photo_url,
      join_date: joinDateStr,
      last_payment_date: joinDateStr,
      next_due_date: dueDateStr,
      ...(isCouple && couplePartner ? { couple_partner_id: couplePartner.id, is_couple_main: true } : {}),
    };

    const { data, error } = await supabase.from("members").insert(payload).select("id, name, phone, admission_no, next_due_date, fee_amount, fee_cycle_days, address").single();
    if (error) { setErr(error.message); setLoading(false); return; }

    // Link partner back to this new member
    if (isCouple && couplePartner && data) {
      await supabase.from("members").update({ couple_partner_id: data.id, is_couple_main: false }).eq("id", couplePartner.id);
    }

    // Create initial payment record
    const feeAmt = finalFee;
    const admFee = Number(form.admission_fee || 0);
    const totalPayment = feeAmt + admFee;
    let paymentData: any = null;
    
    if (totalPayment > 0) {
      const { data: payRec } = await supabase.from("payments").insert({
        member_id: data.id,
        amount: totalPayment,
        method: paymentMethod,
        notes: "Initial Membership" + (admFee > 0 ? " + Admission" : "") + (cardio ? " + Cardio" : ""),
        paid_on: joinDateStr
      }).select().single();
      paymentData = payRec;
    }

    // Send WhatsApp in background
    if (sendWelcome && form.phone) {
      const gymName = settings.gym_name || "Lexus Fitness Group";
      let msg = settings.msg_welcome || "Hello {name}, 👋\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today.\n\n— Team {gym_name}";
      
      const expiryDateObj = new Date(dueDateStr);
      const expiry = expiryDateObj.toLocaleDateString("en-IN");
      const paymentMethodStr = paymentMethod === "upi" ? "UPI/QR" : paymentMethod === "card" ? "Card" : paymentMethod === "bank" ? "Bank Transfer" : "Cash";

      msg = msg
        .replace(/{name}/g, form.name)
        .replace(/{gym_name}/g, gymName)
        .replace(/{method}/g, paymentMethodStr);

      if (msg.includes("{amount}") || msg.includes("{expiry}")) {
        msg = msg
          .replace(/{amount}/g, String(totalPayment))
          .replace(/{expiry}/g, expiry);
      } else if (totalPayment > 0) {
        msg += `\n\nWe received ₹${totalPayment} via ${paymentMethodStr}. Check the attached invoice!`;
      }

      try {
        if (paymentData) {
          const doc = generateInvoice(data, { ...paymentData, paid_on: joinDateStr }, { admissionFee: admFee });
          const pdfBlob = doc.output("blob");
          const fd = new FormData();
          fd.append("memberId", data.id); 
          fd.append("body", msg);
          fd.append("document", pdfBlob, `Invoice_${data.admission_no}.pdf`);
          await apiFetch("/api/wa/send", { method: "POST", body: fd });
        } else {
          await apiFetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: data.id, body: msg }) });
        }
      } catch (e: any) {
        console.error("WhatsApp error:", e.message);
      }
    } else if (totalPayment > 0 && !sendWelcome && paymentData) {
      try {
        // Send just the invoice
        const doc = generateInvoice(data, { ...paymentData, paid_on: joinDateStr }, { admissionFee: admFee });
        const pdfBlob = doc.output("blob");
        const fd = new FormData();
        fd.append("memberId", data.id); 
        fd.append("body", `Payment of ₹${totalPayment} received. Invoice attached.`);
        fd.append("document", pdfBlob, `Invoice_${data.admission_no}.pdf`);
        await apiFetch("/api/wa/send", { method: "POST", body: fd });
      } catch (e: any) {
        console.error("Invoice error:", e.message);
      }
    }
    // Send owner notification
    try {
      const paymentMethodStr = paymentMethod === "upi" ? "UPI/QR" : paymentMethod === "card" ? "Card" : paymentMethod === "bank" ? "Bank Transfer" : "Cash";
      await apiFetch("/api/wa/notify-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "admission",
          name: form.name,
          method: paymentMethodStr,
          amount: String(totalPayment)
        })
      });
    } catch (e: any) {
      console.error("Owner notification error:", e.message);
    }
    setLoading(false);
    // Redirect to the new member's detail page
    navigate(`/members/${data.id}`);
  }

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "1.25rem" }}>
        New Member
      </h1>

      <form onSubmit={submit} className="glass" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.85rem" }}>
          <Field label="Admission No *" error={admError}>
            <input required id="new-admission-no" className="input" value={form.admission_no} onChange={e => { upd("admission_no", e.target.value); setAdmError(""); }} />
          </Field>
          <Field label="Full Name *">
            <input required id="new-name" className="input" value={form.name} onChange={e => upd("name", e.target.value)} />
          </Field>
          <Field label="Phone (with country code) *">
            <input required id="new-phone" className="input" placeholder="+919876543210" value={form.phone} onChange={e => upd("phone", e.target.value)} />
          </Field>
          <Field label="Joining Date *">
            <input required id="new-join-date" type="date" className="input" value={form.join_date} onChange={e => upd("join_date", e.target.value)} />
          </Field>
          <Field label="Cycle End Date *">
            <input required id="new-due-date" type="date" className="input" value={form.next_due_date} onChange={e => upd("next_due_date", e.target.value)} />
          </Field>
          <Field label="Date of Birth">
            <input id="new-dob" type="date" className="input" value={form.dob} onChange={e => upd("dob", e.target.value)} />
          </Field>
          <Field label="Age">
            <input id="new-age" type="number" className="input" value={form.age} onChange={e => upd("age", e.target.value)} />
          </Field>
          <Field label="Gender">
            <select id="new-gender" className="input" value={form.gender} onChange={e => upd("gender", e.target.value)}>
              <option value="M">Male</option><option value="F">Female</option><option value="O">Other</option>
            </select>
          </Field>
          <Field label="Weight (kg)">
            <input id="new-weight" type="number" step="0.1" className="input" value={form.weight} onChange={e => upd("weight", e.target.value)} />
          </Field>
          <Field label="Height (cm)">
            <input id="new-height" type="number" step="0.1" className="input" value={form.height} onChange={e => upd("height", e.target.value)} />
          </Field>
          <Field label="Fee (₹)">
            <input id="new-fee" type="number" className="input" value={form.fee_amount} onChange={e => upd("fee_amount", e.target.value)} />
          </Field>
          <Field label="Extra Admission Fee (₹)">
            <input id="new-adm-fee" type="number" className="input" placeholder="e.g. 500" value={form.admission_fee} onChange={e => upd("admission_fee", e.target.value)} />
          </Field>
          <Field label="Payment Method">
            <select id="new-payment-method" className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </Field>
        </div>

        {/* ── Membership Plan Picker ── */}
        <div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.6rem" }}>Membership Plan *</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
            {PLANS.map(p => {
              const selected = selectedPlan === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  id={`plan-${p.id}`}
                  onClick={() => selectPlan(p.id)}
                  style={{
                    border: `2px solid ${selected ? p.color : "var(--border)"}`,
                    borderRadius: "0.75rem",
                    padding: "0.75rem 0.85rem",
                    background: selected ? `rgba(${p.glow.slice(5,-1)},0.12)` : "var(--surface)",
                    boxShadow: selected ? `0 0 14px ${p.glow}` : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: p.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {p.months === 1 ? "1 Month" : `${p.months} Months`}
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: selected ? p.color : "var(--text)" }}>
                    {p.label}
                  </span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: selected ? p.color : "var(--text-muted)" }}>
                    ₹{p.fee.toLocaleString("en-IN")}
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{p.days} days</span>
                </button>
              );
            })}

            {/* Couple Pack card */}
            {(() => {
              const selected = selectedPlan === "couple";
              return (
                <button
                  key="couple"
                  type="button"
                  id="plan-couple"
                  onClick={() => selectPlan("couple")}
                  style={{
                    border: `2px solid ${selected ? "#f43f5e" : "var(--border)"}`,
                    borderRadius: "0.75rem",
                    padding: "0.75rem 0.85rem",
                    background: selected ? "rgba(244,63,94,0.10)" : "var(--surface)",
                    boxShadow: selected ? "0 0 14px rgba(244,63,94,0.35)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.18s ease",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.15rem",
                    gridColumn: "span 2",
                  }}
                >
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#f43f5e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    💑 Couple Pack
                  </span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: selected ? "#f43f5e" : "var(--text)" }}>
                    Custom Duration &amp; Price
                  </span>
                  <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Manual duration · Link a partner account</span>
                </button>
              );
            })()}
          </div>

          {/* Couple Pack: manual fields + partner search */}
          {selectedPlan === "couple" && (
            <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.65rem", border: "1px solid rgba(244,63,94,0.25)", borderRadius: "0.75rem", padding: "1rem", background: "rgba(244,63,94,0.04)" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#f43f5e" }}>💑 Couple Pack Settings</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Duration (days)</span>
                  <input id="couple-days" type="number" className="input" placeholder="e.g. 90" value={form.fee_cycle_days} onChange={e => upd("fee_cycle_days", e.target.value)} />
                </label>
                <label style={{ display: "block" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Price (₹)</span>
                  <input id="couple-fee" type="number" className="input" placeholder="e.g. 1800" value={form.fee_amount} onChange={e => upd("fee_amount", e.target.value)} />
                </label>
              </div>
              {/* Partner search */}
              <div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Link Partner Member (optional)</span>
                {couplePartner ? (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.25)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
                    <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>💑 {couplePartner.name} <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>#{couplePartner.admission_no}</span></span>
                    <button type="button" onClick={() => { setCouplePartner(null); setCoupleSearch(""); }} style={{ background: "none", border: "none", color: "#f43f5e", cursor: "pointer", fontSize: "1rem" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <input
                      id="couple-search"
                      className="input"
                      placeholder="Search by name or phone…"
                      value={coupleSearch}
                      onChange={e => searchCouple(e.target.value)}
                      autoComplete="off"
                    />
                    {coupleSearching && <span style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--text-muted)" }}>…</span>}
                    {coupleResults.length > 0 && (
                      <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.5rem", zIndex: 50, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                        {coupleResults.map((r: any) => (
                          <button key={r.id} type="button"
                            onClick={() => { setCouplePartner({ id: r.id, name: r.name, admission_no: r.admission_no }); setCoupleResults([]); setCoupleSearch(""); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "0.6rem 0.85rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", color: "var(--text)", borderBottom: "1px solid var(--border)" }}
                          >
                            <strong>{r.name}</strong> <span style={{ color: "var(--text-muted)" }}>#{r.admission_no} · {r.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                ℹ️ This member will be the <strong>main account</strong>. Payments recorded here will also apply to the linked partner.
              </div>
            </div>
          )}

          {/* Custom cycle override for non-couple plans */}
          {selectedPlan !== "couple" && (
            <div style={{ marginTop: "0.55rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Custom days:</span>
              <input
                id="new-cycle"
                type="number"
                className="input"
                style={{ maxWidth: "100px", fontSize: "0.875rem", padding: "0.3rem 0.6rem", minHeight: "auto" }}
                value={form.fee_cycle_days}
                onChange={e => upd("fee_cycle_days", e.target.value)}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>Fee: ₹</span>
              <input
                id="new-fee-override"
                type="number"
                className="input"
                style={{ maxWidth: "100px", fontSize: "0.875rem", padding: "0.3rem 0.6rem", minHeight: "auto" }}
                value={form.fee_amount}
                onChange={e => upd("fee_amount", e.target.value)}
              />
            </div>
          )}
        </div>


        <Field label="Address">
          <textarea id="new-address" className="input" rows={2} value={form.address} onChange={e => upd("address", e.target.value)} />
        </Field>
        <Field label="Photo">
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              📷 Camera
              <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
            <label className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              📁 Upload
              <input id="new-photo" type="file" accept="image/*" style={{ display: "none" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {photo && <span style={{ fontSize: "0.8rem", color: "var(--accent)" }}>✓ {photo.name}</span>}
        </Field>
        <Field label="Notes">
          <textarea id="new-notes" className="input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} />
        </Field>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "var(--text)", cursor: "pointer" }}>
            <input id="new-is-pt" type="checkbox" checked={form.is_pt_client} onChange={e => upd("is_pt_client", e.target.checked)} />
            <span>💪 Personal Training client</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "var(--text)", cursor: "pointer" }}>
            <input id="new-has-cardio" type="checkbox" checked={cardio} onChange={e => setCardio(e.target.checked)} />
            <span>🏃 Cardio Included</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "var(--text)", cursor: "pointer" }}>
            <input id="new-send-welcome" type="checkbox" checked={sendWelcome} onChange={e => setSendWelcome(e.target.checked)} />
            <span>💬 Send welcome WhatsApp message</span>
          </label>
        </div>

        {err && (
          <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "0.5rem", padding: "0.6rem 0.9rem", color: "#fb7185", fontSize: "0.85rem" }}>
            ⚠️ {err}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button id="new-member-submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : <><Icon name="check" size={18} /> Save Member</>}
          </button>
          <a href="/members" className="btn btn-ghost" id="new-member-cancel">Cancel</a>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "block", marginBottom: "0.35rem", fontWeight: 500 }}>{label}</span>
      {children}
      {error && <p style={{ color: "#fb7185", fontSize: "0.75rem", marginTop: "0.25rem" }}>{error}</p>}
    </label>
  );
}
