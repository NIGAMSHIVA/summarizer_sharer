/**
 * Chunk long text safely for LLMs.
 * Splits on paragraph boundaries when possible.
 */
function chunkText(text, maxLen = 12000, overlap = 200) {
  if (!text || text.length <= maxLen) return [text || ""];
  const paras = text.split(/\n{2,}/);
  const chunks = [];
  let buf = "";

  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };

  for (const p of paras) {
    // If a single paragraph is enormous, hard-split it.
    if (p.length > maxLen) {
      const step = maxLen - overlap;
      let i = 0;
      while (i < p.length) {
        const end = Math.min(i + maxLen, p.length);
        const frag = p.slice(i, end);
        if (buf.length === 0) {
          buf = frag;
        } else if (buf.length + 2 + frag.length <= maxLen) {
          buf += "\n\n" + frag;
        } else {
          flush();
          buf = frag;
        }
        i += step;
      }
      continue;
    }

    // Normal case: add paragraph if it fits
    if (buf.length + 2 + p.length <= maxLen) {
      buf += (buf ? "\n\n" : "") + p;
    } else {
      flush();
      buf = p;
    }
  }
  flush();

  // Add small overlaps for context
  const overlapped = [];
  for (let i = 0; i < chunks.length; i++) {
    const prevTail = i > 0 ? chunks[i - 1].slice(-overlap) : "";
    overlapped.push(prevTail + chunks[i]);
  }
  return overlapped;
}

module.exports = { chunkText };
