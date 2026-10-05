// HomeAskComposer 的副作用：全局 document 监听（点外关闭 @ 选择器）
// 与 CustomEvent 派发（打开浏览器凭据设置）。

import { useEffect, type RefObject } from "react";

export const OPEN_BROWSER_CREDENTIALS_EVENT = "retainpdf:open-browser-credentials";

/** 与上传门禁一致：打开「设置 → API 设置」（唯一常规入口）。 */
export function openBrowserCredentials() {
  document.dispatchEvent(new CustomEvent(OPEN_BROWSER_CREDENTIALS_EVENT));
}

export type UseHomeAskComposerOutsideCloseParams = {
  active: boolean;
  anchorRef: RefObject<HTMLTextAreaElement | null>;
  onClose: () => void;
};

/** 选择器展开时，点击 composer 之外任意位置关闭。 */
export function useHomeAskComposerOutsideClose({
  active,
  anchorRef,
  onClose,
}: UseHomeAskComposerOutsideCloseParams) {
  useEffect(() => {
    if (!active) return;
    const onDoc = (e: PointerEvent) => {
      const t = e.target as Node | null;
      const root = anchorRef.current?.closest(".home-ask-composer");
      if (root && t && root.contains(t)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDoc, true);
    return () => document.removeEventListener("pointerdown", onDoc, true);
  }, [active, anchorRef, onClose]);
}
