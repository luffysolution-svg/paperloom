// 选中 AI 回答里的一段话 → 引用进输入框，接着问。
//
// 选区检测、「限定在单条消息内」、浮层定位、以及「按下去不要把选区清掉」这几件麻烦事
// 交给 assistant-ui 的 SelectionToolbarPrimitive.Root，不自己写一遍。
//
// 但按钮是自己的，没用它配套的 `.Quote`：那个按钮做的是 `composer.setQuote(...)`，
// 引用留在 composer 的 quote 状态、最终挂到消息的 metadata 上。而阅读器这条链路是
// ComposerPrimitive.Send → 外部 store 的 onNew → messageText(message) → onSubmit(question)，
// **只读消息的 text part**——metadata 上的引用一路没人看，会一声不响地到不了模型。
//
// 所以这里把选中的文字转成 Markdown 引用块写进输入框正文，走的通路和主页问答完全相同
// （`buildQuoteBlock` / `mergeQuoteIntoDraft` 也是同一份实现）。

import { Quote } from "lucide-react";
import { SelectionToolbarPrimitive, useAui } from "@assistant-ui/react";
import { buildQuoteBlock, mergeQuoteIntoDraft } from "../../../shared/ai/answer-quote.js";

export function AnswerSelectionToolbar() {
  const aui = useAui();

  const quoteSelection = (event: { preventDefault: () => void }) => {
    // pointerdown 而不是 click：浏览器在 click 之前就会把选区清掉，到那时没东西可引用。
    // Root 已经挡掉了它自己的 mousedown，这里挡的是落在按钮上的这一次。
    event.preventDefault();
    const selected = `${globalThis.getSelection?.() || ""}`.trim();
    if (!selected) return;

    const block = buildQuoteBlock(selected);
    if (!block) return;

    const composer = aui.thread.composer();
    composer.setText(mergeQuoteIntoDraft(composer.getState().text || "", block));
    try {
      globalThis.getSelection?.()?.removeAllRanges();
    } catch {
      /* 收起工具条即可，清不掉选区不影响已经引用到的文字 */
    }
  };

  return (
    <SelectionToolbarPrimitive.Root className="reader-ai-selection-toolbar">
      <button
        type="button"
        className="reader-ai-selection-quote"
        onPointerDown={quoteSelection}
        title="引用这段话继续提问"
      >
        <Quote size={12} strokeWidth={2.4} aria-hidden />
        <span>引用</span>
      </button>
    </SelectionToolbarPrimitive.Root>
  );
}
