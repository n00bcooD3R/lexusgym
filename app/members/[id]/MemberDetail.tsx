"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { feeStatus, formatDate } from "@/lib/fees";
import { generateInvoice } from "@/lib/pdf-bill";
import { Icon } from "@/components/Icons";

export default function MemberDetail({ member, payments, workouts, diets, messages }: any) {
  const router = useRouter();
  const [tab, setTab] = useState<"info" | "payments" | "workouts" | "diets" | "messages">("info");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const status = feeStatus(member.next_due_date);

  const statusBadgeClass = status === "overdue" ? "badge-overdue" : status === "due-soon" ? "badge-duesoon" : status === "ok" ? "badge-ok" : "";
  const statusDot = status === "overdue" ? "🔴" : status === "due-soon" ? "🟡" : status === "ok" ? "🟢" : "";
  const statusLabel = status === "overdue" ? "OVERDUE" : status === "due-soon" ? "DUE SOON" : status === "ok" ? "PAID" : "NO FEE";

  function getDaysLeft() {
    if (!member.next_due_date) return null;
    return Math.ceil((new Date(member.next_due_date).getTime() - Date.now()) / 86400000);
  }

  async function sendReminder() {
    const daysLeft = getDaysLeft();
    const body = `Hello ${member.name},\n\nYour Lexus Fitness Group membership expires in ${daysLeft} days. 💪\n\n— Team Lexus Fitness Group`;
    const res = await fetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: member.id, body }) });
    const j = await res.json();
    if (j.simulated) {
      alert(`📱 WhatsApp DEMO\n\nTo: ${member.phone}\n${body.substring(0, 100)}...`);
    } else {
      alert(j.ok ? "✓ WhatsApp sent!" : "Failed: " + (j.error || ""));
    }
    router.refresh();
  }

  const TABS = [
    { id: "info", label: "Info", icon: "info" },
    { id: "payments", label: "Payments", icon: "creditCard" },
    ...(member.is_pt_client ? [{ id: "workouts", label: "Workouts", icon: "dumbbell" }, { id: "diets", label: "Diet", icon: "activity" }] : []),
    { id: "messages", label: "Messages", icon: "mail" },
  ];

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
            <span className={`badge ${statusBadgeClass}`} style={{ fontSize: "0.85rem", padding: "0.3rem 0.65rem" }}>{statusDot} {statusLabel}</span>
            {member.is_pt_client && <span className="badge badge-pt" style={{ fontSize: "0.85rem" }}>PT Client</span>}
          </div>
          <div style={{ fontSize: "1rem", color: "var(--text-muted)", marginTop: "0.3rem" }}>
            #{member.admission_no} · {member.phone}
          </div>
          <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
            Next due: {member.next_due_date ? formatDate(member.next_due_date) : "—"} · ₹{member.fee_amount}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button id="send-reminder-btn" onClick={sendReminder} className="btn btn-cyan"><Icon name="send" size={18} /> Reminder</button>
          <a href={`/members/${member.id}/edit`} className="btn btn-ghost" id="edit-member-btn"><Icon name="edit" size={18} /> Edit</a>
          <button id="delete-member-btn" onClick={() => setShowDelete(true)} className="btn btn-danger" style={{ fontSize: "0.85rem", padding: "0.4rem" }}><Icon name="trash" size={18} /> Delete</button>
          {showDelete && (
            <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
              <div style={{ background: "white", padding: "2rem", borderRadius: "1rem", maxWidth: "400px", textAlign: "center" }}>
                <h3 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: 700 }}>Delete Member?</h3>
                <p style={{ marginBottom: "1.5rem", color: "#666" }}>This will permanently delete {member.name} and all their records.</p>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                  <button className="btn btn-ghost" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</button>
                  <button className="btn btn-danger" onClick={async () => {
                    setDeleting(true);
                    const res = await fetch("/api/members/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id }) });
                    const j = await res.json();
                    if (!j.ok) { alert("Delete failed: " + j.error); setDeleting(false); return; }
                    router.push("/members");
                  }} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)} className={`tab ${tab === t.id ? "tab-active" : "tab-idle"}`} id={`detail-tab-${t.id}`} style={{ fontSize: "1rem", padding: "0.6rem 1rem" }}>
            <Icon name={t.icon as any} size={18} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoTab m={member} />}
      {tab === "payments" && <PaymentsTab m={member} payments={payments} />}
      {tab === "workouts" && <WorkoutsTab m={member} workouts={workouts} />}
      {tab === "diets" && <DietsTab m={member} diets={diets} />}
      {tab === "messages" && <MessagesTab messages={messages} />}
    </div>
  );
}

function InfoTab({ m }: any) {
  const rows = [
    ["Address", m.address], ["Age", m.age], ["Gender", m.gender],
    ["Weight (kg)", m.weight], ["Height (cm)", m.height],
    ["Join Date", m.join_date], ["Fee Amount", `₹${m.fee_amount}`],
    ["Fee Cycle", `${m.fee_cycle_days} days`],
    ["Last Payment", m.last_payment_date], ["Next Due", m.next_due_date],
    ["Notes", m.notes],
  ];
  return (
    <div className="glass" style={{ padding: "1.5rem", display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "1.25rem" }}>
      {rows.map(([k, v]) => (
        <div key={k as string} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
          <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500, marginBottom: "0.4rem" }}>{k}</div>
          <div style={{ fontSize: "1.15rem", color: "var(--text)", fontWeight: 600 }}>{v || "—"}</div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab({ m, payments }: any) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(m.fee_amount));
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendWA, setSendWA] = useState(true);
  const [extraCharges, setExtraCharges] = useState({ trainer: 0, diet: 0, admission: 0 });
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterMonth, setFilterMonth] = useState("");

  const filteredPayments = filterMonth ? payments.filter((p: any) => p.paid_on?.startsWith(filterMonth)) : payments;

  async function deletePayment(id: string) {
    if (!confirm("Delete this payment?")) return;
    await createClient().from("payments").delete().eq("id", id);
    router.refresh();
  }

  async function updateDate(id: string, d: string) {
    await createClient().from("payments").update({ paid_on: d }).eq("id", id);
    router.refresh();
  }

async function record() {
    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      const sb = createClient();
      const total = Number(amount) + extraCharges.trainer + extraCharges.diet + extraCharges.admission;
      
      // First insert the payment
      const { data: payment, error } = await sb.from("payments").insert({ 
        member_id: m.id, 
        amount: total, 
        method, 
        notes, 
        paid_on: paymentDate 
      }).select().single();
      
      if (error) {
        alert("Error saving payment: " + error.message);
        setBusy(false);
        return;
      }
      
      // Then update the member's next due date manually to ensure it works
      const paymentDateObj = new Date(paymentDate);
      const nextDue = new Date(paymentDateObj);
      nextDue.setDate(nextDue.getDate() + (m.fee_cycle_days || 30));
      
      await sb.from("members").update({ 
        last_payment_date: paymentDate,
        next_due_date: nextDue.toISOString().slice(0, 10)
      }).eq("id", m.id);
      
      if (sendWA && payment) {
        const doc = generateInvoice(m, { ...payment, paid_on: paymentDate }, { trainerCharges: extraCharges.trainer, dietCharges: extraCharges.diet, admissionFee: extraCharges.admission });
        const pdfBlob = doc.output("blob");
        const expiry = nextDue.toLocaleDateString("en-IN");
        const paymentMethodStr = method === "upi" ? "UPI/QR" : method === "card" ? "Card" : method === "bank" ? "Bank Transfer" : "Cash";
        const msg = `Hello ${m.name}, 👋\n\nYour payment of ₹${total} received through ${paymentMethodStr}.\n\nYour Lexus Gym membership has been successfully renewed! 💪🔥\n\nThank you for continuing your fitness journey with us.\n\n— Team Lexus Gym`;
        const fd = new FormData();
        fd.append("memberId", m.id); fd.append("body", msg);
        fd.append("document", pdfBlob, `Invoice_${m.admission_no}.pdf`);
        await fetch("/api/wa/send", { method: "POST", body: fd });
      }
      
      alert("Payment recorded successfully!");
      router.refresh();
    } catch (err: any) {
      alert("Error: " + (err.message || "Unknown error"));
    }
    setBusy(false);
  }

  function previewInvoice() {
    const doc = generateInvoice(m, { id: "preview", paid_on: paymentDate, amount: Number(amount) + extraCharges.trainer + extraCharges.diet + extraCharges.admission, method }, { trainerCharges: extraCharges.trainer, dietCharges: extraCharges.diet, admissionFee: extraCharges.admission });
    doc.save(`Invoice_${m.admission_no}_preview.pdf`);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass" style={{ padding: "1.5rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>Record Payment</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "0.7rem" }}>
          <input id="pay-date" className="input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} style={{ fontSize: "0.9rem" }} />
          <input id="pay-amount" className="input" type="number" placeholder="Fee" value={amount} onChange={e => setAmount(e.target.value)} style={{ fontSize: "0.9rem" }} />
          <select id="pay-method" className="input" value={method} onChange={e => setMethod(e.target.value)} style={{ fontSize: "0.9rem" }}>
            <option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="bank">Bank Transfer</option>
          </select>
          <input id="pay-notes" className="input" placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} style={{ fontSize: "0.9rem" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.7rem", marginTop: "0.7rem" }}>
          <input id="pay-trainer" className="input" type="number" placeholder="Trainer" value={extraCharges.trainer || ""} onChange={e => setExtraCharges(x => ({ ...x, trainer: Number(e.target.value) || 0 }))} style={{ fontSize: "0.9rem" }} />
          <input id="pay-diet" className="input" type="number" placeholder="Diet" value={extraCharges.diet || ""} onChange={e => setExtraCharges(x => ({ ...x, diet: Number(e.target.value) || 0 }))} style={{ fontSize: "0.9rem" }} />
          <input id="pay-admission" className="input" type="number" placeholder="Admission" value={extraCharges.admission || ""} onChange={e => setExtraCharges(x => ({ ...x, admission: Number(e.target.value) || 0 }))} style={{ fontSize: "0.9rem" }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", marginTop: "0.7rem", cursor: "pointer" }}>
          <input id="pay-send-wa" type="checkbox" checked={sendWA} onChange={e => setSendWA(e.target.checked)} />
          Send WhatsApp
        </label>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem", flexWrap: "wrap" }}>
          <button id="pay-record-btn" onClick={record} className="btn btn-primary" disabled={busy} style={{ fontSize: "0.9rem", padding: "0.6rem 1rem" }}>
            {busy ? <><span className="spinner" /> Saving…</> : <><Icon name="check" size={16} /> Record</>}
          </button>
          <button id="pay-preview-btn" onClick={previewInvoice} className="btn btn-ghost" style={{ fontSize: "0.9rem", padding: "0.6rem 1rem" }}><Icon name="eye" size={16} /> Preview</button>
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
                <span style={{ color: "var(--text-muted)" }}>{p.method}</span>
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

function WorkoutsTab({ m, workouts }: any) {
  const router = useRouter();
  const [label, setLabel] = useState("Day 1");
  const [rows, setRows] = useState([{ name: "", sets: "", reps: "", notes: "" }]);

  async function save() {
    const sb = createClient();
    const clean = rows.filter(r => r.name.trim());
    if (!clean.length) return;
    const { error } = await sb.from("workouts").insert({ member_id: m.id, day_label: label, exercises: clean });
    if (error) { alert(error.message); return; }
    router.refresh(); setRows([{ name: "", sets: "", reps: "", notes: "" }]);
  }

  async function del(id: string) {
    if (!confirm("Delete workout?")) return;
    await createClient().from("workouts").delete().eq("id", id);
    router.refresh();
  }

  async function sendPlan() {
    const text = workouts.map((w: any) => {
      const ex = (w.exercises || []).map((e: any) => `• ${e.name} — ${e.sets || "?"}x${e.reps || "?"}${e.notes ? " (" + e.notes + ")" : ""}`).join("\n");
      return `*${w.day_label}*\n${ex}`;
    }).join("\n\n");
    await fetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: m.id, body: `Hi ${m.name}, here's your workout plan:\n\n${text}` }) });
    alert("Sent ✓");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="glass" style={{ padding: "1.25rem" }}>
        <h3 style={{ fontWeight: 700, marginBottom: "1rem", fontSize: "1rem" }}>🏋️ Add Workout Day</h3>
        <input id="workout-label" className="input" style={{ marginBottom: "0.75rem" }} placeholder="Day label (e.g. Mon - Push)" value={label} onChange={e => setLabel(e.target.value)} />
        {rows.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "0.5rem", marginBottom: "0.5rem" }}>
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

function DietsTab({ m, diets }: any) {
  const router = useRouter();
  const [label, setLabel] = useState("Breakfast");
  const [rows, setRows] = useState([{ food: "", qty: "", calories: "" }]);
  const [notes, setNotes] = useState("");

  async function save() {
    const sb = createClient();
    const clean = rows.filter(r => r.food.trim());
    if (!clean.length) return;
    const { error } = await sb.from("diets").insert({ member_id: m.id, meal_label: label, items: clean, notes });
    if (error) { alert(error.message); return; }
    router.refresh(); setRows([{ food: "", qty: "", calories: "" }]); setNotes("");
  }

  async function del(id: string) {
    if (!confirm("Delete meal?")) return;
    await createClient().from("diets").delete().eq("id", id);
    router.refresh();
  }

  async function sendDiet() {
    const text = diets.map((d: any) => {
      const items = (d.items || []).map((it: any) => `• ${it.food} — ${it.qty}${it.calories ? " (" + it.calories + " kcal)" : ""}`).join("\n");
      return `*${d.meal_label}*\n${items}${d.notes ? "\n_" + d.notes + "_" : ""}`;
    }).join("\n\n");
    await fetch("/api/wa/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId: m.id, body: `Hi ${m.name}, here's your diet plan:\n\n${text}` }) });
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

function MessagesTab({ messages }: any) {
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
