import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import EditForm from "./EditForm";

export default async function EditMember({ params }: { params: { id: string } }) {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: member } = await sb.from("members").select("*").eq("id", params.id).maybeSingle();
  if (!member) notFound();
  return <EditForm member={member} />;
}
