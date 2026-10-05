/**
 * 排版规格 → Word 文档主体 XML。
 *
 * 每一页是:一张铺满页面的背景图（原始扫描件，压在最底下）+ 若干个绝对定位的文本框，
 * 每个文本框对应排版层的一个块，用的是排版层算好的字号和基线间距。
 *
 * 文本框用 **DrawingML**（`wp:anchor` → `wps:wsp` → `wps:txbx`），不是 VML。
 * Python 那版用的是 VML（`v:shape`/`v:textbox`），有两个实际问题:
 *   - VML 是 Office 2007 之前的遗留格式，新版 Word 对它的支持一直在退化；
 *   - 更要紧的是 VML 文本框**不裁切**。字稍微排多一点就糊到相邻块上，而 DrawingML
 *     的 `bodyPr` 有 `vertOverflow="clip"`，多出来的会被裁掉而不是盖住别人。
 */

import { rawXml, xml } from "../vendor/visualtex/office/docx/ooxml/xml.ts";
import { latexToOmml } from "./formula.mjs";

const EMU_PER_POINT = 12700;
const TWIPS_PER_POINT = 20;

/**
 * 公式边界。
 *
 * `$$...$$` 放在前面:否则 `$$a$$` 会被当成两个空的行内公式。
 *
 * 行内那支的公式体写成 `(?:\\.|[^$\n])`，即**转义序列整体吞掉**。写成 `[^$\n]` 是
 * 不行的——那样公式体里就不能出现美元符，而 `$\$1.4$`（正文里的价格）就匹配不上，
 * 整串会被当字面文本印进文档。真实语料里就有这么一处。
 *
 * 转义按对吞掉之后，结尾的 `$` 一定是真的定界符，不需要再加 `(?<!\\)` 后顾。
 */
const MATH_RE = /\$\$([\s\S]+?)\$\$|(?<!\\)\$((?:\\.|[^$\n])+?)\$/g;

const emu = (pt) => Math.round(pt * EMU_PER_POINT);
const twips = (pt) => Math.round(pt * TWIPS_PER_POINT);
const halfPoints = (pt) => Math.max(1, Math.round(pt * 2));

function runProperties(block, fontFamily) {
  return xml("w:rPr", {}, [
    rawXml(xml("w:rFonts", {
      "w:ascii": fontFamily,
      "w:hAnsi": fontFamily,
      "w:eastAsia": fontFamily,
      "w:cs": fontFamily,
    })),
    block.bold ? rawXml(xml("w:b")) : undefined,
    block.bold ? rawXml(xml("w:bCs")) : undefined,
    rawXml(xml("w:sz", { "w:val": halfPoints(block.fontSizePt) })),
    rawXml(xml("w:szCs", { "w:val": halfPoints(block.fontSizePt) })),
  ]);
}

function textRun(text, block, fontFamily) {
  return xml("w:r", {}, [
    rawXml(runProperties(block, fontFamily)),
    // xml:space=preserve:行首行尾的空格是排版的一部分，丢了字就挤在一起。
    rawXml(xml("w:t", { "xml:space": "preserve" }, [text])),
  ]);
}

/**
 * 一行文字 → 若干个 run，公式部分换成原生 OMML。
 *
 * 公式转换失败时**保留原始 LaTeX 文本**而不是让整篇导出失败——一个写坏的公式不该
 * 毁掉整份文档，而且把源码显示出来，用户至少看得见那里本来是什么。失败会记进
 * `errors`，由调用方决定要不要报。
 */
function inlineRuns(line, block, fontFamily, errors) {
  const runs = [];
  let cursor = 0;
  MATH_RE.lastIndex = 0;
  for (let match = MATH_RE.exec(line); match; match = MATH_RE.exec(line)) {
    if (match.index > cursor) {
      runs.push(rawXml(textRun(line.slice(cursor, match.index), block, fontFamily)));
    }
    // `$$...$$` 和 `$...$` 产出一样的 OMML（见 formula.mjs）。正则要分开两支只是
    // 为了让 `$$a$$` 被当成**一个**公式吃掉，否则会解析成两个空的行内公式。
    const latex = match[1] !== undefined ? match[1] : match[2];
    try {
      const omml = latexToOmml(latex);
      runs.push(rawXml(omml));
    } catch (error) {
      errors.push({ blockId: block.id, latex, message: error.message });
      runs.push(rawXml(textRun(match[0], block, fontFamily)));
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < line.length) {
    runs.push(rawXml(textRun(line.slice(cursor), block, fontFamily)));
  }
  return runs;
}

function paragraph(line, block, fontFamily, errors) {
  const properties = [
    rawXml(xml("w:spacing", {
      "w:before": 0,
      "w:after": 0,
      // lineStepPt 是基线间距，由 Python 侧给出（读回译文 PDF 量到的，或 html_fit 按
      // 实测比值算的）。这里绝不自己拿 leading_em 折算——折算过一次，高 21%。
      "w:line": twips(block.lineStepPt),
      "w:lineRule": "exact",
    })),
    block.firstLineIndentPt > 0
      ? rawXml(xml("w:ind", { "w:firstLine": twips(block.firstLineIndentPt) }))
      : undefined,
    rawXml(xml("w:jc", { "w:val": block.justify ? "both" : "left" })),
  ];
  return xml("w:p", {}, [
    rawXml(xml("w:pPr", {}, properties)),
    ...inlineRuns(line, block, fontFamily, errors),
  ]);
}

function blockTextbox(block, pageIndex, blockIndex, fontFamily, errors) {
  const widthEmu = Math.max(EMU_PER_POINT, emu(block.rect.x1 - block.rect.x0));
  const heightEmu = Math.max(EMU_PER_POINT, emu(block.rect.y1 - block.rect.y0));
  const shapeId = 3000 + pageIndex * 10000 + blockIndex;
  const lines = block.text.split("\n");
  const content = lines.map((line) => rawXml(paragraph(line, block, fontFamily, errors)));

  return xml("w:r", {}, [
    rawXml(xml("w:drawing", {}, [
      rawXml(xml("wp:anchor", {
        distT: 0, distB: 0, distL: 0, distR: 0,
        simplePos: 0,
        // 比背景图（0）高，这样文字压在扫描件上面。
        relativeHeight: 251658240,
        behindDoc: 0, locked: 0, layoutInCell: 1, allowOverlap: 1,
      }, [
        rawXml(xml("wp:simplePos", { x: 0, y: 0 })),
        rawXml(xml("wp:positionH", { relativeFrom: "page" }, [
          rawXml(xml("wp:posOffset", {}, [emu(block.rect.x0)])),
        ])),
        rawXml(xml("wp:positionV", { relativeFrom: "page" }, [
          rawXml(xml("wp:posOffset", {}, [emu(block.rect.y0)])),
        ])),
        rawXml(xml("wp:extent", { cx: widthEmu, cy: heightEmu })),
        rawXml(xml("wp:effectExtent", { l: 0, t: 0, r: 0, b: 0 })),
        rawXml(xml("wp:wrapNone")),
        rawXml(xml("wp:docPr", {
          id: shapeId,
          name: `block ${pageIndex + 1}-${blockIndex}${block.id ? ` ${block.id}` : ""}`,
        })),
        rawXml(xml("wp:cNvGraphicFramePr")),
        rawXml(xml("a:graphic", {}, [
          rawXml(xml("a:graphicData", {
            uri: "http://schemas.microsoft.com/office/word/2010/wordprocessingShape",
          }, [
            rawXml(xml("wps:wsp", {}, [
              rawXml(xml("wps:cNvSpPr", { txBox: 1 })),
              rawXml(xml("wps:spPr", {}, [
                rawXml(xml("a:xfrm", {}, [
                  rawXml(xml("a:off", { x: 0, y: 0 })),
                  rawXml(xml("a:ext", { cx: widthEmu, cy: heightEmu })),
                ])),
                rawXml(xml("a:prstGeom", { prst: "rect" }, [rawXml(xml("a:avLst"))])),
                // 不透明白底:把背景图里的原文盖掉，否则译文和原文叠在一起。
                rawXml(xml("a:solidFill", {}, [rawXml(xml("a:srgbClr", { val: "FFFFFF" }))])),
                rawXml(xml("a:ln", {}, [rawXml(xml("a:noFill"))])),
              ])),
              rawXml(xml("wps:txbx", {}, [rawXml(xml("w:txbxContent", {}, content))])),
              rawXml(xml("wps:bodyPr", {
                rot: 0,
                spcFirstLastPara: 0,
                // 排多了就裁掉，不要糊到相邻块上。VML 那版做不到这一点。
                vertOverflow: "clip",
                horzOverflow: "clip",
                vert: "horz",
                wrap: "square",
                lIns: 0, tIns: 0, rIns: 0, bIns: 0,
                anchor: "t",
              }, [rawXml(xml("a:noAutofit"))])),
            ])),
          ])),
        ])),
      ])),
    ])),
  ]);
}

function pageBackground(relationshipId, pageIndex, widthPt, heightPt) {
  const widthEmu = emu(widthPt);
  const heightEmu = emu(heightPt);
  return xml("w:r", {}, [
    rawXml(xml("w:drawing", {}, [
      rawXml(xml("wp:anchor", {
        distT: 0, distB: 0, distL: 0, distR: 0,
        simplePos: 0,
        relativeHeight: 0,
        // behindDoc + locked:背景图压在最底下，而且不让用户误拖动。
        behindDoc: 1, locked: 1, layoutInCell: 1, allowOverlap: 1,
      }, [
        rawXml(xml("wp:simplePos", { x: 0, y: 0 })),
        rawXml(xml("wp:positionH", { relativeFrom: "page" }, [rawXml(xml("wp:posOffset", {}, [0]))])),
        rawXml(xml("wp:positionV", { relativeFrom: "page" }, [rawXml(xml("wp:posOffset", {}, [0]))])),
        rawXml(xml("wp:extent", { cx: widthEmu, cy: heightEmu })),
        rawXml(xml("wp:effectExtent", { l: 0, t: 0, r: 0, b: 0 })),
        rawXml(xml("wp:wrapNone")),
        rawXml(xml("wp:docPr", { id: 1000 + pageIndex, name: `page ${pageIndex + 1}` })),
        rawXml(xml("wp:cNvGraphicFramePr", {}, [
          rawXml(xml("a:graphicFrameLocks", { noChangeAspect: 1 })),
        ])),
        rawXml(xml("a:graphic", {}, [
          rawXml(xml("a:graphicData", {
            uri: "http://schemas.openxmlformats.org/drawingml/2006/picture",
          }, [
            rawXml(xml("pic:pic", {}, [
              rawXml(xml("pic:nvPicPr", {}, [
                rawXml(xml("pic:cNvPr", { id: 2000 + pageIndex, name: `page-${pageIndex + 1}` })),
                rawXml(xml("pic:cNvPicPr")),
              ])),
              rawXml(xml("pic:blipFill", {}, [
                rawXml(xml("a:blip", { "r:embed": relationshipId })),
                rawXml(xml("a:stretch", {}, [rawXml(xml("a:fillRect"))])),
              ])),
              rawXml(xml("pic:spPr", {}, [
                rawXml(xml("a:xfrm", {}, [
                  rawXml(xml("a:off", { x: 0, y: 0 })),
                  rawXml(xml("a:ext", { cx: widthEmu, cy: heightEmu })),
                ])),
                rawXml(xml("a:prstGeom", { prst: "rect" }, [rawXml(xml("a:avLst"))])),
              ])),
            ])),
          ])),
        ])),
      ])),
    ])),
  ]);
}

function sectionProperties(page) {
  return xml("w:sectPr", {}, [
    rawXml(xml("w:pgSz", { "w:w": twips(page.widthPt), "w:h": twips(page.heightPt) })),
    // 页边距全 0:所有内容都是按页面坐标绝对定位的，留白只会让 Word 觉得页面放不下。
    rawXml(xml("w:pgMar", {
      "w:top": 0, "w:right": 0, "w:bottom": 0, "w:left": 0,
      "w:header": 0, "w:footer": 0, "w:gutter": 0,
    })),
  ]);
}

/**
 * 一页的宿主段落。
 *
 * 所有锚定对象都挂在这一个段落上，而这个段落本身必须**不占高度**——`w:line=1` +
 * `exact` 就是干这个的。不这么做的话每页会多出一个空行，页面内容整体下移。
 */
function hostParagraph(runs, page, isLast) {
  return xml("w:p", {}, [
    rawXml(xml("w:pPr", {}, [
      rawXml(xml("w:spacing", { "w:before": 0, "w:after": 0, "w:line": 1, "w:lineRule": "exact" })),
      // 最后一页的 sectPr 由 buildDocxPackage 放在 body 末尾，这里只给前面的页断。
      isLast ? undefined : rawXml(sectionProperties(page)),
    ])),
    ...runs,
  ]);
}

/**
 * @returns {{ body: string, errors: Array, textboxCount: number, formulaCount: number }}
 */
export function buildBody(spec, mediaByPageIndex) {
  const errors = [];
  const paragraphs = [];
  let textboxCount = 0;
  let formulaCount = 0;

  spec.pages.forEach((page, index) => {
    const runs = [];
    const media = mediaByPageIndex.get(page.pageIndex);
    if (media) {
      runs.push(rawXml(pageBackground(media.relationshipId, page.pageIndex, page.widthPt, page.heightPt)));
    }
    page.blocks.forEach((block, blockIndex) => {
      formulaCount += (block.text.match(MATH_RE) || []).length;
      MATH_RE.lastIndex = 0;
      runs.push(rawXml(blockTextbox(block, page.pageIndex, blockIndex, spec.font.family, errors)));
      textboxCount += 1;
    });
    paragraphs.push(hostParagraph(runs, page, index === spec.pages.length - 1));
  });

  return { body: paragraphs.join(""), errors, textboxCount, formulaCount };
}

export { sectionProperties };
