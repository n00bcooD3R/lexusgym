import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import StatisticsClient from "./StatisticsClient";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // Fetch payments with nested member info
  const { data: payments } = await sb
    .from("payments")
    .select(`
      id,
      amount,
      paid_on,
      method,
      notes,
      member_id,
      members (
        id,
        name,
        join_date,
        is_staff
      )
    `)
    .order("paid_on", { ascending: false });

  // Fetch all members to analyze joining trends and overall active members
  const { data: members } = await sb
    .from("members")
    .select("id, name, join_date, is_staff, active, fee_amount, fee_cycle_days, created_at")
    .order("name", { ascending: true });

  // Format payments to make members singular and safe for StatisticsClient types
  const formattedPayments = (payments ?? []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    paid_on: p.paid_on,
    method: p.method,
    notes: p.notes,
    member_id: p.member_id,
    members: Array.isArray(p.members) ? p.members[0] : (p.members || null)
  }));

  return (
    <StatisticsClient 
      payments={formattedPayments} 
      members={members ?? []} 
    />
  );
}
