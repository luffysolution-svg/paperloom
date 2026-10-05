import { obfuscateEmbeddedFont } from "../../../core/office/embeddedFont.ts";

export interface EmbeddedOpenTypeFontInput {
  fontName: string;
  fontBytes: Uint8Array;
  fontKey: string;
}

export interface EmbeddedFontPart {
  bytes: Uint8Array;
  fontKey: string;
  fontName: string;
  partName: string;
}

export function prepareEmbeddedFont(input: EmbeddedOpenTypeFontInput): EmbeddedFontPart {
  return {
    bytes: obfuscateEmbeddedFont(input.fontBytes, input.fontKey),
    fontKey: input.fontKey,
    fontName: input.fontName,
    partName: `word/fonts/${input.fontKey.slice(1, 9).toLowerCase()}.odttf`,
  };
}

export function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
