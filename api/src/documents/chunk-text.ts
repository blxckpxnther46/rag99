export function chunkText(text: string, size = 3000, overlap = 300) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  const step = size - overlap;

  for (let start = 0; start < clean.length; start += step) {
    chunks.push(clean.slice(start, start + size));
  }

  return chunks;
}
