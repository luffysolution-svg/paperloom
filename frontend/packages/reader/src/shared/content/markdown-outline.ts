// Markdown 目录 outline：为标题分配稳定且去重的锚点 id。

export type MarkdownOutlineItem = {
  id: string;
  level: number;
  text: string;
};

function markdownHeadingSlug(text: string): string {
  return text
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

export function buildMarkdownOutline(
  container: ParentNode,
  used: Map<string, number> = new Map(),
): MarkdownOutlineItem[] {
  return [...container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")]
    .flatMap((heading) => {
      const text = (heading.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return [];
      const base = markdownHeadingSlug(text);
      const occurrence = (used.get(base) || 0) + 1;
      used.set(base, occurrence);
      const id = occurrence === 1 ? `reader-md-${base}` : `reader-md-${base}-${occurrence}`;
      heading.id = id;
      return [{ id, level: Number(heading.tagName.slice(1)), text }];
    });
}
