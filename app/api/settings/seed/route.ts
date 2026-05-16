import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-server";

const DEFAULT_SETTINGS = [
  { key: "gym_name", value: "Lexus Fitness Group" },
  { key: "gym_tagline", value: "Fitness Center & Personal Training" },
  { key: "gym_address", value: "123 Fitness Street, City - 123456" },
  { key: "gym_phone", value: "+91 9876543210" },
  { key: "gym_email", value: "info@lexusfitness.com" },
  { key: "gym_gst", value: "27AAABCU9603R1ZM" },
  { key: "msg_welcome", value: "Hello {name},\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today.\n\n— Team {gym_name}" },
  { key: "msg_renewal", value: "Hello {name},\n\nYour {gym_name} membership has been successfully renewed! 💪🔥\n\nThank you for continuing your fitness journey with us.\n\n— Team {gym_name}" },
  { key: "msg_reminder", value: "Hello {name},\n\nThis is a friendly reminder that your {gym_name} membership will expire in {days} days. 💪\n\nTo continue enjoying uninterrupted access to the gym, please renew your membership before the expiry date.\n\n— Team {gym_name}" },
  { key: "msg_expired", value: "Hello {name},\n\nYour {gym_name} membership has expired. 😔\n\nPlease renew your membership at the earliest to continue your fitness journey.\n\n— Team {gym_name}" },
  { key: "msg_payment", value: "Hello {name},\n\nThank you for your payment of ₹{amount}! 💪\n\nYour payment has been successfully received. Your membership is now active until {expiry}.\n\nPlease find the attached invoice for your records.\n\n— Team {gym_name}" }
];

export async function GET() {
  try {
    const sb = createAdminClient();
    
    for (const setting of DEFAULT_SETTINGS) {
      await sb.from("settings").upsert(setting, { onConflict: "key" });
    }
    
    return NextResponse.json({ ok: true, message: "Settings seeded" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}