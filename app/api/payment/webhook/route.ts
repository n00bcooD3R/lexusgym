import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";
import { sendWhatsApp } from "@/lib/whatsapp";
import { generateBill } from "@/lib/pdf-bill";

export const dynamic = "force-dynamic";


export async function POST(req: NextRequest) {
  const sb = createAdminClient();
  
  try {
    const payload = await req.json();
    
    const { payment_id, amount, phone, member_id, status, method } = payload;
    
    if (!phone && !member_id) {
      return NextResponse.json({ ok: false, error: "phone or member_id required" }, { status: 400 });
    }

    let member: any = null;
    
    if (member_id) {
      const { data } = await sb.from("members").select("*").eq("id", member_id).maybeSingle();
      member = data;
    } else if (phone) {
      const { data } = await sb.from("members").select("*").eq("phone", phone).maybeSingle();
      member = data;
    }

    if (!member) {
      return NextResponse.json({ ok: false, error: "Member not found" }, { status: 404 });
    }

    if (status === "captured" || status === "success") {
      const today = new Date().toISOString().slice(0, 10);
      const { data: payment, error } = await sb.from("payments").insert({
        member_id: member.id,
        amount: Number(amount) / 100,
        method: method || "online",
        notes: `Payment ID: ${payment_id}`,
        paid_on: today
      }).select().single();

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      const doc = generateBill(member, { ...payment, paid_on: today });
      const pdfBlob = doc.output("blob");
      
      const formData = new FormData();
      formData.append("memberId", member.id);
      formData.append("body", `Hi ${member.name}, your payment of ₹${amount / 100} has been received. Thank you for renewing your membership! - Lexus Fitness Group`);
      formData.append("document", pdfBlob, `Receipt_${member.admission_no}.pdf`);
      
      await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/api/wa/send", {
        method: "POST",
        body: formData
      });

      return NextResponse.json({ ok: true, message: "Payment recorded and receipt sent" });
    }

    return NextResponse.json({ ok: false, error: "Payment not successful" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}