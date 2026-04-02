export function splitIntoChunks(
  text: string,
  size = 500,
  overlap = 100,
): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end).trim());
    start += size - overlap;
  }
  return chunks.filter(c => c.length > 50);
}
