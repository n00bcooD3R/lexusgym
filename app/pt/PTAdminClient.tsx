"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase-client";
import Link from "next/link";
import { feeStatus } from "@/lib/fees";

type Exercise = { name: string; sets: string; reps: string; weight: string; rest: string; notes: string };
type WorkoutDay = { id?: string; day_number: number; day_label: string; exercises: Exercise[]; notes: string };
type DietItem = { food: string; qty: string; calories: string; protein: string; carbs: string; fat: string };
type DietMeal = { id?: string; meal_label: string; items: DietItem[]; meal_order: number; notes: string };

const DAY_DEFAULTS = [
  { day_number: 1, day_label: "Day 1 – Chest & Triceps" },
  { day_number: 2, day_label: "Day 2 – Back & Biceps" },
  { day_number: 3, day_label: "Day 3 – Legs & Glutes" },
  { day_number: 4, day_label: "Day 4 – Shoulders & Arms" },
  { day_number: 5, day_label: "Day 5 – Core & Cardio" },
];

const MEAL_DEFAULTS = ["Breakfast", "Mid-Morning Snack", "Lunch", "Pre-Workout", "Post-Workout", "Dinner"];

function blankExercise(): Exercise { return { name: "", sets: "3", reps: "10", weight: "", rest: "60s", notes: "" }; }
function blankItem(): DietItem { return { food: "", qty: "", calories: "", protein: "", carbs: "", fat: "" }; }
function blankDay(day_number: number, day_label: string): WorkoutDay { return { day_number, day_label, exercises: [blankExercise()], notes: "" }; }
function blankMeal(label: string, order: number): DietMeal { return { meal_label: label, items: [blankItem()], meal_order: order, notes: "" }; }

// ─── WORKOUT EDITOR ────────────────────────────────────────────────────────────
function WorkoutEditor({ memberId }: { memberId: string }) {
  const sb = createClient();
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    sb.from("workout_plans").select("*").eq("member_id", memberId).order("day_number")
      .then(({ data }) => {
        const existing = data ?? [];
        const merged = DAY_DEFAULTS.map(d => {
          const found = existing.find((e: any) => e.day_number === d.day_number);
          if (found) return { ...found, exercises: found.exercises ?? [blankExercise()] };
          return blankDay(d.day_number, d.day_label);
        });
        setDays(merged);
      });
  }, [memberId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const saveDay = async (day: WorkoutDay) => {
    setSaving(true);
    const payload = { member_id: memberId, day_number: day.day_number, day_label: day.day_label, exercises: day.exercises, notes: day.notes };
    const { error } = day.id
      ? await sb.from("workout_plans").update(payload).eq("id", day.id)
      : await sb.from("workout_plans").upsert({ ...payload }, { onConflict: "member_id,day_number" }).select().single();
    setSaving(false);
    if (!error) { showToast("Workout saved ✓"); }
    else showToast("Error: " + error.message);
  };

  const updateDay = (idx: number, updates: Partial<WorkoutDay>) => setDays(d => d.map((x, i) => i === idx ? { ...x, ...updates } : x));
  const updateExercise = (dayIdx: number, exIdx: number, updates: Partial<Exercise>) =>
    setDays(d => d.map((x, i) => i === dayIdx ? { ...x, exercises: x.exercises.map((e, j) => j === exIdx ? { ...e, ...updates } : e) } : x));
  const addExercise = (dayIdx: number) => setDays(d => d.map((x, i) => i === dayIdx ? { ...x, exercises: [...x.exercises, blankExercise()] } : x));
  const removeExercise = (dayIdx: number, exIdx: number) => setDays(d => d.map((x, i) => i === dayIdx ? { ...x, exercises: x.exercises.filter((_, j) => j !== exIdx) } : x));

  const day = days[activeDay];

  return (
    <div>
      {/* Day Tabs */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {days.map((d, i) => (
          <button key={i} onClick={() => setActiveDay(i)}
            style={{ padding: "0.4rem 0.85rem", borderRadius: "0.6rem", border: "1px solid", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif",
              background: activeDay === i ? "rgba(139,92,246,0.2)" : "var(--surface)",
              borderColor: activeDay === i ? "var(--accent)" : "var(--border)",
              color: activeDay === i ? "#a78bfa" : "var(--text-muted)" }}>
            Day {d.day_number}
          </button>
        ))}
      </div>

      {day && (
        <div className="card" style={{ gap: "1rem", display: "flex", flexDirection: "column" }}>
          <input className="input" style={{ fontSize: "1rem", minHeight: 40 }} value={day.day_label}
            onChange={e => updateDay(activeDay, { day_label: e.target.value })} placeholder="Day label e.g. Day 1 – Push" />

          {/* Exercises */}
          {day.exercises.map((ex, ei) => (
            <div key={ei} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--accent)" }}>Exercise {ei + 1}</span>
                {day.exercises.length > 1 && <button onClick={() => removeExercise(activeDay, ei)} style={{ background: "rgba(244,63,94,0.15)", color: "#fb7185", border: "none", borderRadius: "0.4rem", padding: "0.2rem 0.5rem", cursor: "pointer", fontSize: "0.75rem" }}>✕</button>}
              </div>
              <div className="exercise-grid">
                <input className="input" style={{ fontSize: "0.9rem", minHeight: 38 }} placeholder="Exercise name" value={ex.name} onChange={e => updateExercise(activeDay, ei, { name: e.target.value })} />
                <input className="input" style={{ fontSize: "0.9rem", minHeight: 38 }} placeholder="Sets" value={ex.sets} onChange={e => updateExercise(activeDay, ei, { sets: e.target.value })} />
                <input className="input" style={{ fontSize: "0.9rem", minHeight: 38 }} placeholder="Reps" value={ex.reps} onChange={e => updateExercise(activeDay, ei, { reps: e.target.value })} />
                <input className="input" style={{ fontSize: "0.9rem", minHeight: 38 }} placeholder="Weight" value={ex.weight} onChange={e => updateExercise(activeDay, ei, { weight: e.target.value })} />
                <input className="input" style={{ fontSize: "0.9rem", minHeight: 38 }} placeholder="Rest" value={ex.rest} onChange={e => updateExercise(activeDay, ei, { rest: e.target.value })} />
              </div>
              <input className="input" style={{ fontSize: "0.85rem", minHeight: 34, marginTop: "0.5rem" }} placeholder="Notes (optional)" value={ex.notes} onChange={e => updateExercise(activeDay, ei, { notes: e.target.value })} />
            </div>
          ))}

          <button onClick={() => addExercise(activeDay)} className="btn btn-ghost" style={{ alignSelf: "flex-start", fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 36 }}>
            + Add Exercise
          </button>
          <textarea className="input" style={{ minHeight: 60, fontSize: "0.9rem", resize: "vertical" }} placeholder="Day notes (optional)" value={day.notes} onChange={e => updateDay(activeDay, { notes: e.target.value })} />
          <button onClick={() => saveDay(day)} className="btn btn-primary" disabled={saving} style={{ fontSize: "0.95rem", padding: "0.65rem 1.5rem", minHeight: 40, alignSelf: "flex-start" }}>
            {saving ? "Saving…" : "Save Day " + day.day_number}
          </button>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── DIET EDITOR ───────────────────────────────────────────────────────────────
function DietEditor({ memberId }: { memberId: string }) {
  const sb = createClient();
  const [meals, setMeals] = useState<DietMeal[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [newMealLabel, setNewMealLabel] = useState("");

  useEffect(() => {
    sb.from("diet_plans").select("*").eq("member_id", memberId).order("meal_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setMeals(data.map((m: any) => ({ ...m, items: m.items ?? [blankItem()] })));
        } else {
          setMeals(MEAL_DEFAULTS.map((l, i) => blankMeal(l, i)));
        }
      });
  }, [memberId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const saveMeal = async (meal: DietMeal, idx: number) => {
    setSaving(String(idx));
    const payload = { member_id: memberId, meal_label: meal.meal_label, items: meal.items, meal_order: meal.meal_order, notes: meal.notes };
    const { data, error } = meal.id
      ? await sb.from("diet_plans").update(payload).eq("id", meal.id).select().single()
      : await sb.from("diet_plans").insert(payload).select().single();
    if (!error && data) setMeals(m => m.map((x, i) => i === idx ? { ...x, id: data.id } : x));
    setSaving(null);
    if (!error) showToast("Meal saved ✓"); else showToast("Error: " + error.message);
  };

  const deleteMeal = async (meal: DietMeal, idx: number) => {
    if (meal.id) await sb.from("diet_plans").delete().eq("id", meal.id);
    setMeals(m => m.filter((_, i) => i !== idx));
  };

  const updateMeal = (idx: number, updates: Partial<DietMeal>) => setMeals(m => m.map((x, i) => i === idx ? { ...x, ...updates } : x));
  const updateItem = (mIdx: number, iIdx: number, updates: Partial<DietItem>) =>
    setMeals(m => m.map((x, i) => i === mIdx ? { ...x, items: x.items.map((it, j) => j === iIdx ? { ...it, ...updates } : it) } : x));
  const addItem = (mIdx: number) => setMeals(m => m.map((x, i) => i === mIdx ? { ...x, items: [...x.items, blankItem()] } : x));
  const removeItem = (mIdx: number, iIdx: number) => setMeals(m => m.map((x, i) => i === mIdx ? { ...x, items: x.items.filter((_, j) => j !== iIdx) } : x));
  const addMeal = () => {
    const label = newMealLabel.trim() || "New Meal";
    setMeals(m => [...m, blankMeal(label, m.length)]);
    setNewMealLabel("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {meals.map((meal, mi) => (
        <div key={mi} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <input className="input" style={{ fontSize: "1rem", minHeight: 38, flex: 1, marginRight: "0.5rem" }} value={meal.meal_label}
              onChange={e => updateMeal(mi, { meal_label: e.target.value })} placeholder="Meal name" />
            <button onClick={() => deleteMeal(meal, mi)} style={{ background: "rgba(244,63,94,0.15)", color: "#fb7185", border: "none", borderRadius: "0.4rem", padding: "0.3rem 0.6rem", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 }}>✕</button>
          </div>
          <div className="diet-header-grid">
            <span>Food</span><span>Qty</span><span>Calories</span><span>Protein</span><span>Carbs</span><span>Fat</span>
          </div>
          {meal.items.map((it, ii) => (
            <div key={ii} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
              <div className="diet-items-grid">
                <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="Food" value={it.food} onChange={e => updateItem(mi, ii, { food: e.target.value })} />
                <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="e.g. 100g" value={it.qty} onChange={e => updateItem(mi, ii, { qty: e.target.value })} />
                <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="kcal" value={it.calories} onChange={e => updateItem(mi, ii, { calories: e.target.value })} />
                <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="g" value={it.protein} onChange={e => updateItem(mi, ii, { protein: e.target.value })} />
                <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="g" value={it.carbs} onChange={e => updateItem(mi, ii, { carbs: e.target.value })} />
                <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="g" value={it.fat} onChange={e => updateItem(mi, ii, { fat: e.target.value })} />
              </div>
              {meal.items.length > 1 && <button onClick={() => removeItem(mi, ii)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>✕</button>}
            </div>
          ))}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => addItem(mi)} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", minHeight: 32 }}>+ Food Item</button>
            <button onClick={() => saveMeal(meal, mi)} className="btn btn-success" disabled={saving === String(mi)} style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", minHeight: 32 }}>
              {saving === String(mi) ? "Saving…" : "Save Meal"}
            </button>
          </div>
          <input className="input" style={{ fontSize: "0.85rem", minHeight: 34 }} placeholder="Meal notes" value={meal.notes} onChange={e => updateMeal(mi, { notes: e.target.value })} />
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input className="input" style={{ fontSize: "0.9rem", minHeight: 38 }} placeholder="New meal name…" value={newMealLabel} onChange={e => setNewMealLabel(e.target.value)} />
        <button onClick={addMeal} className="btn btn-cyan" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 38, whiteSpace: "nowrap" }}>+ Add Meal</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── CLIENT DETAIL PANEL ───────────────────────────────────────────────────────
function PTClientDetail({ member, onBack }: { member: any; onBack: () => void }) {
  const sb = createClient();
  const [tab, setTab] = useState<"workout" | "diet" | "portal">("workout");
  const [token, setToken] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    sb.from("client_tokens").select("token").eq("member_id", member.id).single()
      .then(({ data }) => { if (data) setToken(data.token); });
  }, [member.id]);

  const generateToken = async () => {
    setGenLoading(true);
    const { data, error } = await sb.from("client_tokens")
      .upsert({ member_id: member.id }, { onConflict: "member_id" })
      .select("token").single();
    if (data) setToken(data.token);
    setGenLoading(false);
  };

  const clientUrl = token ? `${window.location.origin}/client/${token}` : null;

  const copyUrl = () => {
    if (clientUrl) { navigator.clipboard.writeText(clientUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const tabs: { key: "workout" | "diet" | "portal"; label: string; emoji: string }[] = [
    { key: "workout", label: "Workout Plan", emoji: "💪" },
    { key: "diet", label: "Diet Plan", emoji: "🥗" },
    { key: "portal", label: "Client Portal", emoji: "🔗" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Back + Member Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding: "0.4rem 0.8rem", fontSize: "0.875rem", minHeight: 36 }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
          {member.photo_url
            ? <img src={member.photo_url} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
            : <div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: "1.1rem" }}>{member.name.charAt(0)}</div>}
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>{member.name}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>#{member.admission_no} · {member.phone}</div>
          </div>
        </div>
        <Link href={`/members/${member.id}`} className="btn btn-ghost" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem", minHeight: 34 }}>View Profile</Link>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: "0.4rem", borderBottom: "1px solid var(--border)", paddingBottom: "0" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`tab ${tab === t.key ? "tab-active" : "tab-idle"}`}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {tab === "workout" && <WorkoutEditor memberId={member.id} />}
      {tab === "diet" && <DietEditor memberId={member.id} />}
      {tab === "portal" && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>🔗 Client Portal Access</div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
            Generate a unique link for <strong style={{ color: "var(--text)" }}>{member.name}</strong> to view their workout plan, diet plan, and log their food diary.
          </p>
          {token ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.6rem", padding: "0.75rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "var(--accent2)", wordBreak: "break-all" }}>
                {clientUrl}
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button onClick={copyUrl} className="btn btn-primary" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 36 }}>
                  {copied ? "✓ Copied!" : "📋 Copy Link"}
                </button>
                <a href={clientUrl!} target="_blank" className="btn btn-ghost" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 36 }}>
                  🔍 Preview
                </a>
                <button onClick={generateToken} className="btn btn-ghost" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 36 }}>
                  🔄 Regenerate
                </button>
              </div>
            </div>
          ) : (
            <button onClick={generateToken} className="btn btn-primary" disabled={genLoading} style={{ alignSelf: "flex-start" }}>
              {genLoading ? "Generating…" : "🔑 Generate Client Link"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PT ADMIN CLIENT ──────────────────────────────────────────────────────
export default function PTAdminClient({ members }: { members: any[] }) {
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.admission_no.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) return <PTClientDetail member={selected} onBack={() => setSelected(null)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, background: "linear-gradient(135deg,#a78bfa,#67e8f9)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
          💪 PT Clients ({members.length})
        </h1>
        <Link href="/members" className="btn btn-ghost" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 36 }}>All Members</Link>
      </div>

      <input className="input" placeholder="Search PT clients…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: "1rem", minHeight: 44 }} />

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🏋️</div>
            {members.length === 0 ? "No PT clients yet. Mark members as PT clients in their profile." : "No results."}
          </div>
        )}
        <div className="divide-glass">
          {filtered.map(m => {
            const s = feeStatus(m.next_due_date, undefined, m.is_staff);
            return (
              <button key={m.id} onClick={() => setSelected(m)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.85rem 1rem" }}>
                  {m.photo_url
                    ? <img src={m.photo_url} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
                    : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white" }}>{m.name.charAt(0)}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: s === "staff" ? "#a78bfa" : s === "overdue" ? "#fb7185" : s === "due-soon" ? "#fbbf24" : "var(--text)" }}>{m.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>#{m.admission_no} · {m.phone}</div>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginRight: "0.5rem" }}>
                    {s === "overdue" ? "🔴 Overdue" : s === "due-soon" ? "🟡 Due soon" : s === "staff" ? "💜 Staff" : "🟢 Active"}
                  </span>
                  <span style={{ color: "var(--text-muted)", fontSize: "1rem" }}>›</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
