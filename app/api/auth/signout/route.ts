import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST() {
  const sb = createClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
