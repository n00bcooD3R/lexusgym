import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = createAdminClient();
  const { data } = await sb.from("settings").select("key, value");
  
  const obj: Record<string, string> = {};
  data?.forEach((s: any) => { obj[s.key] = s.value || "" });
  
  return NextResponse.json(obj);
}