// Splits text on paragraph breaks into pieces no longer than maxChars, so each
// piece can be translated by a single fast request instead of one big one that
// risks exceeding a serverless function's execution time limit.
export function chunkText(text: string, maxChars = 1500): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = candidate;
    }

    while (current.length > maxChars) {
      let cut = current.lastIndexOf(". ", maxChars);
      cut = cut > maxChars * 0.5 ? cut + 1 : maxChars;
      chunks.push(current.slice(0, cut).trim());
      current = current.slice(cut).trim();
    }
  }

  if (current) chunks.push(current);
  return chunks;
}
