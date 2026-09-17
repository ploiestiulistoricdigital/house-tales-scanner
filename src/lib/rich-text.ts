import DOMPurify from "isomorphic-dompurify";

export const RICH_TEXT_ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li"];

export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// One-time upgrade path for legacy plain-text records (no HTML tags yet):
// turns blank-line-separated paragraphs into <p> blocks so they display and
// edit the same way as freshly-authored rich text.
export function plainTextToHtml(text: string): string {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length === 0) return "";
  return paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n\n");
}

export function toEditableHtml(value: string): string {
  if (!value) return "";
  return looksLikeHtml(value) ? value : plainTextToHtml(value);
}

// Like chunkText, but splits on block-element boundaries (</p>, </ul>,
// </ol>) instead of blank lines, so a chunk boundary never lands inside a
// tag and corrupts the markup sent for translation.
export function chunkRichText(html: string, maxChars = 1500): string[] {
  const blocks = html.match(/[\s\S]*?<\/(?:p|ul|ol)>|[\s\S]+$/gi)?.filter(Boolean) ?? [html];
  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    const candidate = current ? `${current}\n\n${block}` : block;
    if (candidate.length > maxChars && current) {
      chunks.push(current);
      current = block;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
