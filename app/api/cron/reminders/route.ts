// Auto reminders. Triggered by Vercel Cron (free).
// Sends to members whose next_due_date is 4, 3, 2, 1 days away, or overdue
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { sendWhatsApp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";


const REMINDER_MSG = `Hello {name},

This is a friendly reminder that your Lexus Fitness Group membership will expire in {days} days. 💪

To continue enjoying uninterrupted access to the gym and your fitness journey, please renew your membership before the expiry date.

For renewal assistance, feel free to contact our team anytime.

— Team Lexus Fitness Group`;

const EXPIRED_MSG = `Hello {name},

Your Lexus Fitness Group membership has expired. 😔

Please renew your membership at the earliest to continue your fitness journey.

For renewal assistance, feel free to contact our team anytime.

— Team Lexus Fitness Group`;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauth" }, { status: 401 });
  }

  const sb = createAdminClient();
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const todayStr = iso(today);
  const in1 = new Date(today); in1.setDate(in1.getDate() + 1); const in1Str = iso(in1);
  const in2 = new Date(today); in2.setDate(in2.getDate() + 2); const in2Str = iso(in2);
  const in3 = new Date(today); in3.setDate(in3.getDate() + 3); const in3Str = iso(in3);
  const in4 = new Date(today); in4.setDate(in4.getDate() + 4); const in4Str = iso(in4);
  const overdueDate = new Date(today); overdueDate.setDate(overdueDate.getDate() - 1); const overdueStr = iso(overdueDate);

  const { data: members } = await sb
    .from("members")
    .select("id, name, phone, fee_amount, next_due_date, active")
    .eq("active", true)
    .or(`next_due_date.eq.${todayStr},next_due_date.eq.${in1Str},next_due_date.eq.${in2Str},next_due_date.eq.${in3Str},next_due_date.eq.${in4Str},next_due_date.lt.${todayStr}`);

  const results: any[] = [];
  for (const m of members || []) {
    if (!m.phone) continue;
    
    const dueDate = m.next_due_date ? new Date(m.next_due_date) : null;
    const daysDiff = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / 86400000) : 0;
    
    let body: string;
    if (daysDiff < 0) {
      body = EXPIRED_MSG.replace("{name}", m.name);
    } else {
      body = REMINDER_MSG.replace("{name}", m.name).replace("{days}", String(daysDiff));
    }
    
    const r = await sendWhatsApp(m.phone, body);
    await sb.from("wa_messages").insert({
      member_id: m.id, phone: m.phone, body,
      status: r.ok ? "sent" : "failed", error: r.ok ? null : r.error
    });
    results.push({ id: m.id, name: m.name, daysDiff, ok: r.ok });
  }

  return NextResponse.json({ ok: true, count: results.length, results });
}
