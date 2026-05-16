import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { sendWhatsApp } from "@/lib/whatsapp";
import { buildReminderMsg } from "@/lib/fees";

export async function POST(req: NextRequest) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const memberId = formData.get("memberId") as string;
    const body = formData.get("body") as string;
    const document = formData.get("document") as File | null;

    if (!memberId) return NextResponse.json({ ok: false, error: "memberId required" }, { status: 400 });

    const { data: member, error } = await sb
      .from("members")
      .select("id, name, phone, fee_amount, next_due_date")
      .eq("id", memberId)
      .maybeSingle();
    if (error || !member) return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });

    const text = body || buildReminderMsg(member);
    const result = await sendWhatsApp(member.phone, text, document ? await document.arrayBuffer() : null);

    await sb.from("wa_messages").insert({
      member_id: member.id,
      phone: member.phone,
      body: text + (document ? " [PDF Attached]" : ""),
      status: result.ok ? "sent" : "failed",
      error: result.ok ? null : result.error
    });

    return NextResponse.json(result);
  }

  const { memberId, body } = await req.json();
  if (!memberId) return NextResponse.json({ ok: false, error: "memberId required" }, { status: 400 });

  const { data: member, error } = await sb
    .from("members")
    .select("id, name, phone, fee_amount, next_due_date")
    .eq("id", memberId)
    .maybeSingle();
  if (error || !member) return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });

  const text = body || buildReminderMsg(member);
  const result = await sendWhatsApp(member.phone, text);

  await sb.from("wa_messages").insert({
    member_id: member.id,
    phone: member.phone,
    body: text,
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.error
  });

  return NextResponse.json(result);
}
