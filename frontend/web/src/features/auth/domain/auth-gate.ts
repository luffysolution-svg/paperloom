// 每个页面启动前先过这一道：单机模式和以前完全一样；多用户模式没登录就显示登录界面，
// 管理员刚建的号 / 刚重置过密码的号先强制改密码。演示模式直接放行。
import { fetchAuthSession, resolveAuthSession, type AuthSessionView } from "@retainpdf/api/auth";
import { setApiUnauthorizedHandler } from "@retainpdf/api/http";
import { isMockMode } from "@/platform/config/runtime.js";

export type AuthGate =
  | { kind: "ready"; session: AuthSessionView }
  | { kind: "login"; session: AuthSessionView }
  | { kind: "change_password"; session: AuthSessionView }
  | { kind: "error"; message: string };

const SINGLE_SESSION: AuthSessionView = { mode: "single", authenticated: true, user: null };

/**
 * 多用户模式下某个请求回 401 时调用：先再问一次会话，真掉线了（过期 / 被管理员踢下线）才刷新回登录界面。
 * 还登录着就说明只是那个接口不让网站账号用（比如 /ai/* 转给 AI 服务、被它按部署密钥拒了），不动页面——
 * 以前一律刷新，设置弹窗一打开就被刷掉。问的时候连不上也不刷新。同一时间只问一次。
 */
export function createUnauthorizedHandler({
  check = () => fetchAuthSession(),
  reload = () => globalThis.location?.reload(),
}: {
  check?: () => Promise<AuthSessionView>;
  reload?: () => void;
} = {}): () => void {
  let checking = false;
  return () => {
    if (checking) return;
    checking = true;
    check()
      .then((session) => {
        if (!session?.authenticated) reload();
      }, () => {})
      .finally(() => {
        checking = false;
      });
  };
}

export async function resolveAuthGate({
  resolve = resolveAuthSession,
  mock = isMockMode,
  onUnauthorized = createUnauthorizedHandler(),
}: {
  resolve?: () => Promise<AuthSessionView>;
  mock?: () => boolean;
  onUnauthorized?: () => void;
} = {}): Promise<AuthGate> {
  if (mock()) return { kind: "ready", session: SINGLE_SESSION };
  let session: AuthSessionView;
  try {
    session = await resolve();
  } catch (error) {
    // 老后端没有 /auth/session（404）就是单机：照旧启动。其它错误（连不上）给一句话，不白屏。
    const status = Number((error as { status?: number } | null)?.status);
    if (status === 404) return { kind: "ready", session: SINGLE_SESSION };
    return { kind: "error", message: "连不上服务器，请稍后刷新重试。" };
  }
  if (session.mode !== "multi") return { kind: "ready", session };
  // 多用户：登录过期 / 被管理员踢下线时请求回 401，确认真掉线后刷新回登录界面（刷新后这一道会拦住）。
  setApiUnauthorizedHandler(onUnauthorized);
  if (!session.authenticated || !session.user) return { kind: "login", session };
  if (session.user.must_change_password) return { kind: "change_password", session };
  return { kind: "ready", session };
}

export function isMultiUser(session: AuthSessionView | null | undefined): boolean {
  return session?.mode === "multi";
}

export function isAdmin(session: AuthSessionView | null | undefined): boolean {
  return session?.mode !== "multi" || session?.user?.role === "admin";
}

// 多用户模式下藏掉单机才有的设置分栏：普通用户看不到接口设置（凭证由服务器统一管）、同步、备份；
// 「更新」（检查桌面版更新、装命令行）对服务器部署没有意义，管理员也藏。单机模式什么都不藏。
const MULTI_USER_HIDDEN_TABS: readonly string[] = ["update"];
const MULTI_USER_NON_ADMIN_HIDDEN_TABS: readonly string[] = ["api", "sync", "backup", "update"];

export function hiddenSettingsTabs(session: AuthSessionView | null | undefined): readonly string[] {
  if (!isMultiUser(session)) return [];
  return isAdmin(session) ? MULTI_USER_HIDDEN_TABS : MULTI_USER_NON_ADMIN_HIDDEN_TABS;
}
