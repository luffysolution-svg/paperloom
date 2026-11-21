// 管理后台整页（admin.html）：左边导航，右边账号列表 / 单个账号 / 邀请码 / 平台设置。
// 位置记在地址栏：?view=invites 是邀请码，?view=platform 是平台设置，?user=<user_id> 是单个账号，都没有是账号列表；
// 刷新、前进后退都对得上。账号列表一直挂着，从单个账号返回时搜索和翻页还在。
import { useCallback, useEffect, useState } from "react";
import { logout, type AuthSessionView } from "@retainpdf/api/auth";
import { buildHomeUrl } from "@/platform/navigation/pages.js";
import { defaultAdminApi, type AdminApi } from "../domain/admin-api.js";
import { AdminUserDetailView } from "./AdminUserDetailView.jsx";
import { AdminInvitesView } from "./AdminInvitesView.jsx";
import { AdminPlatformView } from "./AdminPlatformView.jsx";
import { AdminUsersView } from "./AdminUsersView.jsx";

type AdminRoute = { view: "accounts" | "invites" | "platform"; userId: string };

function readRoute(): AdminRoute {
  try {
    const params = new URLSearchParams(globalThis.location?.search || "");
    const view = params.get("view");
    if (view === "platform" || view === "invites") return { view, userId: "" };
    return { view: "accounts", userId: `${params.get("user") || ""}`.trim() };
  } catch {
    return { view: "accounts", userId: "" };
  }
}

function routeUrl(route: AdminRoute): string {
  if (route.view !== "accounts") return `?view=${route.view}`;
  if (route.userId) return `?user=${encodeURIComponent(route.userId)}`;
  return globalThis.location?.pathname || "./admin.html";
}

export function AdminApp({
  session,
  api = defaultAdminApi,
  doLogout = logout,
  afterLogout = () => globalThis.location?.replace(buildHomeUrl()),
}: {
  session: AuthSessionView;
  api?: AdminApi;
  doLogout?: () => Promise<unknown>;
  afterLogout?: () => void;
}) {
  const currentUserId = session.user?.user_id || "";
  const [route, setRoute] = useState(readRoute);
  const { view, userId } = route;
  const [refreshKey, setRefreshKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    globalThis.addEventListener?.("popstate", onPop);
    return () => globalThis.removeEventListener?.("popstate", onPop);
  }, []);

  const navigate = useCallback((next: AdminRoute) => {
    setRoute(next);
    globalThis.history?.pushState?.(null, "", routeUrl(next));
    globalThis.scrollTo?.(0, 0);
  }, []);
  const openUser = useCallback((next: string) => navigate({ view: "accounts", userId: next }), [navigate]);

  return (
    <div className="admin-app" data-admin-app="true">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src="./src/assets/RetainPDF-logo.svg" alt="" width={22} height={22} />
          <span>RetainPDF 管理后台</span>
        </div>
        <nav className="admin-nav" aria-label="管理后台">
          <button type="button" className="admin-nav-item" data-admin-nav="accounts" aria-current={view === "accounts" ? "page" : undefined} onClick={() => openUser("")}>账号管理</button>
          <button type="button" className="admin-nav-item" data-admin-nav="invites" aria-current={view === "invites" ? "page" : undefined} onClick={() => navigate({ view: "invites", userId: "" })}>邀请码</button>
          <button type="button" className="admin-nav-item" data-admin-nav="platform" aria-current={view === "platform" ? "page" : undefined} onClick={() => navigate({ view: "platform", userId: "" })}>平台设置</button>
        </nav>
        <div className="admin-sidebar-foot">
          <p className="admin-sub">当前：{session.user?.username || "—"}</p>
          <a className="auth-link" href={buildHomeUrl()}>返回首页</a>
          <button
            type="button"
            className="auth-link"
            disabled={loggingOut}
            onClick={async () => {
              setLoggingOut(true);
              try {
                await doLogout();
              } finally {
                afterLogout();
              }
            }}
          >
            {loggingOut ? "正在退出…" : "退出登录"}
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <div hidden={view !== "accounts" || Boolean(userId)}>
          <AdminUsersView api={api} currentUserId={currentUserId} onOpenUser={openUser} refreshKey={refreshKey} />
        </div>
        {view === "invites" ? <AdminInvitesView onOpenUser={openUser} /> : null}
        {view === "platform" ? <AdminPlatformView /> : null}
        {view === "accounts" && userId ? (
          <AdminUserDetailView
            api={api}
            userId={userId}
            currentUserId={currentUserId}
            onBack={() => openUser("")}
            onChanged={() => setRefreshKey((n) => n + 1)}
          />
        ) : null}
      </main>
    </div>
  );
}
