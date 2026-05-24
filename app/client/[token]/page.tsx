import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase-server";
import ClientPortal from "./ClientPortal";

export const dynamic = "force-dynamic";

export default async function ClientPage({ params }: { params: { token: string } }) {
  const { token } = params;

  // Check session cookie — must match this token
  const cookieStore = cookies();
  const sessionToken = cookieStore.get("client_session")?.value;

  if (!sessionToken || sessionToken !== token) {
    // Not logged in or wrong session → go to login
    redirect(`/client/login`);
  }

  const sb = createAdminClient();

  // Verify token exists
  const { data: tokenRow } = await sb
    .from("client_tokens")
    .select("member_id")
    .eq("token", token)
    .single();

  if (!tokenRow) return notFound();

  const memberId = tokenRow.member_id;

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
      token={token}
    />
  );
}
