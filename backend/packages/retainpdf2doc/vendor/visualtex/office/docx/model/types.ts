import type { EmbeddedOpenTypeFontInput } from "../fonts/fontEmbedding.ts";
import type { DocxTheme } from "../config/index.ts";

export interface DocxMetadata {
  title?: string;
  creator?: string;
  description?: string;
  headerText?: string;
}

// 上游这里还有 BuildNativeMathDocxOptions（语义重排文档的入参）。我们只用
// buildDocxPackage 这一层原语，自己拼文档主体，所以那个接口连同它对 core 文档模型
// 的依赖一起去掉了。
export interface BuiltNativeMathDocx {
  bytes: Uint8Array;
  paragraphCount: number;
  nativeFormulaCount: number;
  embeddedFormulaFont: boolean;
  embeddedFontBytes: number;
  embeddedFontKey: string | null;
  embeddedFontVerified: boolean;
}
