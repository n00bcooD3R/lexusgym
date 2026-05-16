import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Link from "next/link";
import { feeStatus, formatDate } from "@/lib/fees";

export default async function PTPage() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: pts } = await sb
    .from("members")
    .select("id, admission_no, name, phone, photo_url, next_due_date, fee_amount, active")
    .eq("is_pt_client", true)
    .order("name");

  const list = pts ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Personal Training Clients ({list.length})</h1>
      <div className="card p-0 overflow-hidden">
        {list.length === 0 && <div className="p-6 text-center text-slate-500">No PT clients yet.</div>}
        <div className="divide-y divide-slate-200">
          {list.map((m: any) => {
            const s = feeStatus(m.next_due_date);
            const rowCls = s === "overdue" ? "bg-rose-50" : s === "due-soon" ? "bg-amber-50" : "";
            return (
              <Link key={m.id} href={`/members/${m.id}`} className={`flex items-center gap-3 px-4 py-2 hover:bg-slate-50 ${rowCls}`}>
                {m.photo_url
                  ? <img src={m.photo_url} className="w-9 h-9 rounded-full object-cover" />
                  : <div className="w-9 h-9 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center font-bold">{m.name.charAt(0).toUpperCase()}</div>}
                <div className="flex-1 min-w-0">
                  <div className={s === "overdue" ? "text-rose-700 font-semibold" : ""}>{m.name}</div>
                  <div className="text-xs text-slate-500 truncate">#{m.admission_no} · {m.phone}</div>
                </div>
                <div className="text-right text-xs">
                  <div>{m.next_due_date ? formatDate(m.next_due_date) : "—"}</div>
                  <div className="text-slate-500">₹{m.fee_amount}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
