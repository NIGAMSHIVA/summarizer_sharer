# AI Meeting Notes Summarizer & Sharer

A tiny full‑stack app that lets you:

1) **Upload** a transcript (.txt / .md / .pdf)  
2) **Enter a custom instruction** (e.g., “Highlight action items only”)  
3) Click **Generate Summary** → AI creates a structured summary (editable)  
4) **Email** the edited summary to recipients

> Frontend is intentionally barebones (single HTML + JS). Focus is functionality.

---

## 1) Quick Start

```bash
# 1) Use Node 20+
node -v

# 2) Install deps
npm i

# 3) Copy env template and fill values
cp .env.example .env
# - Insert your GROQ_API_KEY
# - Insert SMTP creds (simplest: Gmail + App Password with 2FA)

# 4) Run
npm run dev
# Open http://localhost:3000
```

### SMTP with Gmail (recommended quick path)

1. Turn on **2‑Step Verification** in your Google account  
2. Create an **App password** (choose Mail → Other)  
3. Put the generated 16‑char password in `SMTP_PASS` and your Gmail in `SMTP_USER`  
4. Keep `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`

> If you use a different provider (Mailgun, SendGrid, Outlook), update the SMTP vars accordingly.

---

## 2) What’s inside?

```
meet-summarizer/
├─ server.js               # Express server + API routes
├─ services/
│  ├─ summarizer.js        # Calls Groq (OpenAI-compatible) via fetch
│  └─ mailer.js            # Nodemailer wrapper
├─ utils/
│  └─ chunker.js           # Robust chunking to handle long transcripts
├─ public/
│  ├─ index.html           # Simple UI
│  └─ app.js               # Browser logic (fetch API)
├─ package.json
├─ .env.example
└─ README.md
```

---

## 3) API Overview

- `POST /api/upload` — multipart upload: `file` field. Parses `.txt`/`.md`/`.pdf` into plain text.
- `POST /api/summarize` — JSON: `{ text, prompt }` → returns `{ summary }`
  - If input is long, server auto‑chunks and synthesizes.
- `POST /api/email` — JSON: `{ to, subject, html }` or `{ to, subject, text }`

All endpoints return JSON; errors include a simple `{ error }` message.

---

## 4) Prompting

The server builds a strong system prompt that enforces a **structured Markdown** output:

- **TL;DR** (3–5 bullets)  
- **Action Items** table: `Owner | Task | Due | Priority`  
- **Decisions**  
- **Risks/Blockers**  
- **Next Steps** (group by team/owner)

Your **custom instruction** is appended to guide tone/format (e.g., “bullet points for executives only”).

---

## 5) Notes

- Uses Groq’s OpenAI‑compatible REST endpoint (`/chat/completions`).
- Node’s built‑in `fetch` (no extra SDK required).
- PDF text extracted by `pdf-parse`.
- Email via Nodemailer SMTP.

> This app stores nothing by default. If you need persistence (SQLite/S3), create it in `server.js` where indicated.

---

## 6) Security & Limits

- Keep your keys in `.env` (never commit).  
- For very large transcripts, chunking + map‑reduce summarization is used.  
- You can tune `MAX_CHARS_PER_CHUNK` in `utils/chunker.js`.

Good luck! 🚀
