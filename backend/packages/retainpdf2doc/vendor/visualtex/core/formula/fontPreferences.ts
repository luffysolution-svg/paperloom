export type FormulaLetterFont =
  | "katex"
  | "times"
  | "cambria"
  | "latin-modern"
  | "stix"
  | "palatino"
  | "helvetica";

export type FormulaChineseFont =
  | "system"
  | "pingfang"
  | "songti"
  | "kaiti"
  | "heiti";

export const DEFAULT_FORMULA_LETTER_FONT: FormulaLetterFont = "katex";
export const DEFAULT_FORMULA_CHINESE_FONT: FormulaChineseFont = "system";

const LETTER_PRIMARY_FONT_NAMES: Record<FormulaLetterFont, string> = {
  katex: "KaTeX_Math",
  times: "Times New Roman",
  cambria: "Cambria Math",
  "latin-modern": "Latin Modern Math",
  stix: "STIX Two Math",
  palatino: "Palatino",
  helvetica: "Helvetica Neue",
};

const CHINESE_PRIMARY_FONT_NAMES: Record<FormulaChineseFont, string> = {
  system: "PingFang SC",
  pingfang: "PingFang SC",
  songti: "Songti SC",
  kaiti: "Kaiti SC",
  heiti: "Heiti SC",
};

export function normalizeFormulaLetterFont(value: unknown): FormulaLetterFont {
  return typeof value === "string" && value in LETTER_PRIMARY_FONT_NAMES
    ? (value as FormulaLetterFont)
    : DEFAULT_FORMULA_LETTER_FONT;
}

export function normalizeFormulaChineseFont(value: unknown): FormulaChineseFont {
  return typeof value === "string" && value in CHINESE_PRIMARY_FONT_NAMES
    ? (value as FormulaChineseFont)
    : DEFAULT_FORMULA_CHINESE_FONT;
}

export function formulaLetterPrimaryFontName(value: FormulaLetterFont) {
  return LETTER_PRIMARY_FONT_NAMES[normalizeFormulaLetterFont(value)];
}

export function formulaChinesePrimaryFontName(value: FormulaChineseFont) {
  return CHINESE_PRIMARY_FONT_NAMES[normalizeFormulaChineseFont(value)];
}
