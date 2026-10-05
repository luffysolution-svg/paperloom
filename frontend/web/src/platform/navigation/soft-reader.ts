// 软导航（主页不刷新打开阅读器）的唯一真源在 @retainpdf/reader 包内。
//
// 包内尚无公开 navigation subpath，且本仓库约束冻结 dist；此处以源码路径
// re-export，导出名与行为保持不变。宿主与 ReaderCloseHome 共用同一实现。
export * from "../../../../packages/reader/src/shared/navigation/soft-reader.js";
