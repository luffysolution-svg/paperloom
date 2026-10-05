// CollectionsView 的对外依赖契约：与视图渲染分离，子组件只依赖这里，
// 避免通过主文件回引形成耦合。
import type { DialogStore } from "@/platform/store/dialog-store.js";
import type { CollectionRecord } from "../domain/controller.js";

/** 由页面注入：合集域的三件依赖 + 图书馆的跳转动作。 */
export type CollectionsController = ReturnType<
  typeof import("../domain/controller.js").createCollectionsController
>;

// TODO(feature-layout 批次 5): dialog-store / use-dialog-state 是通用状态工具，
// 随批次 5 迁入 platform 后改指。
export type CollectionsDialogStore = DialogStore<CollectionRecord | null>;

export type CollectionsReloadSignal = {
  actions: Record<string, (...args: any[]) => unknown>;
  getSnapshot: () => any;
  subscribe: (listener: (snapshot: any) => void) => () => void;
};

export type CollectionsLibraryActions = {
  openBookDetail: (...args: any[]) => unknown;
  openJobReader: (...args: any[]) => unknown;
  openSourceReader: (...args: any[]) => unknown;
  selectJob: (...args: any[]) => unknown;
};

export type CollectionsViewProps = {
  controller: CollectionsController;
  dialogStore: CollectionsDialogStore;
  reloadSignal: CollectionsReloadSignal;
  libraryActions: CollectionsLibraryActions;
};
