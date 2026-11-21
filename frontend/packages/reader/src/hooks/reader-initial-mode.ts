// 开书时该进哪个阅读模式：存档优先，窄屏没有存档时默认译文单栏。
//
// 会话初始 mode 是「对照」（reader-mode.ts），有存档就恢复存档。窄屏（<720）上对照
// 每页只有一百六十来像素，看不清，所以**没有存档**时默认进译文模式。
//
// 只是默认：
// - 存档里的 mode 一律照旧恢复（那是用户在这本书上选过的）；
// - 自动套用的「译文」不写回存档（shouldPersistReaderMode）—— 否则手机上开过一次，
//   同一个浏览器换到宽窗口也被钉成译文单栏；用户一旦换过模式就照常持久化；
// - 没有可并排的最终译文（sourceViewOnly）时照旧原文。

import { isNarrowReaderViewport } from "../pdf/reader-zoom.js";
import type { ReaderMode } from "./use-reader-session.js";

export type ReaderInitialMode = {
  /** 要切到的模式；null = 保持会话当前模式 */
  mode: ReaderMode | null;
  /** true = 窄屏自动默认，不是用户选的 */
  auto: boolean;
};

export function resolveReaderInitialMode(input: {
  savedMode: ReaderMode | undefined;
  sourceViewOnly: boolean;
  viewportWidth: number;
}): ReaderInitialMode {
  if (input.sourceViewOnly) return { mode: "source", auto: false };
  if (input.savedMode) return { mode: input.savedMode, auto: false };
  if (isNarrowReaderViewport(input.viewportWidth)) return { mode: "translated", auto: true };
  return { mode: null, auto: false };
}

/** 当前 mode 是否该写进存档：仍停在自动默认上时不写。 */
export function shouldPersistReaderMode(mode: ReaderMode, autoMode: ReaderMode | null): boolean {
  return autoMode === null || mode !== autoMode;
}
