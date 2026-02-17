// src/motion/jsonl.js
export function parseJsonlText(text, { maxErrors = 3 } = {}) {
  const lines = String(text || "").split("\n");
  const out = [];
  let errors = 0;

  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) continue;

    try {
      out.push(JSON.parse(s));
    } catch (e) {
      errors++;
      if (errors <= maxErrors) {
        console.error(`[parseJsonlText] JSON parse error at line ${i + 1}:`, e);
        console.error(`[parseJsonlText] line:`, s.slice(0, 200));
      }
      // keep going
    }
  }

  return out;
}
