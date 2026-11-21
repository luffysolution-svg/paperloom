const FOOTNOTE_DEFINITION = /^ {0,3}\[\^([^\]\r\n]+)\]:[ \t]*(.*)$/;
const FENCE = /^ {0,3}(```+|~~~+)/;
const INLINE_CODE = /(`+)([^`\r\n]*?)\1/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function footnoteSlug(label: string): string {
  const slug = label
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{Letter}\p{Number}_-]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "note";
}

function footnoteKey(label: string): string {
  return label.trim().normalize("NFKC").toLocaleLowerCase();
}

function indentContinuation(line: string): string | null {
  if (/^\t/.test(line)) return line.slice(1);
  if (/^ {4}/.test(line)) return line.slice(4);
  return null;
}

/**
 * Converts the common Markdown footnote form into ordinary internal anchors.
 *
 * The generated list keeps the definition body as Markdown so links, code and
 * formula placeholders continue through the existing marked and math passes.
 */
export function normalizeMarkdownFootnotes(markdown: string): string {
  const lines = `${markdown || ""}`.split(/\r?\n/);
  const body: string[] = [];
  const definitions = new Map<string, { label: string; value: string }>();
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fence = line.match(FENCE);
    if (fence) {
      inFence = !inFence;
      body.push(line);
      continue;
    }
    if (!inFence) {
      const definition = line.match(FOOTNOTE_DEFINITION);
      if (definition) {
        const parts = [definition[2]];
        while (index + 1 < lines.length) {
          const next = lines[index + 1];
          const continuation = indentContinuation(next);
          if (continuation != null) {
            parts.push(continuation);
            index += 1;
            continue;
          }
          if (next.trim() === "" && lines[index + 2] && indentContinuation(lines[index + 2]) != null) {
            parts.push("");
            index += 1;
            continue;
          }
          break;
        }
        const label = definition[1].trim();
        definitions.set(footnoteKey(label), { label, value: parts.join("\n").trim() });
        continue;
      }
    }
    body.push(line);
  }

  const refs = new Map<string, string[]>();
  const slugs = new Map<string, string>();
  const usedSlugs = new Set<string>();
  const slugFor = (key: string, label: string): string => {
    const existing = slugs.get(key);
    if (existing) return existing;
    const base = footnoteSlug(label);
    let slug = base;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    usedSlugs.add(slug);
    slugs.set(key, slug);
    return slug;
  };
  for (const [key, definition] of definitions) slugFor(key, definition.label);
  let transformedFence = false;
  const replaceReferences = (line: string): string => {
    let output = "";
    let cursor = 0;
    for (const match of line.matchAll(INLINE_CODE)) {
      const index = match.index ?? 0;
      output += transformReferenceText(line.slice(cursor, index));
      output += match[0];
      cursor = index + match[0].length;
    }
    return output + transformReferenceText(line.slice(cursor));
  };
  const transformReferenceText = (text: string): string => text.replace(/\[\^([^\]\r\n]+)\]/g, (_match, rawLabel: string) => {
    const label = rawLabel.trim();
    const key = footnoteKey(label);
    const definition = definitions.get(key);
    if (!definition) return _match;
    const slug = slugFor(key, definition.label);
    const targetId = `reader-md-footnote-${slug}`;
    const refIds = refs.get(key) || [];
    const refId = `reader-md-footnote-ref-${slug}${refIds.length ? `-${refIds.length + 1}` : ""}`;
    refIds.push(refId);
    refs.set(key, refIds);
    return `<sup class="reader-md-footnote-ref" id="${refId}"><a href="#${targetId}">[${escapeHtml(label)}]</a></sup>`;
  });
  const transformed = body.map((line) => {
    if (line.match(FENCE)) {
      transformedFence = !transformedFence;
      return line;
    }
    if (transformedFence) return line;
    return replaceReferences(line);
  });

  if (definitions.size === 0) return transformed.join("\n");

  const section = ["", '<section class="reader-md-footnotes" aria-label="脚注">', "", "## 脚注", ""];
  let number = 1;
  for (const [key, definition] of definitions) {
    const slug = slugFor(key, definition.label);
    const targetId = `reader-md-footnote-${slug}`;
    const refIds = refs.get(key) || [`reader-md-footnote-ref-${slug}`];
    const backLinks = refIds
      .map((refId) => `<a href="#${refId}" class="reader-md-footnote-back">↩</a>`)
      .join(" ");
    const valueLines = definition.value.split(/\r?\n/);
    const firstLine = valueLines.shift() || "";
    const renderedLines = [firstLine, ...valueLines];
    let backLinkLine = renderedLines.length - 1;
    while (backLinkLine > 0 && !renderedLines[backLinkLine].trim()) backLinkLine -= 1;
    renderedLines[backLinkLine] = `${renderedLines[backLinkLine]} ${backLinks}`.trim();
    section.push(`${number}. <span id="${targetId}"></span>${renderedLines[0]}`);
    const continuationIndent = " ".repeat(String(number).length + 2);
    for (const line of renderedLines.slice(1)) section.push(`${continuationIndent}${line}`);
    number += 1;
  }
  section.push("", "</section>");
  return `${transformed.join("\n")}\n${section.join("\n")}`;
}
