import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import MemberDetail from "./MemberDetail";

export default async function MemberPage({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await sb.from("members").select("*").eq("id", params.id).maybeSingle();
  if (!member) notFound();

  const { data: payments } = await sb.from("payments").select("*").eq("member_id", params.id).order("paid_on", { ascending: false });
  const { data: workouts } = await sb.from("workouts").select("*").eq("member_id", params.id).order("created_at", { ascending: true });
  const { data: diets } = await sb.from("diets").select("*").eq("member_id", params.id).order("created_at", { ascending: true });
  const { data: messages } = await sb.from("wa_messages").select("*").eq("member_id", params.id).order("sent_at", { ascending: false }).limit(10);

  return (
    <MemberDetail
      member={member}
      payments={payments ?? []}
      workouts={workouts ?? []}
      diets={diets ?? []}
      messages={messages ?? []}
    />
  );
}
