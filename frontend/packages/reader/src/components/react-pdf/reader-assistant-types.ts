// 阅读辅助面板纯类型叶子文件：打断 reader-context ↔ ReaderAssistantDock 的类型环。
//
// 真源在 shared/types/reader-assistant-panels.ts（那里没有任何依赖，view-state
// 也要用）。这里只做转出，保持既有 import 路径可用。

export type { ReaderAssistantPanel } from "../../shared/types/reader-assistant-panels.js";
