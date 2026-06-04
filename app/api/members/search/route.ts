import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const exclude = searchParams.get("exclude") ?? "";

  if (!q || q.length < 2) return NextResponse.json([]);

  const sb = createAdminClient();
  let query = sb
    .from("members")
    .select("id, name, admission_no, phone, is_staff")
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%,admission_no.ilike.%${q}%`);

  if (exclude && exclude.trim() !== "") {
    query = query.neq("id", exclude);
  }

  const { data } = await query.limit(8);

  return NextResponse.json(data ?? []);
}
