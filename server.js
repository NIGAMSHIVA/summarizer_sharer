// require("dotenv").config();
// const express = require("express");
// const cors = require("cors");
// const multer = require("multer");
// const fs = require("fs");
// const path = require("path");
// const pdfParse = require("pdf-parse");
// const { summarize } = require("./services/summarizer");
// const { sendMail } = require("./services/mailer");

// const app = express();
// const upload = multer({ dest: "uploads/" });

// app.use(cors());
// app.use(express.json({ limit: "2mb" }));
// app.use(express.static(path.join(__dirname, "public")));

// app.get("/api/health", (req, res) => {
//   res.json({ ok: true, time: new Date().toISOString() });
// });

// // --- Upload & parse transcript ---
// app.post("/api/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ error: "No file uploaded" });
//     let text = "";
//     const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
//     const buf = fs.readFileSync(req.file.path);

//     if (ext === "pdf") {
//       const data = await pdfParse(buf);
//       text = data.text || "";
//     } else if (ext === "txt" || ext === "md") {
//       text = buf.toString("utf8");
//     } else {
//       // Fallback: try UTF-8
//       text = buf.toString("utf8");
//     }

//     fs.unlink(req.file.path, () => {}); // cleanup tmp
//     res.json({ text });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: e.message || "Failed to parse file" });
//   }
// });

// // --- Summarize ---
// app.post("/api/summarize", async (req, res) => {
//   try {
//     const { text, prompt } = req.body || {};
//     if (!text || !text.trim()) return res.status(400).json({ error: "Missing 'text'." });
//     const summary = await summarize({ text, prompt });
//     res.json({ summary });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: e.message || "Summarization failed" });
//   }
// });

// // --- Email ---
// app.post("/api/email", async (req, res) => {
//   try {
//     let { to, subject, text, html } = req.body || {};
//     if (!to || !to.trim()) return res.status(400).json({ error: "Missing 'to' recipients." });
//     // Normalize comma/space-separated addresses
//     to = to.split(/[,\s]+/).filter(Boolean).join(", ");
//     const info = await sendMail({ to, subject, text, html });
//     res.json({ ok: true, messageId: info.messageId });
//   } catch (e) {
//     console.error(e);
//     res.status(500).json({ error: e.message || "Email failed" });
//   }
// });

// // --- Start ---
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const path = require("path");
const { summarize } = require("./services/summarizer");
const { sendMail } = require("./services/mailer");

const app = express();

/* ------------ CORS (allow your frontend domains) ------------ */
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN,                         // e.g. https://summarizer-sharer-z389.vercel.app
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // allow tools/curl/no-origin and any whitelisted origin
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: false,
  })
);

/* ------------ Body & static ------------ */
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ------------ Health ------------ */
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

/* ------------ Uploads: use memory storage (no disk) --------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

/* ------------ Upload & parse transcript --------------------- */
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const original = req.file.originalname || "";
    const ext = (original.split(".").pop() || "").toLowerCase();
    const buf = req.file.buffer;

    let text = "";
    if (ext === "pdf") {
      const data = await pdfParse(buf);
      text = data.text || "";
    } else if (ext === "txt" || ext === "md") {
      text = buf.toString("utf8");
    } else {
      // Fallback: try UTF-8
      text = buf.toString("utf8");
    }

    return res.json({ text });
  } catch (e) {
    console.error("Upload error:", e);
    return res.status(500).json({ error: e.message || "Failed to parse file" });
  }
});

/* --------------------- Summarize ---------------------------- */
app.post("/api/summarize", async (req, res) => {
  try {
    const { text, prompt } = req.body || {};
    if (!text || !text.trim())
      return res.status(400).json({ error: "Missing 'text'." });

    const summary = await summarize({ text, prompt });
    return res.json({ summary });
  } catch (e) {
    console.error("Summarize error:", e);
    return res.status(500).json({ error: e.message || "Summarization failed" });
  }
});

/* ----------------------- Email ------------------------------ */
app.post("/api/email", async (req, res) => {
  try {
    let { to, subject, text, html } = req.body || {};
    if (!to || !to.trim())
      return res.status(400).json({ error: "Missing 'to' recipients." });

    to = to.split(/[,\s]+/).filter(Boolean).join(", ");
    const info = await sendMail({ to, subject, text, html });
    return res.json({ ok: true, messageId: info.messageId });
  } catch (e) {
    console.error("Email error:", e);
    return res.status(500).json({ error: e.message || "Email failed" });
  }
});

/* ---------------------- Start server ------------------------ */
app.set("trust proxy", 1); // behind Railway/Proxies
const PORT = process.env.PORT || 8080; // Railway supplies PORT
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on http://0.0.0.0:${PORT}`);
});
