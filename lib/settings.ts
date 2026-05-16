import { createClient } from "@/lib/supabase-client";

let settingsCache: Record<string, string> | null = null;

export async function getSettings(): Promise<Record<string, string>> {
  if (settingsCache) return settingsCache;
  
  const sb = createClient();
  const { data } = await sb.from("settings").select("key, value");
  const obj: Record<string, string> = {};
  data?.forEach((s: any) => { obj[s.key] = s.value || "" });
  settingsCache = obj;
  return obj;
}

export function processTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return result;
}

export function clearSettingsCache() {
  settingsCache = null;
}