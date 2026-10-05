import { DEFAULT_DOCX_THEME } from "./defaultTheme.ts";
import type { DocxTheme, DocxThemeOverrides } from "./types.ts";

/** Create an isolated theme suitable for applying JSON/config-file overrides. */
export function createDocxTheme(overrides: DocxThemeOverrides = {}): DocxTheme {
  const resolvedCodeFont = { ...DEFAULT_DOCX_THEME.codeFont, ...overrides.codeFont };
  const paragraphStyles = overrides.paragraphStyles ?? DEFAULT_DOCX_THEME.paragraphStyles;
  return {
    ...DEFAULT_DOCX_THEME,
    ...overrides,
    bodyFont: { ...DEFAULT_DOCX_THEME.bodyFont, ...overrides.bodyFont },
    codeFont: resolvedCodeFont,
    page: { ...DEFAULT_DOCX_THEME.page, ...overrides.page },
    paragraphStyles: paragraphStyles.map((style) => ({
      ...style,
      font: style.id === "Code" && !overrides.paragraphStyles
        ? resolvedCodeFont
        : style.font
          ? { ...style.font }
          : undefined,
    })),
  };
}
