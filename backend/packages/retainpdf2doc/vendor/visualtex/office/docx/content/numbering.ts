import { OOXML_NAMESPACES } from "../ooxml/schema.ts";
import type { DocxTheme } from "../config/index.ts";
import { rawXml, xml, xmlDocument } from "../ooxml/xml.ts";

function numberingLevel(level: number, format: "bullet" | "decimal", theme: DocxTheme) {
  const left = theme.listIndentStartTwips + level * theme.listIndentStepTwips;
  return xml("w:lvl", { "w:ilvl": level }, [
    rawXml(xml("w:start", { "w:val": 1 })),
    rawXml(xml("w:numFmt", { "w:val": format })),
    rawXml(xml("w:lvlText", { "w:val": format === "bullet" ? "•" : `%${level + 1}.` })),
    rawXml(xml("w:lvlJc", { "w:val": "left" })),
    rawXml(xml("w:pPr", {}, [
      rawXml(xml("w:tabs", {}, [
        rawXml(xml("w:tab", { "w:val": "num", "w:pos": left })),
      ])),
      rawXml(xml("w:ind", { "w:left": left, "w:hanging": theme.listHangingTwips })),
      rawXml(xml("w:spacing", {
        "w:after": theme.listSpacingAfterTwips,
        "w:line": theme.bodyLineTwips,
        "w:lineRule": "auto",
      })),
    ])),
    format === "bullet"
      ? rawXml(xml("w:rPr", {}, [
          rawXml(xml("w:rFonts", {
            "w:ascii": theme.bulletFont,
            "w:hAnsi": theme.bulletFont,
          })),
        ]))
      : null,
  ]);
}

function abstractNumbering(id: number, format: "bullet" | "decimal", theme: DocxTheme) {
  return xml("w:abstractNum", { "w:abstractNumId": id }, [
    rawXml(xml("w:multiLevelType", { "w:val": "multilevel" })),
    ...Array.from({ length: 9 }, (_, level) => rawXml(numberingLevel(level, format, theme))),
  ]);
}

function numberingInstance(id: number, abstractId: number) {
  return xml("w:num", { "w:numId": id }, [
    rawXml(xml("w:abstractNumId", { "w:val": abstractId })),
  ]);
}

export function buildNumberingXml(theme: DocxTheme) {
  return xmlDocument(xml("w:numbering", { "xmlns:w": OOXML_NAMESPACES.word }, [
    rawXml(abstractNumbering(0, "bullet", theme)),
    rawXml(abstractNumbering(1, "decimal", theme)),
    rawXml(numberingInstance(1, 0)),
    rawXml(numberingInstance(2, 1)),
  ]));
}
