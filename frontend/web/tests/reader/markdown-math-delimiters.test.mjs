/**
 * 定界符只认 `$` 和 `$$`，和后端保持一致。
 *
 * 前端此前还认 `\[...\]` 和 `\(...\)`。按 CommonMark，`\[` 是**转义的方括号**，不是
 * 公式定界符——我们自己的后端就这么用它（markdown_fallback.py 的 _escape_image_alt
 * 把字面 `[` `]` 转义成 `\[` `\]`），LLM 译文里写 `参见 \[1\] 与 \[2\]` 更是常态。
 * 当成公式的后果是一整段正文被劈成三块，中间两个引用编号变成居中的块级公式。
 *
 * 另一头也没有来源：渲染 PDF 的那条路（inline_math.py）无条件输出 `$...$`，cmarker
 * 同样只认 `$`。两边都不产出这两种写法，只有前端在认——一边认一边不认，同一份译文
 * 在阅读器里和导出的 PDF 里长得不一样。
 *
 * `$$` 留着：OCR 的 markdown fallback 对公式块产出的就是它。
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractMarkdownMath } from "../../src/features/reader/domain.js";

describe("Markdown 数学定界符", () => {
  it("转义方括号是正文，不是块级公式", () => {
    const { slots } = extractMarkdownMath("参见 \\[1\\] 与 \\[2\\] 的结论");
    assert.equal(slots.length, 0, `被当成公式了：${JSON.stringify(slots)}`);
  });

  it("转义圆括号同理", () => {
    const { slots } = extractMarkdownMath("见 \\(注1\\) 与 \\(注2\\)");
    assert.equal(slots.length, 0);
  });

  it("句中的转义方括号不会把段落劈开", () => {
    const source = "数组 a\\[i\\] 的第 i 项";
    const { text, slots } = extractMarkdownMath(source);
    assert.equal(slots.length, 0);
    assert.equal(text, source);
  });

  it("$$ 仍是块级公式——OCR fallback 产出的就是它", () => {
    const { slots } = extractMarkdownMath("公式 $$E=mc^2$$ 如上");
    assert.equal(slots.length, 1);
    assert.equal(slots[0].display, true);
    assert.equal(slots[0].tex, "E=mc^2");
  });

  it("$ 仍是行内公式", () => {
    const { slots } = extractMarkdownMath("行内 $\\alpha$ 正常");
    assert.equal(slots.length, 1);
    assert.equal(slots[0].display, false);
    assert.equal(slots[0].tex, "\\alpha");
  });
});
