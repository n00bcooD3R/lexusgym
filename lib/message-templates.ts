import { createAdminClient } from "./supabase-server";

let settingsCache: Record<string, string> | null = null;
let lastFetch = 0;
const CACHE_DURATION = 5000; // 5s — refresh quickly after settings save


export async function getSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && (now - lastFetch) < CACHE_DURATION) {
    return settingsCache;
  }
  
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("settings").select("key, value");
    const obj: Record<string, string> = {};
    data?.forEach((s: any) => { obj[s.key] = s.value || "" });
    settingsCache = obj;
    lastFetch = now;
    return obj;
  } catch (e) {
    return settingsCache || {};
  }
}

export function processTemplate(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return result;
}

export function getMessageTemplate(type: string): string {
  const templates: Record<string, string> = {
    welcome: "Hello {name},\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated.\n\n— Team {gym_name}",
    renewal: "Hello {name},\n\nYour {gym_name} membership has been successfully renewed! 💪🔥\n\nThank you for continuing your fitness journey.\n\n— Team {gym_name}",
    reminder: "Hello {name},\n\nThis is a friendly reminder that your {gym_name} membership will expire in {days} days. 💪\n\nPlease renew your membership before the expiry date.\n\n— Team {gym_name}",
    expired: "Hello {name},\n\nYour {gym_name} membership has expired. 😔\n\nPlease renew your membership at the earliest.\n\n— Team {gym_name}",
    payment: "Hello {name},\n\nThank you for your payment of ₹{amount}! 💪\n\nYour payment has been received. Your membership is now active until {expiry}.\n\nPlease find the attached invoice.\n\n— Team {gym_name}"
  };
  return templates[type] || "";
}