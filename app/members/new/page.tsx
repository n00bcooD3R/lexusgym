"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

import { generateInvoice } from "@/lib/pdf-bill";

export default function NewMember() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [admError, setAdmError] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    admission_no: "", name: "", phone: "+91", address: "",
    dob: "", age: "", gender: "M", weight: "", height: "",
    fee_amount: "1000", fee_cycle_days: "30", admission_fee: "",
    is_pt_client: false, notes: ""
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/settings/list");
      const data = await res.json();
      setSettings(data);
    }
    load();
  }, []);

  useEffect(() => {
    async function fetchNextAdm() {
      const sb = createClient();
      const { data } = await sb.from("members").select("admission_no").order("admission_no", { ascending: false }).limit(1);
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
    if (k === "dob") setForm(prev => ({ ...prev, dob: v, age: calcAge(v) }));
    else setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setAdmError(""); setLoading(true);
    const sb = createClient();
    const { data: ex } = await sb.from("members").select("id").eq("admission_no", form.admission_no).maybeSingle();
    if (ex) { setAdmError("Admission number already exists."); setLoading(false); return; }

    let photo_url: string | null = null;
    if (photo) {
      const path = `members/${Date.now()}-${photo.name.replace(/[^a-z0-9.]/gi, "_")}`;
      const { error: upErr } = await sb.storage.from("member-photos").upload(path, photo, { upsert: true });
      if (upErr) { setErr("Photo upload: " + upErr.message); setLoading(false); return; }
      photo_url = sb.storage.from("member-photos").getPublicUrl(path).data.publicUrl;
    }

    const today = new Date();
    const due = new Date(today); due.setDate(due.getDate() + Number(form.fee_cycle_days || 30));
    const payload: any = {
      admission_no: form.admission_no, name: form.name, phone: form.phone,
      address: form.address, dob: form.dob || null,
      age: form.age ? Number(form.age) : null, gender: form.gender,
      weight: form.weight ? Number(form.weight) : null, height: form.height ? Number(form.height) : null,
      fee_amount: Number(form.fee_amount || 0), fee_cycle_days: Number(form.fee_cycle_days || 30),
      is_pt_client: form.is_pt_client, notes: form.notes, photo_url,
      last_payment_date: today.toISOString().slice(0, 10),
      next_due_date: due.toISOString().slice(0, 10)
    };

    const { data, error } = await sb.from("members").insert(payload).select("id, name, phone, admission_no, next_due_date, fee_amount").single();
    if (error) { setErr(error.message); setLoading(false); return; }

    // Create initial payment record
    const feeAmt = Number(form.fee_amount || 0);
    const admFee = Number(form.admission_fee || 0);
    const totalPayment = feeAmt + admFee;
    let paymentData: any = null;
    
    if (totalPayment > 0) {
      const { data: payRec } = await sb.from("payments").insert({
        member_id: data.id,
        amount: totalPayment,
        method: "cash",
        notes: "Initial Membership + Admission",
        paid_on: today.toISOString().slice(0, 10)
      }).select().single();
      paymentData = payRec;
    }

    if (sendWelcome && form.phone) {
      const gymName = settings.gym_name || "Lexus Fitness Group";
      let msg = (settings.msg_welcome || "Hello {name}, 👋\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today. Whether your goal is muscle building, fat loss, strength improvement, endurance, or overall fitness, our team is here to support and guide you every step of the way.\n\nAt {gym_name}, we believe that consistency, discipline, and dedication create real transformation. With our professional training environment, modern equipment, and motivating atmosphere, you now have everything you need to become the strongest version of yourself.\n\nRemember:\n✅ Every workout brings progress\n✅ Every drop of sweat is an investment in yourself\n✅ Small daily efforts create big results over time\n\nWe encourage you to stay committed to your training schedule, maintain proper nutrition, and never give up on your goals. Results take time, but with patience and consistency, success is guaranteed.\n\nIf you need any assistance regarding workouts, diet guidance, membership support, or gym facilities, feel free to contact our team anytime. We are always happy to help.\n\nThank you once again for trusting {gym_name} with your fitness journey.\n\nLet’s train hard, stay focused, and achieve greatness together! 🔥🏋️\n\n— Team {gym_name}")
        .replace(/{name}/g, form.name).replace(/{gym_name}/g, gymName);
      
      if (totalPayment > 0) {
        msg += `\n\nWe received ₹${totalPayment} (₹${feeAmt} Fee` + (admFee > 0 ? ` + ₹${admFee} Admission` : "") + `). Check the attached invoice!`;
      }

      if (paymentData) {
        // Send with invoice
        const doc = generateInvoice(data, { ...paymentData, paid_on: today.toISOString().slice(0, 10) }, { admissionFee: admFee });
        const pdfBlob = doc.output("blob");
        const fd = new FormData();
        fd.append("memberId", data.id); 
        fd.append("body", msg);
        fd.append("document", pdfBlob, `Invoice_${data.admission_no}.pdf`);
        await fetch("/api/wa/send", { method: "POST", body: fd });
      } else {
        // Send without invoice
        await fetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: data.id, body: msg }) });
      }
    }
    setLoading(false);
    router.push(`/members/${data.id}`);
  }

  return (
    <div style={{ maxWidth: "42rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "1.25rem" }}>
        ➕ New Member
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
          <Field label="Monthly Fee (₹)">
            <input id="new-fee" type="number" className="input" value={form.fee_amount} onChange={e => upd("fee_amount", e.target.value)} />
          </Field>
          <Field label="Extra Admission Fee (₹)">
            <input id="new-adm-fee" type="number" className="input" placeholder="e.g. 500" value={form.admission_fee} onChange={e => upd("admission_fee", e.target.value)} />
          </Field>
          <Field label="Fee Cycle (days)">
            <input id="new-cycle" type="number" className="input" value={form.fee_cycle_days} onChange={e => upd("fee_cycle_days", e.target.value)} />
          </Field>
        </div>

        <Field label="Address">
          <textarea id="new-address" className="input" rows={2} value={form.address} onChange={e => upd("address", e.target.value)} />
        </Field>
        <Field label="Photo">
          <input id="new-photo" type="file" accept="image/*" className="input" style={{ paddingTop: "0.5rem" }} onChange={e => setPhoto(e.target.files?.[0] ?? null)} />
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
            {loading ? <><span className="spinner" /> Saving…</> : "✨ Save Member"}
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
