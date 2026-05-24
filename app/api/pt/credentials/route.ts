import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { memberId, username, password } = await req.json();

    if (!memberId || !username || !password) {
      return NextResponse.json({ ok: false, error: "memberId, username, password required" }, { status: 400 });
    }

    if (username.length < 3) return NextResponse.json({ ok: false, error: "Username must be at least 3 characters" }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ ok: false, error: "Password must be at least 6 characters" }, { status: 400 });

    const sb = createAdminClient();

    // Check username not taken by another member
    const { data: existing } = await sb
      .from("client_tokens")
      .select("member_id")
      .eq("username", username.toLowerCase().trim())
      .single();

    if (existing && existing.member_id !== memberId) {
      return NextResponse.json({ ok: false, error: "Username already taken" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);

    // Upsert token row (create if not exists, update credentials)
    const { error } = await sb
      .from("client_tokens")
      .upsert(
        { member_id: memberId, username: username.toLowerCase().trim(), password_hash },
        { onConflict: "member_id" }
      );

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
