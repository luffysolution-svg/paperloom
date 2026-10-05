// 凭据提供方面板（OCR 与翻译模型两块，分 provider 渲染）。
// 实现在 ./OcrPanels.jsx 与 ./TranslationPanel.jsx，本文件保留原导入路径与导出名。
export { OcrPanels } from "./OcrPanels.jsx";
export { TranslationPanel } from "./TranslationPanel.jsx";

import { OcrPanels } from "./OcrPanels.jsx";
import { TranslationPanel } from "./TranslationPanel.jsx";

// 兼容旧调用：统一 Provider 面板（可选）
export function ProviderPanels() {
  return (
    <>
      <OcrPanels />
      <TranslationPanel />
    </>
  );
}
