/**
 * 已经做好的功能得让人看得见。
 *
 * 复制 / 重新生成 / 切版本 / 编辑提问都做完了，但操作条的 opacity 是 0，桌面上不把鼠标
 * 移上去就完全不知道它们存在。更糟的是 hover 规则只写了 `.home-ask-msg-assistant:hover`
 * ——挂在**用户消息**上的编辑入口因此永远是 opacity 0，元素在、看不见、点不到。（我
 * 之前的浏览器验证是按坐标点的，所以没暴露出来。）
 *
 * 另外两条也在这里钉：缺凭据的提示不该在同一屏出现两次；标题得真的分得出层级。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const css = readFileSync(
  new URL("../../src/styles/pages/home/home-ask.css", import.meta.url), "utf8",
);
const composerHook = readFileSync(
  new URL("../../src/features/ask/ui/use-home-ask-composer.ts", import.meta.url), "utf8",
);

/** 取一条规则的声明块。 */
function block(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[2] || "";
}

/** 取 `.home-ask-md :where(hN)` 的字号，单位 em。 */
function headingEm(tag) {
  const m = css.match(new RegExp(`\\.home-ask-md :where\\(${tag}\\)\\s*\\{[^}]*font-size:\\s*([\\d.]+)em`));
  return m ? Number(m[1]) : null;
}

describe("消息操作条的可发现性", () => {
  it("默认不是全隐——全隐等于这些功能不存在", () => {
    const opacity = Number(block(".home-ask-msg-actions").match(/opacity:\s*([\d.]+)/)?.[1]);
    assert.ok(opacity > 0, `操作条默认 opacity 是 ${opacity}`);
  });

  it("hover 规则覆盖用户消息，不只是回答", () => {
    // `.home-ask-msg-assistant:hover` 这种写法会把用户消息上的编辑入口永久藏起来。
    assert.ok(
      /\.home-ask-msg:hover \.home-ask-msg-actions/.test(css),
      "hover 规则仍然只挂在回答上，用户消息的编辑入口点不到",
    );
  });

  it("触屏下全显——没有 hover 的设备上藏起来就是永远点不到", () => {
    assert.match(css, /@media \(hover: none\)[\s\S]{0,200}opacity:\s*1/);
  });

  it("hover 时到全不透明", () => {
    assert.match(css, /\.home-ask-msg-actions:focus-within\s*\{\s*opacity:\s*1/);
  });
});

describe("回答的标题层级", () => {
  it("四级标题字号严格递减", () => {
    const sizes = ["h1", "h2", "h3", "h4"].map(headingEm);
    assert.ok(sizes.every((s) => typeof s === "number"), `缺字号: ${sizes}`);
    for (let i = 1; i < sizes.length; i += 1) {
      assert.ok(sizes[i] < sizes[i - 1], `h${i + 1} 不比 h${i} 小: ${sizes}`);
    }
  });

  it("h1 和正文拉开足够差距——原来只差 1.15 倍，一篇带小标题的回答读起来是一坨", () => {
    assert.ok(headingEm("h1") >= 1.3, `h1 只有 ${headingEm("h1")}em`);
  });

  it("相邻层级之间看得出差别", () => {
    assert.ok(headingEm("h1") - headingEm("h2") >= 0.1);
    assert.ok(headingEm("h2") - headingEm("h3") >= 0.1);
  });
});

describe("表格", () => {
  it("表头有底线，不只靠字重", () => {
    assert.match(block(".home-ask-md :where(th)"), /border-bottom/);
  });

  it("单元格有内边距——贴在一起读不出列", () => {
    const padding = css.match(/\.home-ask-md :where\(th\),\s*\n\.home-ask-md :where\(td\)\s*\{[^}]*padding:/);
    assert.ok(padding, "th/td 没有内边距");
  });
});

describe("缺凭据的提示", () => {
  it("只由横幅说一次，输入框下面不再重复", () => {
    // 横幅就在上面几十像素处，而且带「打开设置」按钮；再说一遍是同一句话的
    // 不带动作的副本。
    const hint = composerHook.match(/const scopeHint = \(\(\) => \{([\s\S]*?)\}\)\(\);/)?.[1] || "";
    assert.ok(hint, "找不到 scopeHint");
    assert.ok(
      !hint.includes("credentialMessage"),
      "输入框下方仍然重复了凭据提示",
    );
  });

  it("横幅那条还在——去重不是把提示删光", () => {
    const composer = readFileSync(
      new URL("../../src/features/ask/ui/HomeAskComposer.tsx", import.meta.url), "utf8",
    );
    assert.match(composer, /HomeAskComposerBanner[\s\S]{0,120}message=\{credentialMessage\}/);
  });
});
