// HomeAskComposer 输入区：textarea（缺凭据也不锁死，只在发送时刻引导补 Key）

import type {
  KeyboardEvent as ReactKeyboardEvent,
  RefObject,
} from "react";

export type HomeAskComposerInputProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  text: string;
  inputDisabled: boolean;
  scopeCount: number;
  variant: "hero" | "dock";
  onTextChange: (value: string, caret: number) => void;
  onSyncCaret: (value: string, caret: number) => void;
  onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
};

export function HomeAskComposerInput({
  textareaRef,
  text,
  inputDisabled,
  scopeCount,
  variant,
  onTextChange,
  onSyncCaret,
  onKeyDown,
}: HomeAskComposerInputProps) {
  return (
    <textarea
      ref={textareaRef}
      className="home-ask-input"
      rows={2}
      value={text}
      disabled={inputDisabled}
      placeholder={
        scopeCount
          ? "继续提问… @ 可再指定文章或合集"
          : variant === "hero"
            ? "用 AI 做任何事… 输入 @ 指定文章或合集"
            : "继续提问… 输入 @ 指定文章或合集"
      }
      onChange={(e) => {
        const value = e.target.value;
        onTextChange(value, e.target.selectionStart ?? value.length);
      }}
      onClick={(e) => {
        const t = e.currentTarget;
        onSyncCaret(t.value, t.selectionStart ?? t.value.length);
      }}
      onKeyUp={(e) => {
        const t = e.currentTarget;
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          onSyncCaret(t.value, t.selectionStart ?? t.value.length);
        }
      }}
      onKeyDown={onKeyDown}
    />
  );
}
