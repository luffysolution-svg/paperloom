// 平台级凭据契约（中性层，断 features/credentials ⇄ features/reader 环）。
//
// credentials 保存凭据后要通知 Readers/AI 门禁立刻刷新；reader 宿主又需要读取
// 「凭据状态端口的默认实现」。若两侧直接 import 对方 features 的 domain.js，
// 会形成 features 间双向依赖。这里把两件事下沉为 platform 契约：
//   1. 事件：事件名 + 派发；消费方（reader 包、ask）按同名事件订阅。
//   2. 端口注册表：credentials 注册默认实现，reader 宿主惰性读取。
//
// 事件名必须与 @retainpdf/reader 包内 CREDENTIALS_CHANGED_EVENT 以及
// app/home/composition/create-credentials.ts 的裸串保持一致。

export const CREDENTIALS_CHANGED_EVENT = "retainpdf:credentials-changed";

export function notifyCredentialsChanged(): void {
  try {
    (globalThis as {
      document?: { dispatchEvent?: (event: Event) => boolean };
    }).document?.dispatchEvent?.(new CustomEvent(CREDENTIALS_CHANGED_EVENT));
  } catch {
    /* ignore non-DOM env */
  }
}

/** reader 宿主只消费 modelApiKey 门禁所需的窄口。 */
export type CredentialsPortView = {
  getCredentials: () => { modelApiKey?: string } | null;
};

let _defaultCredentialsStatePort: CredentialsPortView | null = null;

/** 由 credentials 组合/出口注册默认实现（features → platform，不反向）。 */
export function setDefaultCredentialsStatePort(
  port: CredentialsPortView | null,
): void {
  _defaultCredentialsStatePort = port;
}

export function getDefaultCredentialsStatePort(): CredentialsPortView | null {
  return _defaultCredentialsStatePort;
}
