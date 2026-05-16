export type FeeStatus = "overdue" | "due-soon" | "ok" | "none";

export function feeStatus(nextDue: string | null, todayISO?: string): FeeStatus {
  if (!nextDue) return "none";
  const today = todayISO ? new Date(todayISO) : new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(nextDue);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays <= 5) return "due-soon";
  return "ok";
}

export function buildReminderMsg(m: { name: string; fee_amount: number; next_due_date: string | null }) {
  const overdue = m.next_due_date && new Date(m.next_due_date) < new Date();
  if (overdue) {
    return `Hi ${m.name}, your gym fee of ₹${m.fee_amount} was due on ${formatDate(m.next_due_date!)}. Please clear it at the earliest. - Gym`;
  }
  return `Hi ${m.name}, friendly reminder — your gym fee of ₹${m.fee_amount} is due on ${formatDate(m.next_due_date!)}. - Gym`;
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
