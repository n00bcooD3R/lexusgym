import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import PTAdminClient from "./PTAdminClient";

export default async function PTPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: pts } = await sb
    .from("members")
    .select("id, admission_no, name, phone, photo_url, next_due_date, fee_amount, active, is_pt_client")
    .eq("is_pt_client", true)
    .order("name");

  return <PTAdminClient members={pts ?? []} />;
}
