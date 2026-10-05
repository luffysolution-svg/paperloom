import type {
  DocxFontFamily,
  DocxParagraphStyleDefinition,
  DocxTheme,
} from "../config/index.ts";
import { OOXML_NAMESPACES } from "../ooxml/schema.ts";
import { rawXml, xml, xmlDocument } from "../ooxml/xml.ts";

function fontProperties(font: DocxFontFamily) {
  return xml("w:rFonts", {
    "w:ascii": font.ascii,
    "w:hAnsi": font.ascii,
    "w:eastAsia": font.eastAsia,
    "w:cs": font.complexScript,
  });
}

function runProperties(
  font: DocxFontFamily,
  fontSizePt: number,
  color: string,
  definition: Pick<DocxParagraphStyleDefinition, "bold" | "italic"> = {},
) {
  const halfPoints = fontSizePt * 2;
  return xml("w:rPr", {}, [
    rawXml(fontProperties(font)),
    rawXml(xml("w:sz", { "w:val": halfPoints })),
    rawXml(xml("w:szCs", { "w:val": halfPoints })),
    rawXml(xml("w:color", { "w:val": color })),
    definition.bold ? rawXml(xml("w:b")) : null,
    definition.italic ? rawXml(xml("w:i")) : null,
  ]);
}

function paragraphProperties(definition: DocxParagraphStyleDefinition) {
  return xml("w:pPr", {}, [
    definition.keepNext ? rawXml(xml("w:keepNext")) : null,
    rawXml(xml("w:spacing", {
      "w:before": definition.spacingBeforeTwips,
      "w:after": definition.spacingAfterTwips,
      "w:line": definition.lineTwips,
      "w:lineRule": definition.lineTwips === undefined ? undefined : "auto",
    })),
    definition.outlineLevel === undefined
      ? null
      : rawXml(xml("w:outlineLvl", { "w:val": definition.outlineLevel })),
    definition.indentLeftTwips === undefined && definition.indentRightTwips === undefined
      ? null
      : rawXml(xml("w:ind", {
          "w:left": definition.indentLeftTwips,
          "w:right": definition.indentRightTwips,
        })),
  ]);
}

function namedStyle(definition: DocxParagraphStyleDefinition, theme: DocxTheme) {
  return xml("w:style", { "w:type": "paragraph", "w:styleId": definition.id }, [
    rawXml(xml("w:name", { "w:val": definition.name })),
    rawXml(xml("w:basedOn", { "w:val": definition.basedOn ?? "Normal" })),
    rawXml(xml("w:qFormat")),
    rawXml(paragraphProperties(definition)),
    rawXml(runProperties(
      definition.font ?? theme.bodyFont,
      definition.fontSizePt,
      definition.color,
      definition,
    )),
  ]);
}

export function buildStylesXml(theme: DocxTheme) {
  const defaultRunProperties = runProperties(
    theme.bodyFont,
    theme.bodyFontSizePt,
    theme.bodyColor,
  );
  const normalStyle = xml("w:style", {
    "w:type": "paragraph",
    "w:default": 1,
    "w:styleId": "Normal",
  }, [
    rawXml(xml("w:name", { "w:val": "Normal" })),
    rawXml(xml("w:qFormat")),
    rawXml(xml("w:pPr", {}, [
      rawXml(xml("w:spacing", {
        "w:after": theme.bodySpacingAfterTwips,
        "w:line": theme.bodyLineTwips,
        "w:lineRule": "auto",
      })),
    ])),
    rawXml(defaultRunProperties),
  ]);
  const root = xml("w:styles", { "xmlns:w": OOXML_NAMESPACES.word }, [
    rawXml(xml("w:docDefaults", {}, [
      rawXml(xml("w:rPrDefault", {}, [rawXml(defaultRunProperties)])),
    ])),
    rawXml(normalStyle),
    ...theme.paragraphStyles.map((style) => rawXml(namedStyle(style, theme))),
  ]);
  return xmlDocument(root);
}
