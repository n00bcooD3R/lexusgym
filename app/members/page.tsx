import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import MembersClient from "./MembersClient";

export default async function MembersPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: members } = await sb
    .from("members")
    .select("id, admission_no, name, phone, photo_url, next_due_date, fee_amount, is_pt_client, active, created_at, is_staff")
    .order("name", { ascending: true });

  return <MembersClient members={members ?? []} />;
}
