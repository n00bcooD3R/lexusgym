const express = require("express");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SECRET = process.env.SECRET || "mysecret";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
});

client.on("qr", (qr) => {
  console.log("SCAN THIS QR CODE TO LINK WHATSAPP:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp Bridge Ready!");
});

client.initialize();

app.post("/send", async (req, res) => {
  const secret = req.headers["x-secret"];
  if (secret !== SECRET) return res.status(401).json({ error: "Unauthorized" });

  const { to, body } = req.body;
  if (!to || !body) return res.status(400).json({ error: "Missing to or body" });

  try {
    const formattedNum = to.replace(/[^\d]/g, "") + "@c.us";
    await client.sendMessage(formattedNum, body);
    console.log(`Sent to ${to}`);
    res.json({ ok: true });
  } catch (err) {
    console.error("Send error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Bridge running on port ${PORT}`);
});
