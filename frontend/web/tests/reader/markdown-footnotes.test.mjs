import test from "node:test";
import assert from "node:assert/strict";

const { normalizeMarkdownFootnotes } = await import(
  "../../../../frontend/packages/reader/src/shared/content/markdown-footnotes.ts",
);

test("standard Markdown footnotes become internal anchors and a return link", () => {
  const html = normalizeMarkdownFootnotes("正文[^1]。\n\n[^1]: 这是脚注。\n    第二行。\n");
  assert.match(html, /id="reader-md-footnote-ref-1"/);
  assert.match(html, /href="#reader-md-footnote-1"/);
  assert.match(html, /id="reader-md-footnote-1"/);
  assert.match(html, /这是脚注。\n\s+第二行。/);
  assert.match(html, /href="#reader-md-footnote-ref-1"/);
  assert.doesNotMatch(html, /\[\^1\]:/);
});

test("footnote-looking text inside fenced code remains code", () => {
  const source = "```md\n[^1]: keep this literal\n```\n\n正文[^1]";
  const html = normalizeMarkdownFootnotes(source);
  assert.match(html, /```md\n\[\^1\]: keep this literal\n```/);
  assert.doesNotMatch(html, /reader-md-footnote-ref-1/);
  assert.match(html, /正文\[\^1\]/);
});

test("footnote-looking text inside inline code remains code", () => {
  const html = normalizeMarkdownFootnotes("Use `[^1]` as a literal.\n\n[^1]: real note");
  assert.match(html, /`\[\^1\]`/);
  assert.doesNotMatch(html, /<sup[^>]*>\[1\]/);
});

test("repeated footnote markers get distinct return anchors", () => {
  const html = normalizeMarkdownFootnotes("A[^1] B[^1]\n\n[^1]: note");
  assert.match(html, /reader-md-footnote-ref-1/);
  assert.match(html, /reader-md-footnote-ref-1-2/);
});

test("footnote content stays Markdown so marked can render links and inline code", () => {
  const html = normalizeMarkdownFootnotes("正文[^note]\n\n[^NOTE]: **重点** [来源](https://example.com)\n    `代码`");
  assert.match(html, /\*\*重点\*\*/);
  assert.match(html, /\[来源\]\(https:\/\/example\.com\)/);
  assert.match(html, /`代码`/);
  assert.match(html, /reader-md-footnote-ref-note/);
});
