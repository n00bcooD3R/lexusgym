// Unified WhatsApp sender. Switch provider via WA_PROVIDER env.
// Provider A: meta — Meta WhatsApp Cloud API (free 1000/mo)
// Provider B: local — your own whatsapp-web.js node bridge (free unlimited, your number)

type SendResult = { ok: boolean; error?: string; raw?: any; simulated?: boolean; message?: string };

export async function sendWhatsApp(toRaw: string, body: string, documentBuffer?: ArrayBuffer | null): Promise<SendResult> {
  const to = toRaw.replace(/[^\d]/g, "");
  const provider = process.env.WA_PROVIDER || "none";

  console.log(`[WhatsApp Simulated] To: ${to}`);
  console.log(`[WhatsApp Simulated] Message: ${body}`);
  if (documentBuffer) {
    console.log(`[WhatsApp Simulated] Document attached (${documentBuffer.byteLength} bytes)`);
  }

  if (provider === "none" || provider === "demo") {
    return { 
      ok: true, 
      simulated: true,
      message: "WhatsApp is in demo mode - message logged but not sent. Set WA_PROVIDER=meta to enable real WhatsApp." 
    };
  }

  if (provider === "meta") return sendViaMeta(to, body, documentBuffer);
  if (provider === "local") return sendViaLocal(to, body, documentBuffer);
  return { ok: false, error: "Unknown WA_PROVIDER" };
}

async function sendViaMeta(to: string, body: string, documentBuffer?: ArrayBuffer): Promise<SendResult> {
  const token = process.env.META_WA_TOKEN;
  const phoneId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneId) return { ok: false, error: "Meta WA env missing" };

  try {
    if (documentBuffer) {
      const formData = new FormData();
      const blob = new Blob([documentBuffer], { type: "application/pdf" });
      formData.append("messaging_product", "whatsapp");
      formData.append("to", to);
      formData.append("type", "document");
      formData.append("document", blob, "document.pdf");
      formData.append("caption", body);

      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: JSON.stringify(json), raw: json };
      return { ok: true, raw: json };
    }

    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body }
      })
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(json), raw: json };
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

async function sendViaLocal(to: string, body: string): Promise<SendResult> {
  const url = process.env.LOCAL_WA_URL;
  const secret = process.env.LOCAL_WA_SECRET;
  if (!url) return { ok: false, error: "LOCAL_WA_URL missing" };
  try {
    const res = await fetch(`${url}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-secret": secret || "" },
      body: JSON.stringify({ to, body })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(json) };
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
