import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import MemberDetail from "./MemberDetail";

export default async function MemberPage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await sb.from("members").select("*").eq("id", params.id).maybeSingle();
  if (!member) notFound();

  const [
    { data: payments },
    { data: workouts },
    { data: diets },
    { data: messages },
  ] = await Promise.all([
    sb.from("payments").select("*").eq("member_id", params.id).order("paid_on", { ascending: false }),
    sb.from("workouts").select("*").eq("member_id", params.id).order("created_at", { ascending: true }),
    sb.from("diets").select("*").eq("member_id", params.id).order("created_at", { ascending: true }),
    sb.from("wa_messages").select("*").eq("member_id", params.id).order("sent_at", { ascending: false }).limit(10),
  ]);

  // Fetch partner info if this is a couple pack member
  let partner = null;
  if (member.couple_partner_id) {
    const { data } = await sb
      .from("members")
      .select("id, name, admission_no, phone, fee_amount, fee_cycle_days")
      .eq("id", member.couple_partner_id)
      .maybeSingle();
    partner = data;
  }

  return (
    <MemberDetail
      member={member}
      payments={payments ?? []}
      workouts={workouts ?? []}
      diets={diets ?? []}
      messages={messages ?? []}
      partner={partner}
    />
  );
}

