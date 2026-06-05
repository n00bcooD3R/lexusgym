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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sb = createAdminClient();
    
    for (const [key, value] of Object.entries(body)) {
      const { error } = await sb.from("settings").upsert({
        key,
        value: String(value),
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });
      
      if (error) {
        throw new Error(`Failed to save key "${key}": ${error.message}`);
      }
    }
    
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Save Settings API Error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}