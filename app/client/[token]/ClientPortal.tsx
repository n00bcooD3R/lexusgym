"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type Exercise = { name: string; sets: string; reps: string; weight: string; rest: string; notes: string };
type WorkoutDay = { id: string; day_number: number; day_label: string; exercises: Exercise[]; notes: string };
type DietItem = { food: string; qty: string; calories: string; protein: string; carbs: string; fat: string };
type DietMeal = { id: string; meal_label: string; items: DietItem[]; meal_order: number; notes: string };
type DiaryEntry = { time: string; food: string; qty: string; calories: string; notes: string };
type DiaryRow = { id?: string; diary_date: string; entries: DiaryEntry[]; mood: string; water_ml: number; notes: string };

const MOODS = [
  { val: "great", emoji: "🔥", label: "Great" },
  { val: "good", emoji: "💪", label: "Good" },
  { val: "okay", emoji: "😐", label: "Okay" },
  { val: "tired", emoji: "😴", label: "Tired" },
];

function todayStr() { return new Date().toISOString().split("T")[0]; }
function blankDiary(): DiaryRow { return { diary_date: todayStr(), entries: [], mood: "good", water_ml: 0, notes: "" }; }
function blankEntry(): DiaryEntry { return { time: "", food: "", qty: "", calories: "", notes: "" }; }

// ─── WORKOUT VIEW ──────────────────────────────────────────────────────────────
function WorkoutView({ days }: { days: WorkoutDay[] }) {
  const [activeDay, setActiveDay] = useState(0);
  const day = days[activeDay];

  if (days.length === 0) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "3rem" }}>📋</div>
      <p>Your trainer hasn't added your workout plan yet.</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Day pills */}
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        {days.map((d, i) => (
          <button key={i} onClick={() => setActiveDay(i)}
            style={{ padding: "0.4rem 0.9rem", borderRadius: "9999px", border: "1px solid", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif", transition: "all 0.2s",
              background: activeDay === i ? "linear-gradient(135deg,var(--accent),#6d28d9)" : "var(--surface)",
              borderColor: activeDay === i ? "var(--accent)" : "var(--border)",
              color: activeDay === i ? "white" : "var(--text-muted)" }}>
            Day {d.day_number}
          </button>
        ))}
      </div>

      {day && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--accent)" }}>{day.day_label}</div>
          {day.notes && <div style={{ color: "var(--text-muted)", fontSize: "0.875rem", fontStyle: "italic" }}>{day.notes}</div>}
          {day.exercises.map((ex, i) => (
            <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.85rem", padding: "1rem", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(to bottom,var(--accent),var(--accent2))" }} />
              <div style={{ paddingLeft: "0.75rem" }}>
                <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.5rem" }}>{i + 1}. {ex.name || "—"}</div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {[["Sets", ex.sets], ["Reps", ex.reps], ["Weight", ex.weight || "Bodyweight"], ["Rest", ex.rest]].map(([label, val]) => (
                    <div key={label} style={{ textAlign: "center", minWidth: 60 }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent)" }}>{val}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                    </div>
                  ))}
                </div>
                {ex.notes && <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>📝 {ex.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DIET VIEW ─────────────────────────────────────────────────────────────────
function DietView({ meals }: { meals: DietMeal[] }) {
  if (meals.length === 0) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "3rem" }}>🥗</div>
      <p>Your trainer hasn't added your diet plan yet.</p>
    </div>
  );

  const totalCals = meals.reduce((sum, m) => sum + m.items.reduce((s, it) => s + (parseInt(it.calories) || 0), 0), 0);
  const totalProt = meals.reduce((sum, m) => sum + m.items.reduce((s, it) => s + (parseInt(it.protein) || 0), 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Summary bar */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        {[["🔥 Total Calories", `${totalCals} kcal`, "#f59e0b"], ["💪 Protein", `${totalProt}g`, "#a78bfa"], ["🍽️ Meals", `${meals.length}`, "#34d399"]].map(([label, val, color]) => (
          <div key={label} style={{ flex: 1, minWidth: 100, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "0.75rem 1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: color as string }}>{val}</div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{label}</div>
          </div>
        ))}
      </div>

      {meals.map((meal, mi) => (
        <div key={mi} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--accent2)" }}>🍽️ {meal.meal_label}</div>
          {meal.items.filter(it => it.food).map((it, ii) => (
            <div key={ii} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0", borderTop: ii === 0 ? "none" : "1px solid var(--border)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{it.food}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{it.qty}</div>
              </div>
              <div style={{ textAlign: "right", fontSize: "0.8rem" }}>
                {it.calories && <div style={{ color: "#f59e0b", fontWeight: 700 }}>{it.calories} kcal</div>}
                {(it.protein || it.carbs || it.fat) && (
                  <div style={{ color: "var(--text-muted)" }}>P:{it.protein}g C:{it.carbs}g F:{it.fat}g</div>
                )}
              </div>
            </div>
          ))}
          {meal.notes && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>📝 {meal.notes}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── FOOD DIARY ────────────────────────────────────────────────────────────────
function FoodDiary({ memberId }: { memberId: string }) {
  const sb = createClient();
  const [diary, setDiary] = useState<DiaryRow>(blankDiary());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const today = todayStr();
    sb.from("food_diary").select("*").eq("member_id", memberId).eq("diary_date", today).single()
      .then(({ data }) => {
        if (data) setDiary({ ...data, entries: data.entries ?? [] });
        else setDiary({ ...blankDiary(), entries: [] });
      });
  }, [memberId]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const save = async () => {
    setSaving(true);
    const payload = { member_id: memberId, diary_date: diary.diary_date, entries: diary.entries, mood: diary.mood, water_ml: diary.water_ml, notes: diary.notes };
    const { error } = diary.id
      ? await sb.from("food_diary").update(payload).eq("id", diary.id)
      : await sb.from("food_diary").upsert(payload, { onConflict: "member_id,diary_date" });
    setSaving(false);
    if (!error) showToast("Diary saved ✓"); else showToast("Error: " + error.message);
  };

  const setEntry = (i: number, updates: Partial<DiaryEntry>) =>
    setDiary(d => ({ ...d, entries: d.entries.map((e, j) => j === i ? { ...e, ...updates } : e) }));
  const addEntry = () => setDiary(d => ({ ...d, entries: [...d.entries, blankEntry()] }));
  const removeEntry = (i: number) => setDiary(d => ({ ...d, entries: d.entries.filter((_, j) => j !== i) }));

  const totalCals = diary.entries.reduce((s, e) => s + (parseInt(e.calories) || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ fontWeight: 700, color: "var(--text-muted)", fontSize: "0.875rem" }}>📅 {new Date(diary.diary_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>

      {/* Mood */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>How are you feeling today?</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {MOODS.map(m => (
            <button key={m.val} onClick={() => setDiary(d => ({ ...d, mood: m.val }))}
              style={{ padding: "0.4rem 0.85rem", borderRadius: "9999px", border: "1px solid", cursor: "pointer", fontSize: "0.85rem", fontFamily: "Outfit,sans-serif", transition: "all 0.2s",
                background: diary.mood === m.val ? "rgba(139,92,246,0.2)" : "var(--surface)",
                borderColor: diary.mood === m.val ? "var(--accent)" : "var(--border)",
                color: diary.mood === m.val ? "#a78bfa" : "var(--text-muted)" }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Water */}
      <div className="card" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <span style={{ fontSize: "1.5rem" }}>💧</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Water Intake</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target: 3000 ml</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={() => setDiary(d => ({ ...d, water_ml: Math.max(0, d.water_ml - 250) }))}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "1.2rem", color: "var(--text)" }}>−</button>
          <span style={{ fontWeight: 700, fontSize: "1.1rem", minWidth: 60, textAlign: "center", color: "var(--accent2)" }}>{diary.water_ml} ml</span>
          <button onClick={() => setDiary(d => ({ ...d, water_ml: d.water_ml + 250 }))}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--border)", cursor: "pointer", fontSize: "1.2rem", color: "var(--text)" }}>+</button>
        </div>
      </div>

      {/* Food entries */}
      <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", justifyContent: "space-between" }}>
        <span>🍴 What did you eat today?</span>
        {totalCals > 0 && <span style={{ color: "#f59e0b" }}>{totalCals} kcal total</span>}
      </div>

      {diary.entries.map((en, i) => (
        <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.75rem", padding: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--accent)" }}>Entry {i + 1}</span>
            <button onClick={() => removeEntry(i)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px 80px", gap: "0.4rem" }}>
            <input className="input" style={{ fontSize: "0.85rem", minHeight: 36 }} placeholder="Time" value={en.time} onChange={e => setEntry(i, { time: e.target.value })} />
            <input className="input" style={{ fontSize: "0.85rem", minHeight: 36 }} placeholder="Food / meal" value={en.food} onChange={e => setEntry(i, { food: e.target.value })} />
            <input className="input" style={{ fontSize: "0.85rem", minHeight: 36 }} placeholder="Qty" value={en.qty} onChange={e => setEntry(i, { qty: e.target.value })} />
            <input className="input" style={{ fontSize: "0.85rem", minHeight: 36 }} placeholder="kcal" value={en.calories} onChange={e => setEntry(i, { calories: e.target.value })} />
          </div>
          <input className="input" style={{ fontSize: "0.8rem", minHeight: 32, marginTop: "0.4rem" }} placeholder="Notes (optional)" value={en.notes} onChange={e => setEntry(i, { notes: e.target.value })} />
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button onClick={addEntry} className="btn btn-ghost" style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", minHeight: 38 }}>+ Add Entry</button>
        <button onClick={save} className="btn btn-primary" disabled={saving} style={{ fontSize: "0.875rem", padding: "0.5rem 1.25rem", minHeight: 38 }}>
          {saving ? "Saving…" : "💾 Save Diary"}
        </button>
      </div>

      <textarea className="input" style={{ minHeight: 70, fontSize: "0.9rem", resize: "vertical" }} placeholder="Daily notes, how training felt, any issues…" value={diary.notes} onChange={e => setDiary(d => ({ ...d, notes: e.target.value }))} />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ─── MAIN CLIENT PORTAL ────────────────────────────────────────────────────────
export default function ClientPortal({ member, workoutDays, dietMeals, token }: {
  member: { id: string; name: string; photo_url: string | null; admission_no: string };
  workoutDays: WorkoutDay[];
  dietMeals: DietMeal[];
  token: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"workout" | "diet" | "diary">("workout");
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/pt/logout", { method: "POST" });
    router.push("/client/login");
  }

  const tabs = [
    { key: "workout" as const, emoji: "💪", label: "Workout" },
    { key: "diet" as const, emoji: "🥗", label: "Diet Plan" },
    { key: "diary" as const, emoji: "📓", label: "Food Diary" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Outfit,sans-serif", paddingBottom: "5rem" }}>
      {/* Header */}
      <div style={{ background: "rgba(10,10,26,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)", padding: "0.75rem 1rem", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: "42rem", margin: "0 auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {member.photo_url
            ? <img src={member.photo_url} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", border: "2px solid var(--accent)" }} />
            : <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--accent),var(--accent2))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: "1rem", flexShrink: 0 }}>{member.name.charAt(0)}</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>
            <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Lexus Fitness · PT Client</div>
          </div>
          <button onClick={logout} disabled={loggingOut}
            style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "#fb7185", borderRadius: "0.5rem", padding: "0.35rem 0.75rem", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", fontFamily: "Outfit,sans-serif", flexShrink: 0 }}>
            {loggingOut ? "…" : "🚪 Logout"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "1rem 1rem 0" }}>
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "0.875rem", padding: "0.3rem", gap: "0.25rem" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: "0.6rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", fontFamily: "Outfit,sans-serif", fontWeight: 600, fontSize: "0.85rem", transition: "all 0.2s",
                background: tab === t.key ? "linear-gradient(135deg,var(--accent),#6d28d9)" : "transparent",
                color: tab === t.key ? "white" : "var(--text-muted)" }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "42rem", margin: "0 auto", padding: "1rem" }}>
        {tab === "workout" && <WorkoutView days={workoutDays} />}
        {tab === "diet" && <DietView meals={dietMeals} />}
        {tab === "diary" && <FoodDiary memberId={member.id} />}
      </div>
    </div>
  );
}
