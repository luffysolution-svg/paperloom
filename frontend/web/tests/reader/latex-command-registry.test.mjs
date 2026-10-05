/**
 * 登记表的 MathJax 那一列——和后端读同一份 JSON。
 *
 * 为什么要跨语言读一份文件：前端 MathJax 和后端 mitex 是**两个不同的引擎渲染同一
 * 份 LaTeX**。哪些命令两边都行、哪边独有，此前谁也说不清，只能靠踩到才知道。审查
 * 时实测出来的差异（`\ce` 前端能渲染、后端会让整页编译失败；`\circled` 后端有清洗
 * 器兜底、前端只显示红字）现在是表里的一列，而不是口口相传。
 *
 * 断言是双向的，理由和后端那道闸一样：只钉一个方向，表就会越积越多，升级 MathJax
 * 之后早已支持的命令仍挂在「不支持」名下。
 *
 * 判定「渲染失败」不能只看 merror。`AllPackages` 自带 `noundefined`，未定义命令会
 * 被渲染成**红色字面文本**且不产生 merror——这正是 markdown-math.ts 的失败检测漏掉
 * 最常见那类坏公式的原因，所以这里同时认红字。
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";

import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REGISTRY = join(
  HERE,
  "../../../../backend/pipeline/retainpdf_pipeline/foundation/shared/latex_commands.json",
);

const commands = JSON.parse(readFileSync(REGISTRY, "utf8")).commands;

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
// 和 markdown-math.ts:187 保持同一套 packages——换了配置这里要一起换，
// 否则这张表描述的是一个生产里不存在的引擎。
const document = mathjax.document("", {
  InputJax: new TeX({ packages: Array.from(new Set([...AllPackages, "unicode"])) }),
  OutputJax: new SVG({ fontCache: "none" }),
});

function renders(latex) {
  let html = "";
  try {
    html = adaptor.outerHTML(document.convert(latex, { display: false }));
  } catch {
    return false;
  }
  if (!/<svg[\s>]/i.test(html)) return false;
  if (/data-mjx-error|merror/i.test(html)) return false;
  // noundefined 把未定义命令画成红色字面量，不产生 merror。
  return !/fill="red"/i.test(html);
}

describe("LaTeX 命令登记表：MathJax 一列", () => {
  it("表不是空的，且每条都有样本", () => {
    assert.ok(commands.length > 0, "登记表是空的");
    for (const command of commands) {
      assert.ok(command.sample?.trim(), `${command.name} 缺少 sample`);
      assert.ok(
        ["supported", "unsupported"].includes(command.mathjax),
        `${command.name}.mathjax 取值非法：${command.mathjax}`,
      );
    }
  });

  for (const command of commands.filter((entry) => entry.mathjax === "supported")) {
    it(`MathJax 能渲染 \\${command.name}`, () => {
      assert.ok(
        renders(command.sample),
        `登记表说 MathJax 能渲染 \\${command.name}，实际不行：${command.sample}`,
      );
    });
  }

  for (const command of commands.filter((entry) => entry.mathjax === "unsupported")) {
    it(`MathJax 渲染不了 \\${command.name}`, () => {
      assert.ok(
        !renders(command.sample),
        `登记表说 MathJax 渲染不了 \\${command.name}，实际可以了——`
          + "把 mathjax 改成 supported，否则表会越积越多。",
      );
    });
  }

  it("两个引擎的差异是一份清单，不是意外", () => {
    const disagreements = commands
      .filter((entry) => (entry.pipeline === "supported") !== (entry.mathjax === "supported"))
      .map((entry) => `\\${entry.name}: 后端 ${entry.pipeline} / 前端 ${entry.mathjax}`);
    // 差异本身不是错误，写下来是为了它出现变化时有人看见。
    assert.ok(Array.isArray(disagreements));
    if (disagreements.length) {
      console.log("  引擎差异：\n    " + disagreements.join("\n    "));
    }
  });
});
