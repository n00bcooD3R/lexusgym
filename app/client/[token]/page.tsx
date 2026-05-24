import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-server";
import ClientPortal from "./ClientPortal";


export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { token: string } }) {
  const sb = createAdminClient();
  const { token } = params;

  // Resolve token → member
  const { data: tokenRow } = await sb
    .from("client_tokens")
    .select("member_id")
    .eq("token", token)
    .single();

  if (!tokenRow) return notFound();

  const memberId = tokenRow.member_id;

  // Fetch member, workout, diet in parallel
  const [memberRes, workoutRes, dietRes] = await Promise.all([
    sb.from("members").select("id, name, photo_url, admission_no").eq("id", memberId).single(),
    sb.from("workout_plans").select("*").eq("member_id", memberId).order("day_number"),
    sb.from("diet_plans").select("*").eq("member_id", memberId).order("meal_order"),
  ]);

  if (!memberRes.data) return notFound();

  return (
    <ClientPortal
      member={memberRes.data}
      workoutDays={workoutRes.data ?? []}
      dietMeals={dietRes.data ?? []}
    />
  );
}
