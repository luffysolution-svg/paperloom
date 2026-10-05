export interface DocxFontFamily {
  ascii: string;
  eastAsia: string;
  complexScript: string;
}

export interface DocxPageLayout {
  widthTwips: number;
  heightTwips: number;
  marginTopTwips: number;
  marginRightTwips: number;
  marginBottomTwips: number;
  marginLeftTwips: number;
  headerTwips: number;
  footerTwips: number;
}

export interface DocxParagraphStyleDefinition {
  id: string;
  name: string;
  fontSizePt: number;
  color: string;
  basedOn?: string;
  bold?: boolean;
  italic?: boolean;
  keepNext?: boolean;
  spacingBeforeTwips?: number;
  spacingAfterTwips: number;
  lineTwips?: number;
  outlineLevel?: number;
  indentLeftTwips?: number;
  indentRightTwips?: number;
  font?: DocxFontFamily;
}

export interface DocxTheme {
  bodyFont: DocxFontFamily;
  codeFont: DocxFontFamily;
  bulletFont: string;
  bodyFontSizePt: number;
  bodyColor: string;
  bodyLineTwips: number;
  bodySpacingAfterTwips: number;
  displayFormulaSpacingBeforeTwips: number;
  displayFormulaSpacingAfterTwips: number;
  listIndentStartTwips: number;
  listIndentStepTwips: number;
  listHangingTwips: number;
  listSpacingAfterTwips: number;
  headerColor: string;
  headerFontSizePt: number;
  footerColor: string;
  footerFontSizePt: number;
  page: DocxPageLayout;
  paragraphStyles: DocxParagraphStyleDefinition[];
}

export type DocxThemeOverrides = Partial<Omit<
  DocxTheme,
  "bodyFont" | "codeFont" | "page" | "paragraphStyles"
>> & {
  bodyFont?: Partial<DocxFontFamily>;
  codeFont?: Partial<DocxFontFamily>;
  page?: Partial<DocxPageLayout>;
  paragraphStyles?: DocxParagraphStyleDefinition[];
};
