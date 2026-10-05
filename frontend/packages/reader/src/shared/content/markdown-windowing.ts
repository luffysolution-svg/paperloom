// 把 Markdown 原文按「顶层空行」边界切成可独立渲染的块；代码围栏内不切，
// 避免把代码块 / 表格 / 公式劈开。
//
// 返回 null 表示当前缓冲还不足以切出一个 >= minChars 的完整块（需要更多文本）。
// 调用方在 EOF 时把剩余文本直接渲染即可。
//
// 已知限制：分段用独立的 marked.parse，语法上「跨块才有意义」的构造会被切坏。
// 这里做能做的缓解：块边界不落在引用式链接定义「之前」，也不落在松散列表项之间
// （见 boundaryIsUnsafe）。仍无法覆盖的情形（例如定义出现在文档最前、跨块的紧列表
// 续项、跨块 HTML 块）只能保持现状；窗口化与整篇渲染的语义并非完全等价。

function nextNonEmptyLine(text: string, from: number): string | null {
  let i = from;
  while (i < text.length) {
    const newlineIndex = text.indexOf("\n", i);
    const end = newlineIndex === -1 ? text.length : newlineIndex;
    const trimmed = text.slice(i, end).trim();
    if (trimmed !== "") return trimmed;
    if (newlineIndex === -1) return null;
    i = newlineIndex + 1;
  }
  return null;
}

/** `[label]: url` 引用式链接/图片定义（最多 3 空格缩进，CommonMark 允许）。 */
const REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]]+\]:/;

/** 列表项类型；有序列表用分隔符区分，避免 `1.` 与 `1)` 混判。 */
function markdownListKind(line: string): string | null {
  const match = line.match(/^(?:([-*+])|(\d+)([.)]))\s+/);
  if (!match) return null;
  if (match[1]) return `ul:${match[1]}`;
  return `ol:${match[3]}`;
}

/**
 * 该空行边界是否不安全（应推迟到下一个边界再切）。
 * - 边界后紧跟引用式定义：定义必须与前面的引用同块，否则链接解析失败。
 * - 边界前后都是同种列表项：这是松散列表的内部空行，切开会被渲染成多个列表。
 */
function boundaryIsUnsafe(text: string, boundary: number, previousNonEmptyLine: string | null): boolean {
  const next = nextNonEmptyLine(text, boundary);
  if (!next) return false;
  if (REFERENCE_DEFINITION_RE.test(next)) return true;
  const current = previousNonEmptyLine ? markdownListKind(previousNonEmptyLine) : null;
  const upcoming = markdownListKind(next);
  return current != null && current === upcoming;
}

export function takeCompleteMarkdownChunk(
  text: string,
  { minChars = 16384 }: { minChars?: number } = {},
): { complete: string; rest: string } | null {
  if (!text) return null;
  let fence = "";
  let previousNonEmptyLine: string | null = null;
  let i = 0;
  const len = text.length;
  while (i < len) {
    const newlineIndex = text.indexOf("\n", i);
    const lineEnd = newlineIndex === -1 ? len : newlineIndex;
    const line = text.slice(i, lineEnd);
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      if (!fence) fence = char;
      else if (fence === char) fence = "";
    }
    // 顶层空行 = 块边界（围栏内不算）
    if (!fence && trimmed === "") {
      const boundary = newlineIndex === -1 ? len : newlineIndex + 1;
      if (boundary >= minChars && !boundaryIsUnsafe(text, boundary, previousNonEmptyLine)) {
        return { complete: text.slice(0, boundary), rest: text.slice(boundary) };
      }
    } else if (trimmed !== "") {
      previousNonEmptyLine = trimmed;
    }
    if (newlineIndex === -1) break;
    i = newlineIndex + 1;
  }
  return null;
}
