// Unified WhatsApp sender. Switch provider via WA_PROVIDER env.
// Provider: meta     — Meta WhatsApp Cloud API (free 1000/mo)
// Provider: local    — whatsapp-web.js node bridge (Puppeteer-based)
// Provider: evolution — Evolution API (Baileys engine, no Puppeteer, recommended)

type SendResult = { ok: boolean; error?: string; raw?: any; simulated?: boolean; message?: string };

export async function sendWhatsApp(toRaw: string, body: string, documentBuffer?: ArrayBuffer | null): Promise<SendResult> {
  const to = toRaw.replace(/[^\d]/g, "");
  const provider = (process.env.WA_PROVIDER || "none").trim().toLowerCase();

  console.log(`[WhatsApp] Provider: ${provider} | To: ${to}`);
  console.log(`[WhatsApp] Message: ${body}`);
  if (documentBuffer) {
    console.log(`[WhatsApp] Document attached (${documentBuffer.byteLength} bytes)`);
  }

  if (provider === "none" || provider === "demo") {
    return {
      ok: true,
      simulated: true,
      message: "WhatsApp is in demo mode — message logged but not sent. Set WA_PROVIDER=evolution to enable real WhatsApp."
    };
  }

  if (provider === "meta")      return sendViaMeta(to, body, documentBuffer);
  if (provider === "local")     return sendViaLocal(to, body, documentBuffer);
  if (provider === "evolution") return sendViaEvolution(to, body, documentBuffer);

  return { ok: false, error: `Unknown WA_PROVIDER: ${provider}` };
}

// ─── Meta (WhatsApp Business Cloud API) ───────────────────────────────────────

async function sendViaMeta(to: string, body: string, documentBuffer?: ArrayBuffer | null): Promise<SendResult> {
  const token = process.env.META_WA_TOKEN;
  const phoneId = process.env.META_WA_PHONE_ID;
  if (!token || !phoneId) return { ok: false, error: "Meta WA env missing (META_WA_TOKEN / META_WA_PHONE_ID)" };

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

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } })
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(json), raw: json };
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Local (whatsapp-web.js bridge, legacy) ────────────────────────────────────

async function sendViaLocal(to: string, body: string, documentBuffer?: ArrayBuffer | null): Promise<SendResult> {
  let url = process.env.LOCAL_WA_URL;
  const secret = process.env.LOCAL_WA_SECRET || process.env.SECRET;
  if (!url) return { ok: false, error: "LOCAL_WA_URL missing" };
  if (url.endsWith("/")) url = url.slice(0, -1);

  try {
    let media = null;
    if (documentBuffer) {
      const base64 = Buffer.from(documentBuffer).toString("base64");
      media = { mimetype: "application/pdf", filename: "Invoice.pdf", data: base64 };
    }

    const res = await fetch(`${url}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-secret": secret || "" },
      body: JSON.stringify({ to, body, media })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(json) };
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Evolution API (recommended — Baileys engine, no Puppeteer) ───────────────
//
// Setup:
//   EVOLUTION_API_URL      = http://<your-ec2-ip>:8080
//   EVOLUTION_API_KEY      = your-api-key
//   EVOLUTION_INSTANCE     = gymapp   (instance name you created)
//
// Quick start on EC2:
//   docker run -d --name evolution -p 8080:8080 \
//     -e AUTHENTICATION_TYPE=apikey \
//     -e AUTHENTICATION_API_KEY=your-api-key \
//     -v evolution_data:/evolution/instances \
//     atendai/evolution-api:latest
//
// Then POST http://<ip>:8080/instance/create  { "instanceName":"gymapp","qrcode":true }
// Open http://<ip>:8080/instance/connect/gymapp → scan QR

async function sendViaEvolution(to: string, body: string, documentBuffer?: ArrayBuffer | null): Promise<SendResult> {
  const baseUrl = process.env.EVOLUTION_API_URL;
  const apiKey  = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE || "gymapp";

  if (!baseUrl) return { ok: false, error: "EVOLUTION_API_URL missing" };
  if (!apiKey)  return { ok: false, error: "EVOLUTION_API_KEY missing" };

  // Evolution API expects number in format: 919876543210@s.whatsapp.net
  const phone = `${to}@s.whatsapp.net`;
  const url = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const headers = { "Content-Type": "application/json", apikey: apiKey };

  try {
    // ── Send PDF / document ──────────────────────────────────────────────────
    if (documentBuffer) {
      const base64 = Buffer.from(documentBuffer).toString("base64");
      const res = await fetch(`${url}/message/sendMedia/${instance}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          number: phone,
          mediatype: "document",
          mimetype: "application/pdf",
          caption: body,
          media: base64,
          fileName: "Invoice.pdf"
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: JSON.stringify(json), raw: json };
      return { ok: true, raw: json };
    }

    // ── Send plain text ──────────────────────────────────────────────────────
    const res = await fetch(`${url}/message/sendText/${instance}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: phone, text: body })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: JSON.stringify(json), raw: json };
    return { ok: true, raw: json };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
