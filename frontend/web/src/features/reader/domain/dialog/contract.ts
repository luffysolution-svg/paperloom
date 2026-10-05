// 旧世界的 reader 对话框 DOM 契约(id/class/dataset/文案)已随 home cutover 由
// React 组件树取代，整段转发在 src/ 内零消费，随 components/dialogs/ 一并删除。
//
// 唯一真源在阅读器包内运行时访问层：frontend/packages/reader/src/external.ts 的
// READER_DIALOG_MESSAGES（由 hooks/reader-session 发 postMessage 消费）。此常量
// 只是宿主导出面 app/reader/external.ts 需要保留的历史镜像：web 无法通过公开
// package 子路径读取包内 external（dist 冻结且非 public export），故镜像 + 由
// tests/reader/reader-dead-code-cleanup.test.mjs 做逐字节一致性守护，防止漂移。
export const READER_DIALOG_MESSAGES = {
  progress: "retainpdf-reader-progress",
};
