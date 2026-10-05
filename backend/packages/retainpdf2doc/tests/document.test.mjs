/**
 * 排版规格 → 文档:位置、字号、行距、分节、背景图。
 *
 * 钉的是产出的 OOXML 里**真的有那些数**，不是某个纯函数的返回值——排版类的错误几乎
 * 都出在「算对了但没写进文档」这一段。
 */

import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it, before } from "node:test";
import { unzipSync, strFromU8 } from "fflate";

import { buildLayoutDocx } from "../src/index.mjs";

// 1x1 白色 PNG。
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const EMU_PER_POINT = 12700;
const TWIPS_PER_POINT = 20;

function spec(overrides = {}) {
  return {
    version: 1,
    job: { id: "t", title: "测试" },
    font: { family: "Source Han Serif SC", mathFamily: "Cambria Math" },
    pages: [
      {
        pageIndex: 0,
        widthPt: 595.276,
        heightPt: 841.89,
        background: { path: "page-001.png" },
        blocks: [{
          id: "b1",
          rect: [72, 144, 400, 200],
          text: "正文 $\\mathbf{2a}$ 结束。",
          fontSizePt: 10.5,
          lineStepPt: 13.53,
          bold: false,
          justify: true,
          firstLineIndentPt: 0,
        }],
      },
      {
        pageIndex: 1,
        widthPt: 400,
        heightPt: 600,
        background: null,
        blocks: [{
          id: "b2",
          rect: [10, 20, 300, 60],
          text: "第二页",
          fontSizePt: 8,
          lineStepPt: 10.3,
          bold: true,
          justify: false,
          firstLineIndentPt: 21,
        }],
      },
    ],
    ...overrides,
  };
}

let documentXml;
let parts;

before(async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "retainpdf2doc-"));
  await writeFile(path.join(dir, "page-001.png"), PNG);
  const result = await buildLayoutDocx(spec(), { baseDir: dir });
  parts = unzipSync(result.bytes);
  documentXml = strFromU8(parts["word/document.xml"]);
});

describe("文档结构", () => {
  it("文本框是 DrawingML，不是 VML", () => {
    // 换掉 VML 有两个实际原因:它是 2007 前的遗留格式，而且**不裁切**——字排多一点
    // 就糊到相邻块上。DrawingML 的 bodyPr 有 vertOverflow=clip。
    assert.ok(!documentXml.includes("<v:shape"), "还在用 VML 形状");
    assert.ok(!documentXml.includes("<v:textbox"), "还在用 VML 文本框");
    assert.ok(documentXml.includes("<wps:txbx>"), "没有 DrawingML 文本框");
    assert.ok(documentXml.includes('vertOverflow="clip"'), "文本框没设裁切，会糊到相邻块");
  });

  it("块按规格里的坐标绝对定位（相对页面）", () => {
    const x = 72 * EMU_PER_POINT;
    const y = 144 * EMU_PER_POINT;
    assert.ok(documentXml.includes(`<wp:posOffset>${x}</wp:posOffset>`), `没有 x=${x} 的定位`);
    assert.ok(documentXml.includes(`<wp:posOffset>${y}</wp:posOffset>`), `没有 y=${y} 的定位`);
    assert.ok(documentXml.includes('relativeFrom="page"'), "定位不是相对页面的");
  });

  it("字号和行距照搬规格，不在这边二次折算", () => {
    // 行距曾经在导出侧按 (1+leading_em) 自己折算，系统性高 21%。现在上游给什么就是什么。
    assert.ok(documentXml.includes(`w:val="${Math.round(10.5 * 2)}"`), "10.5pt 的字号没写进去");
    assert.ok(
      documentXml.includes(`w:line="${Math.round(13.53 * TWIPS_PER_POINT)}"`),
      "13.53pt 的行距没写进去",
    );
    assert.ok(documentXml.includes('w:lineRule="exact"'), "行距不是 exact，Word 会自己加高");
  });

  it("每页一节，各自用自己的页面尺寸", () => {
    const first = `w:w="${Math.round(595.276 * TWIPS_PER_POINT)}"`;
    const second = `w:w="${Math.round(400 * TWIPS_PER_POINT)}"`;
    assert.ok(documentXml.includes(first), "第一页的页宽没写进去");
    assert.ok(documentXml.includes(second), "第二页的页宽没写进去——各页尺寸可以不同");
    assert.equal((documentXml.match(/<w:sectPr>/g) || []).length, 2, "分节数不对");
  });

  it("宿主段落不占高度，否则每页内容整体下移", () => {
    assert.ok(documentXml.includes('w:line="1" w:lineRule="exact"'), "宿主段落会占一行的高");
  });

  it("背景图进包并被引用；没有背景图的页不引用", () => {
    assert.ok(parts["word/media/page-0001.png"], "背景图没进包");
    assert.ok(!parts["word/media/page-0002.png"], "第二页没有背景图，却进了包");
    assert.ok(documentXml.includes('r:embed="rIdBg0"'), "背景图没被引用");
    assert.ok(documentXml.includes('behindDoc="1"'), "背景图没有压在文字下面");
  });

  it("加粗、两端对齐、首行缩进都落到文档里", () => {
    assert.ok(documentXml.includes("<w:b/>"), "加粗没写进去");
    assert.ok(documentXml.includes('w:val="both"'), "两端对齐没写进去");
    assert.ok(
      documentXml.includes(`w:firstLine="${Math.round(21 * TWIPS_PER_POINT)}"`),
      "首行缩进没写进去",
    );
  });

  it("文本框声明的字体就是规格给的那个", () => {
    // 必须和 Python 侧量宽度用的字体一致，否则 Word 按别的字体折行，算出来的字号
    // 就失去依据。
    assert.ok(documentXml.includes('w:eastAsia="Source Han Serif SC"'), "东亚字体不对");
    assert.ok(documentXml.includes('w:ascii="Source Han Serif SC"'), "拉丁字体不对");
  });

  it("公式是原生 OMML，不是文字", () => {
    // 匹配 `<m:oMath` 而不是 `<m:oMath>`:vendor 的转换器会在每个公式上再声明一遍
    // xmlns:m/xmlns:w。冗余但合法（文档根上已有同名声明），而且这些重复串在 zip 里
    // 压得很好，不值得为省几十 KB 去剥。
    assert.ok(documentXml.includes("<m:oMath"), "没有原生公式");
    assert.ok(documentXml.includes("<m:sty m:val=\"b\"/>"), "\\mathbf 没有变成粗体样式");
    assert.ok(!documentXml.includes("mathbf"), "命令名被当成文字印出来了");
  });

  it("数学字体随文档嵌入，不只是写个名字", () => {
    // 只写名字的话，目标机器没装这个字体时 Word 会拿普通字体替换，而普通字体没有
    // 数学字形——积分号、求和号、可伸缩括号会变成豆腐块。Cambria Math 只在 Windows
    // 版 Office 自带，macOS Word / LibreOffice / WPS 上都不一定有。
    const fontTable = parts["word/fontTable.xml"];
    assert.ok(fontTable, "没有 fontTable.xml，字体没嵌进来");
    const xml = strFromU8(fontTable);
    assert.ok(xml.includes('w:name="Latin Modern Math"'), "fontTable 里没声明数学字体");
    assert.ok(xml.includes("embedRegular"), "字体只是声明了名字，没有真的嵌入");
    const embedded = Object.keys(parts).filter((name) => name.endsWith(".odttf"));
    assert.equal(embedded.length, 1, `嵌入的字体文件有 ${embedded.length} 个`);
    assert.ok(parts[embedded[0]].length > 100_000, "嵌入的字体文件小得不像真字体");
    assert.ok(documentXml.includes('w:ascii="Latin Modern Math"'), "公式没有声明数学字体");
  });

  it("保留排版的导出不带页眉页脚——它们会把绝对定位的内容挤走", () => {
    assert.ok(!documentXml.includes("<w:headerReference"), "引用了页眉");
    assert.ok(!documentXml.includes("<w:footerReference"), "引用了页脚");
  });
});

describe("规格校验", () => {
  it("公式坏掉时保留原始 LaTeX，而不是让整篇失败", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "retainpdf2doc-bad-"));
    const broken = spec();
    broken.pages = [broken.pages[1]];
    broken.pages[0].blocks[0].text = "坏的 $\\thiscommanddoesnotexist{x}$ 结束";
    const result = await buildLayoutDocx(broken, { baseDir: dir });
    assert.ok(result.bytes.length > 0, "整篇导出被一个坏公式毁了");
  });

  it("背景图读不到时报出是哪一页", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "retainpdf2doc-missing-"));
    await assert.rejects(
      () => buildLayoutDocx(spec(), { baseDir: dir }),
      /第 1 页的背景图读不到/,
    );
  });
});


describe("公式边界", () => {
  it("公式体里的转义美元不会让整串掉回字面文本", async () => {
    // 真实语料里有一处：`总反应成本约为 $\$1.4$。`——公式体里是个转义的美元符（价格）。
    // 第一版正则的公式体写成 `[^$\n]`，把美元符整个排除了，于是匹配不上，整串
    // `$\$1.4$` 会被当字面文本印进文档。
    const dir = await mkdtemp(path.join(tmpdir(), "retainpdf2doc-escaped-"));
    const withEscape = spec();
    withEscape.pages = [withEscape.pages[1]];
    withEscape.pages[0].blocks[0].text = "总反应成本约为 $\\$1.4$。";
    const result = await buildLayoutDocx(withEscape, { baseDir: dir });
    const xml = strFromU8(unzipSync(result.bytes)["word/document.xml"]);
    assert.equal(result.formulaCount, 1, "转义美元的公式没被认出来");
    assert.ok(xml.includes("<m:oMath"), "没有产出原生公式");
    assert.ok(!xml.includes("$1.4$"), "整串被当字面文本印出来了");
  });

  it("`$$...$$` 当成一个公式，不是两个空的", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "retainpdf2doc-display-"));
    const display = spec();
    display.pages = [display.pages[1]];
    display.pages[0].blocks[0].text = "行间 $$x^2+y^2=z^2$$ 结束";
    const result = await buildLayoutDocx(display, { baseDir: dir });
    assert.equal(result.formulaCount, 1, `认成了 ${result.formulaCount} 个公式`);
  });
});
