// credentials 的「非 React」出口。
//
// reader 宿主、detail 页数据端口、桌面集成等调用方不需要（也不应拖入）本功能的
// React 组件树。它们从这里导入；React 侧从 index.ts 导入。
//
// index.ts 转出本文件的全部内容，故两个出口不会各自漂移。

import { setDefaultCredentialsStatePort } from "@/platform/contracts/credentials-contract.js";
import { defaultCredentialsStatePort } from "./domain/default-state-port.js";

// 把默认凭据端口注册到 platform 中性契约：reader 宿主等下游惰性读取，
// 避免 features/reader/domain 反向 import 本功能。
setDefaultCredentialsStatePort(defaultCredentialsStatePort);

export { mountBrowserCredentialsFeature } from "./domain/browser.js";
export { createCredentialsViewFeature } from "./domain/credentials-view-store.js";
export type {
  CredentialsElementsRef,
  HandlersBag,
} from "./domain/credentials-view-store.js";
export {
  applyDefaultCredentialInputs,
  defaultCredentialsStatePort,
} from "./domain/default-state-port.js";
export type { CredentialsStatePort } from "./domain/state.js";
export { hasDesktopCredentials } from "./domain/desktop-readiness.js";
export type { DesktopCredentialSnapshot } from "./domain/desktop-readiness.js";
export { readHiddenCredentialDomInputs } from "./domain/hidden-input-dom-port.js";
export { createCredentialRuntimeEnvPort } from "./domain/runtime-env-port.js";
export type {
  BindCredentialViewEventsOptions,
  CredentialUploadTilePort,
  OpenCredentialDialogOptions,
  UpdateCredentialGateViewOptions,
} from "./domain/view-contracts.js";
