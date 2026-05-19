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

let currentQR = "";

client.on("qr", (qr) => {
  console.log("\n📱 Scan this QR with WhatsApp:\n");
  qrcode.generate(qr, { small: true });
  console.log("\nOr open http://<your-ip>:3001/qr in browser\n");
  currentQR = qr;
});

client.on("ready", () => {
  console.log("✅ WhatsApp Bridge Ready!");
  currentQR = "READY";
});

client.initialize();

app.get("/qr", (req, res) => {
  if (currentQR === "READY") {
    return res.send("<h1>✅ Already connected and ready!</h1>");
  }
  if (!currentQR) {
    return res.send("<h1>⏳ Waiting for QR code... refresh in 5 seconds.</h1>");
  }
  // Generate a clean image using a free API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(currentQR)}`;
  res.send(`
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background:#f0f2f5;">
      <h2>Scan this with WhatsApp</h2>
      <img src="${qrUrl}" alt="QR Code" style="border: 10px solid white; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
      <p>If it expires, refresh the page to get a new one.</p>
    </div>
  `);
});

app.post("/send", async (req, res) => {
  const secret = req.headers["x-secret"];
  if (secret !== SECRET) return res.status(401).json({ error: "Unauthorized" });

  const { to, body } = req.body;
  if (!to || !body) return res.status(400).json({ error: "Missing to or body" });

  try {
    const cleaned = to.replace(/[^\d]/g, "");
    
    // Resolve the official WhatsApp ID for this number
    const numberDetails = await client.getNumberId(cleaned);
    if (!numberDetails) {
       return res.status(400).json({ error: "Number is not registered on WhatsApp" });
    }
    
    const formattedNum = numberDetails._serialized;
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
