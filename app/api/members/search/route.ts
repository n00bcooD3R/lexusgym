import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const exclude = searchParams.get("exclude") ?? "";

  if (!q || q.length < 2) return NextResponse.json([]);

  const sb = createClient();
  let query = sb
    .from("members")
    .select("id, name, admission_no, phone, is_staff")
    .or(`name.ilike.%${q}%,phone.ilike.%${q}%,admission_no.ilike.%${q}%`);

  if (exclude && exclude.trim() !== "") {
    query = query.neq("id", exclude);
  }

  const { data, error } = await query.limit(8);
  if (error) {
    console.error("Search API Database Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
