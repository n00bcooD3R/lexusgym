// Free WhatsApp bridge using whatsapp-web.js (uses your own WA account via QR scan).
// Run separately: cd whatsapp-server && npm install && node server.js
// Scan QR shown in terminal once with your phone. Session persists.
// Then set in main app: WA_PROVIDER=local, LOCAL_WA_URL=http://localhost:3001, LOCAL_WA_SECRET=changeme
//
// NOTE: This uses an unofficial library. Use a dedicated phone number to avoid ban risk.

const express = require("express");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const SECRET = process.env.LOCAL_WA_SECRET || "changeme";
const PORT = process.env.PORT || 3001;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
  puppeteer: { args: ["--no-sandbox", "--disable-setuid-sandbox"] }
});

let ready = false;
client.on("qr", (qr) => {
  console.log("Scan this QR with your WhatsApp -> Linked Devices:");
  qrcode.generate(qr, { small: true });
});
client.on("ready", () => { ready = true; console.log("WhatsApp bridge ready ✓"); });
client.on("auth_failure", (m) => console.error("Auth failure:", m));
client.on("disconnected", (r) => { ready = false; console.log("Disconnected:", r); });
client.initialize();

const app = express();
app.use(express.json());

app.get("/health", (_, res) => res.json({ ready }));

app.post("/send", async (req, res) => {
  if ((req.headers["x-secret"] || "") !== SECRET) return res.status(401).json({ error: "bad secret" });
  if (!ready) return res.status(503).json({ error: "WA client not ready" });
  const { to, body } = req.body || {};
  if (!to || !body) return res.status(400).json({ error: "to and body required" });
  const num = String(to).replace(/[^\d]/g, "");
  const chatId = `${num}@c.us`;
  try {
    const sent = await client.sendMessage(chatId, body);
    res.json({ ok: true, id: sent.id?._serialized });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`WA bridge on :${PORT}`));
