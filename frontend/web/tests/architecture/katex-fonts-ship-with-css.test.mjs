/**
 * KaTeX 的字体必须跟着 CSS 一起发布。
 *
 * 真实故障:公式渲染「很丑」——括号撑不开、求和号大小不对、字形全错。查 DOM 查不出
 * 问题:display 模式生效、`large-op` 在、`delimsizing` 在、katex.min.css 也在产物里,
 * markstream 对三种 `$$` 写法的分类全部正确。
 *
 * 缺的是字体文件本身。`katex.min.css` 经 `@retainpdf/reader/ai.css` 内联进三个入口,
 * 里面写的是 `url(fonts/KaTeX_*.woff2)`——相对 CSS 文件解析,也就是 `dist/css/fonts/`。
 * 而字体只存在于 node_modules,浏览器请求全部 404。
 *
 * KaTeX 的排版完全依赖自己的字体:括号靠字体里的专用拼接字符撑高（Size1–Size4 字族）、
 * 大号运算符是独立字形、数学斜体与正体是不同字族。404 之后全部回退到浏览器默认衬线体,
 * 结构正常、观感全错——这类故障从 DOM 上是查不出来的,所以要在构建产物这一层钉住。
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const WEB_ROOT = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const CSS_DIR = join(WEB_ROOT, "dist/css");
const FONTS_DIR = join(CSS_DIR, "fonts");

// 撑高定界符要用的字族。少了 Size4，大括号和积分号就撑不起来。
const REQUIRED = [
  "KaTeX_Main-Regular",
  "KaTeX_Math-Italic",
  "KaTeX_Size1-Regular",
  "KaTeX_Size2-Regular",
  "KaTeX_Size3-Regular",
  "KaTeX_Size4-Regular",
  "KaTeX_AMS-Regular",
];

describe("KaTeX 字体随产物发布", () => {
  it("CSS 里确实引用了相对路径的字体", () => {
    const entries = readdirSync(CSS_DIR).filter((name) => name.endsWith(".css"));
    const referencing = entries.filter((name) =>
      /url\(fonts\/KaTeX_/.test(readFileSync(join(CSS_DIR, name), "utf8")),
    );
    assert.ok(
      referencing.length > 0,
      `没有入口引用 KaTeX 字体，本测试的前提已失效：${entries.join(", ")}`,
    );
  });

  it("每个必需字族都在 dist/css/fonts 里", () => {
    assert.ok(existsSync(FONTS_DIR), "dist/css/fonts 不存在——公式会回退到默认字体");
    const shipped = new Set(readdirSync(FONTS_DIR));
    for (const family of REQUIRED) {
      assert.ok(
        shipped.has(`${family}.woff2`),
        `缺少 ${family}.woff2——浏览器请求会 404，公式排版会坏掉`,
      );
    }
  });

  it("字体不是空文件", () => {
    for (const family of REQUIRED) {
      const bytes = readFileSync(join(FONTS_DIR, `${family}.woff2`)).length;
      assert.ok(bytes > 1000, `${family}.woff2 只有 ${bytes} 字节，像是拷贝失败`);
    }
  });
});
