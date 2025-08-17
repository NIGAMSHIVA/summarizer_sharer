require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { summarize } = require("./services/summarizer");
const { sendMail } = require("./services/mailer");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- Upload & parse transcript ---
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    let text = "";
    const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
    const buf = fs.readFileSync(req.file.path);

    if (ext === "pdf") {
      const data = await pdfParse(buf);
      text = data.text || "";
    } else if (ext === "txt" || ext === "md") {
      text = buf.toString("utf8");
    } else {
      // Fallback: try UTF-8
      text = buf.toString("utf8");
    }

    fs.unlink(req.file.path, () => {}); // cleanup tmp
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Failed to parse file" });
  }
});

// --- Summarize ---
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, prompt } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: "Missing 'text'." });
    const summary = await summarize({ text, prompt });
    res.json({ summary });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Summarization failed" });
  }
});

// --- Email ---
app.post("/api/email", async (req, res) => {
  try {
    let { to, subject, text, html } = req.body || {};
    if (!to || !to.trim()) return res.status(400).json({ error: "Missing 'to' recipients." });
    // Normalize comma/space-separated addresses
    to = to.split(/[,\s]+/).filter(Boolean).join(", ");
    const info = await sendMail({ to, subject, text, html });
    res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Email failed" });
  }
});

// --- Start ---
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
