import {
  DEFAULT_BODY_FONT,
  DEFAULT_BULLET_FONT,
  DEFAULT_CODE_FONT,
} from "./defaults/fonts.ts";
import { DEFAULT_PAGE_LAYOUT } from "./defaults/page.ts";
import { DEFAULT_PARAGRAPH_STYLES } from "./defaults/paragraphStyles.ts";
import type { DocxTheme } from "./types.ts";

export const DEFAULT_DOCX_THEME: DocxTheme = {
  bodyFont: DEFAULT_BODY_FONT,
  codeFont: DEFAULT_CODE_FONT,
  bulletFont: DEFAULT_BULLET_FONT,
  bodyFontSizePt: 11,
  bodyColor: "1F1F1F",
  bodyLineTwips: 300,
  bodySpacingAfterTwips: 120,
  displayFormulaSpacingBeforeTwips: 80,
  displayFormulaSpacingAfterTwips: 120,
  listIndentStartTwips: 540,
  listIndentStepTwips: 360,
  listHangingTwips: 270,
  listSpacingAfterTwips: 80,
  headerColor: "777777",
  headerFontSizePt: 9,
  footerColor: "777777",
  footerFontSizePt: 9,
  page: DEFAULT_PAGE_LAYOUT,
  paragraphStyles: DEFAULT_PARAGRAPH_STYLES,
};
