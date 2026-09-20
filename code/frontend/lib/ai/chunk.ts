/**
 * Paragraph-aware chunker. MiniLM-class models cap at 512 tokens, so chunks
 * target ~256–384 tokens (≈1000–1500 chars) with overlap — chunking quality
 * is load-bearing for retrieval, not a tuning detail.
 */
export function chunkText(
  text: string,
  maxChars = 1200,
  overlapChars = 200,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];
  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  const push = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
    current = "";
  };
  for (const para of paragraphs) {
    if ((current + "\n\n" + para).trim().length <= maxChars) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }
    if (current) {
      push();
      const tail = chunks[chunks.length - 1] ?? "";
      current = tail.slice(-overlapChars);
      if ((current + "\n\n" + para).trim().length <= maxChars) {
        current = current ? `${current}\n\n${para}` : para;
        continue;
      }
      push();
    }
    // Single oversized paragraph: hard-split with overlap.
    let rest = para;
    while (rest.length > maxChars) {
      chunks.push(rest.slice(0, maxChars));
      rest = rest.slice(maxChars - overlapChars);
    }
    current = rest;
  }
  push();
  return chunks.filter((c) => c.length > 0);
}
