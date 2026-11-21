// 下载文件名「类型前缀_书名_后缀」的前端镜像 —— 真值在后端
// backend/packages/retainpdf-files/src/download_names.rs（下载时以响应头为准）。这里只用来在文件页
// 列表里预先写出「下载下来会叫什么」，免得列表写 `…-side-by-side.pdf`、下载下来却是
// `dual_…_side-by-side.pdf`。两边的测试用同一组例子，改规则要两边一起改。

export type DownloadKind =
  | "source"
  | "translated"
  | "side-by-side"
  | "layout"
  | "ocr-markdown"
  | "markdown-bundle"
  | "bundle";

const RULES: Record<DownloadKind, { prefix: string | null; suffix: string; ext: string }> = {
  source: { prefix: "orig", suffix: "source", ext: "pdf" },
  translated: { prefix: "zh", suffix: "translated", ext: "pdf" },
  "side-by-side": { prefix: "dual", suffix: "side-by-side", ext: "pdf" },
  layout: { prefix: "zh", suffix: "layout", ext: "docx" },
  "ocr-markdown": { prefix: "orig", suffix: "ocr", ext: "md" },
  "markdown-bundle": { prefix: "orig", suffix: "markdown", ext: "zip" },
  bundle: { prefix: null, suffix: "bundle", ext: "zip" },
};

/** 文件页条目的 artifact_key → 命名类型。不在表里的（排查用文件）保持原名。 */
export const DOWNLOAD_KIND_BY_ARTIFACT_KEY: Record<string, DownloadKind> = {
  translated_pdf: "translated",
  side_by_side_pdf: "side-by-side",
  layout_docx: "layout",
  markdown_raw: "ocr-markdown",
  markdown_bundle_zip: "markdown-bundle",
  artifact_bundle_zip: "bundle",
};

/** 书名部分最多这么多 UTF-8 字节（和后端 MAX_TITLE_BYTES 一致），按字节截、不切断字符。 */
const MAX_TITLE_BYTES = 180;
const utf8Length = (ch: string) => new TextEncoder().encode(ch).length;

function cleanTitle(title: string): string {
  const trimmed = `${title || ""}`.replace(/\uFEFF/g, " ").trim().replace(/\.pdf$/i, "");
  const replaced = Array.from(trimmed)
    .map((ch) => (/[\\/:*?"<>|]/.test(ch) || /[\u0000-\u001f\u007f-\u009f]/.test(ch) ? " " : ch))
    .join("");
  const collapsed = replaced.split(/\s+/).filter(Boolean).join(" ");
  let truncated = "";
  let bytes = 0;
  for (const ch of collapsed) {
    const size = utf8Length(ch);
    if (bytes + size > MAX_TITLE_BYTES) break;
    truncated += ch;
    bytes += size;
  }
  const cleaned = truncated.trim().replace(/^\.+|\.+$/g, "").trim();
  return cleaned || "document";
}

export function downloadFileName(title: string, kind: DownloadKind): string {
  const rule = RULES[kind];
  const base = cleanTitle(title);
  return rule.prefix ? `${rule.prefix}_${base}_${rule.suffix}.${rule.ext}` : `${base}_${rule.suffix}.${rule.ext}`;
}
