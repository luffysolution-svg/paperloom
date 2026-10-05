// credentials 领域状态：类型 / store 动作 / 派生 selector / 状态端口分文件实现，
// 本文件仅作为对外 facade 统一转出，保持既有 `domain/state.js` 导入路径与导出名不变。
// 逐条显式列举，不用 export * —— barrel 无差别转出会连带触发模块级副作用。
export { createCredentialsStore } from "./state-store.js";
export {
  hasCompleteCredentials,
  ocrTokenFromCredentials,
} from "./state-selectors.js";
export { createCredentialsStatePort } from "./state-port.js";
export type {
  CreateCredentialsStatePortOptions,
  CredentialsActions,
  CredentialsFields,
  CredentialsInitialState,
  CredentialsRuntime,
  CredentialsState,
  CredentialsStatePort,
  CredentialsStore,
  DeepSeekBalanceState,
  HasValidOcrValidationCacheOptions,
  OcrTokenOptions,
  OcrValidationCache,
  OcrValidationCachePayload,
} from "./state-types.js";
