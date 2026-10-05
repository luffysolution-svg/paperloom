import { strFromU8, unzipSync } from "fflate";
import { obfuscateEmbeddedFont } from "../../../core/office/embeddedFont.ts";
import {
  equalBytes,
  type EmbeddedFontPart,
  type EmbeddedOpenTypeFontInput,
} from "../fonts/fontEmbedding.ts";

export function validateDocxPackage(
  bytes: Uint8Array,
  formulaMathFontName: string,
  sourceFont: EmbeddedOpenTypeFontInput | undefined,
  embeddedFont: EmbeddedFontPart | undefined,
) {
  const parts = unzipSync(bytes);
  const documentPart = parts["word/document.xml"];
  if (!documentPart) throw new Error("Generated DOCX has no word/document.xml part");
  const documentXml = strFromU8(documentPart);
  const nativeFormulaCount = (documentXml.match(/<m:oMath(?:\s|>)/g) ?? []).length;
  let embeddedFontVerified = false;
  if (sourceFont && embeddedFont) {
    const fontTable = parts["word/fontTable.xml"];
    const fontRelationships = parts["word/_rels/fontTable.xml.rels"];
    const packagedFont = parts[embeddedFont.partName];
    if (!fontTable || !fontRelationships || !packagedFont) {
      throw new Error("Generated DOCX is missing an embedded-font OOXML part");
    }
    const fontTableXml = strFromU8(fontTable);
    const fontRelationshipsXml = strFromU8(fontRelationships);
    if (!fontTableXml.includes(embeddedFont.fontKey) || !fontTableXml.includes(formulaMathFontName)) {
      throw new Error("Generated font table does not reference the requested formula font");
    }
    if (!fontRelationshipsXml.includes(embeddedFont.partName.split("/").at(-1)!)) {
      throw new Error("Generated font relationship does not target the embedded font part");
    }
    embeddedFontVerified = equalBytes(
      obfuscateEmbeddedFont(packagedFont, embeddedFont.fontKey),
      sourceFont.fontBytes,
    );
    if (!embeddedFontVerified) throw new Error("Embedded font cannot be de-obfuscated losslessly");
  }
  return { nativeFormulaCount, embeddedFontVerified };
}
