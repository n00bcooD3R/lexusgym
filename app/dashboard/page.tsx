import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  // Fetch members with fee info, ordered by due date asc (overdue first, then upcoming)
  const { data: members } = await sb
    .from("members")
    .select("id, admission_no, name, phone, photo_url, fee_amount, next_due_date, last_payment_date, is_pt_client, active, is_staff")
    .eq("active", true)
    .order("next_due_date", { ascending: true, nullsFirst: false });

  return <DashboardClient members={members ?? []} />;
}
