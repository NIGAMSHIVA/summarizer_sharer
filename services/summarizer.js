const { chunkText } = require("../utils/chunker");
const MODEL = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
const BASE_URL = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";

async function callGroqChat(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing GROQ_API_KEY in environment");

  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 1200
    })
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Groq API error: ${resp.status} ${text}`);
    }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function baseSystemPrompt() {
  return `You are a meticulous meeting-notes summarizer.
Return a **crisp, structured Markdown** summary using this layout:

# TL;DR
- 3–5 bullets focusing on outcomes, not chatter.

# Action Items
| Owner | Task | Due | Priority |
|---|---|---|---|
| ... | ... | ... | ... |

# Decisions
- ...

# Risks / Blockers
- ...

# Next Steps (by Owner/Team)
- Owner/Team: bullets

Rules:
- Be faithful to the transcript; no hallucinations.
- If fields (owner/due date) are missing, write "TBD".
- Keep it executive-friendly and skimmable.
- Prefer bullets and tables; avoid long paragraphs.
`;
}

/**
 * Summarize possibly-long text with optional custom instruction.
 */
async function summarize({ text, prompt = "" }) {
  if (!text || !text.trim()) return "No content provided.";

  const chunks = chunkText(text);
  const sys = baseSystemPrompt();
  const userDirective = prompt?.trim()
    ? `\n\nCustom instruction from user:\n"${prompt.trim()}"\n`
    : "";

  // If single chunk, summarize directly
  if (chunks.length === 1) {
    return await callGroqChat([
      { role: "system", content: sys },
      { role: "user", content: `Summarize the following transcript. ${userDirective}\n\n---\n${chunks[0]}` }
    ]);
  }

  // Map: per-chunk summary
  const partials = [];
  for (let i = 0; i < chunks.length; i++) {
    const part = await callGroqChat([
      { role: "system", content: sys },
      { role: "user", content: `This is chunk ${i+1}/${chunks.length} of a long transcript.\nSummarize faithfully. ${userDirective}\n\n---\n${chunks[i]}` }
    ]);
    partials.push(part);
  }

  // Reduce: synthesize a single coherent summary
  const combined = await callGroqChat([
    { role: "system", content: sys },
    { role: "user", content: `You are given ${partials.length} chunk-level summaries of one meeting.\nSynthesize them into ONE final, deduplicated summary following the exact Markdown layout.\n\n---\n${partials.join("\n\n---\n")}` }
  ]);

  return combined;
}

module.exports = { summarize };
