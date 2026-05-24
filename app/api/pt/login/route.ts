import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return NextResponse.json({ ok: false, error: "Username and password required" }, { status: 400 });

    const sb = createAdminClient();

    const { data: row } = await sb
      .from("client_tokens")
      .select("token, password_hash, member_id")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (!row || !row.password_hash) {
      return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return NextResponse.json({ ok: false, error: "Invalid username or password" }, { status: 401 });

    return NextResponse.json({ ok: true, token: row.token });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
