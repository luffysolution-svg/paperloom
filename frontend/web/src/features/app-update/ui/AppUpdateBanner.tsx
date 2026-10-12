// AppUpdateBanner(React 版 app-update 按钮 + 详情 dialog,蓝图 §5)。
//
// 旧世界"两处 DOM 分属两个宿主"的问题(按钮在 app-settings-dialog 模板,
// 详情 dialog 在 app-shell-header.js)在这里合并成同一个组件:本组件整体挂载
// 在 SettingsDialog.jsx"更新"tab 面板下(该面板用 hidden 属性切换,不卸载
// ——见 SettingsDialog.jsx 头注释同款处理),按钮与 dialog 都是这里的常驻
// 子节点。dialog 只会在用户点击本组件自己的按钮时才打开(此时"更新"
// tab 必然是激活态、祖先没有 hidden),不存在"父级隐藏时误开 dialog"的场景。
//
// 更新详情使用共享 AppDialog 外壳；app-update-* 只保留发布说明内容区布局。
// open 受控于本地 useAppUpdateDialogOpen(纯 UI 瞬态,不进
// store——这条既有决策不变),onOpenChange 在 next===false 时统一调用
// setDialogOpen(false),Escape/背板点击/关闭按钮三条路径都走这一个回调。
// 不 forceMount(同 CredentialsDialog.jsx 头注释的结论,避免 hideOthers 永久
// 生效的无障碍缺陷)——本详情 dialog 内容全部是只读展示(状态文案/说明/
// 链接),没有表单输入,关闭时卸载不会丢任何数据。
//
// AppShellHeader.jsx 不再残留 app-update-dialog 模板骨架(3a 遗留,已清理,
// 避免 id 重复违反视觉基线/门禁)。

import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogShell,
  DialogTitle,
} from "@/ui/components/dialog.js";
import { useStoreSnapshot } from "@/ui/hooks/use-store.js";
import { useDialogReturnFocus } from "@/ui/hooks/use-dialog-return-focus.js";
import { APP_UPDATE_IDS } from "./app-update-contract.js";
import { useAppUpdateDialogOpen } from "./useAppUpdateDialogOpen.js";
import type { AppUpdateReadOnlyStore, HandlersBag } from "../domain/app-update-store.js";
import { Button as ButtonBase } from "@/ui/Button.jsx";

// Button.size 在未注解源文件里被推断为必填;unstyled 路径运行时不用 size。
const Button = ButtonBase as any;

// 抄自 src/js/features/app-update/view.js:47-60(formatReleaseNotes)——纯函数,
// 逐字符保留,拷贝进本组件(蓝图 §5:AppUpdateBanner agent 范围)。
function formatReleaseNotes(markdown = "") {
  return `${markdown || ""}`
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^\s*[-*]\s+/, "• ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trimEnd())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim();
}

/**
 * 视图依赖由调用方注入，而不是从页面的服务上下文里自取：
 * 功能不应反向依赖某个具体页面的装配层(app/home)。
 * 主页在 HomeApp 的挂载点把 services.appUpdate 拆开传进来。
 */
export type AppUpdateBannerProps = {
  view: { store: AppUpdateReadOnlyStore };
  handlersRef: { current: HandlersBag | null };
};

export function AppUpdateBanner({ view, handlersRef }: AppUpdateBannerProps) {
  const state = useStoreSnapshot(view.store);
  const [dialogOpen, setDialogOpen] = useAppUpdateDialogOpen();
  const { onCloseAutoFocus } = useDialogReturnFocus(dialogOpen);

  function handleOpenChange(nextOpen) {
    if (!nextOpen) {
      setDialogOpen(false);
    }
  }

  const hasUpdate = Boolean(state.hasUpdate);
  const panel = state.panel;
  const notesText = formatReleaseNotes(panel.body) || "暂无更新说明。";
  const versionText = panel.latestVersion
    ? `当前 ${panel.currentVersion} · 最新 ${panel.latestVersion}`
    : `当前 ${panel.currentVersion}`;
  const statusText = `${state.statusText || ""}`;
  const update = state.desktop;
  const busy = update && ["checking", "downloading", "installing"].includes(update.status);

  return (
    <>
      <Button
        id={APP_UPDATE_IDS.button}
        className={`app-settings-action app-update-btn${hasUpdate ? " has-update" : ""}`}
        aria-label="检查更新"
        title={state.buttonTitle}
        data-update-state={state.buttonState}
        onClick={() => setDialogOpen(true)}
      >
        检查更新
        <span className="app-update-dot" aria-hidden="true"></span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
          <DialogContent
            id={APP_UPDATE_IDS.dialog}
            className="app-update-dialog"
            onCloseAutoFocus={onCloseAutoFocus}
            showCloseButton={false}
          >
            <DialogShell className="app-update-shell">
              <DialogHeader className="app-update-head">
                <div>
                  <DialogTitle asChild>
                    <h2>{panel.title}</h2>
                  </DialogTitle>
                  <p>{versionText}</p>
                </div>
                <DialogCloseButton />
              </DialogHeader>
              <DialogBody className="app-update-body">
                <div id={APP_UPDATE_IDS.status} className={`app-update-status${statusText ? "" : " hidden"}`}>{statusText}</div>
                <div className="app-update-notes">{notesText}</div>
                {update?.status === "downloading" ? (
                  <progress className="mt-4 h-2 w-full" role="progressbar" max={100}
                    value={update.percent || 0} aria-label="更新下载进度"
                    aria-valuenow={update.percent || 0} aria-valuemin={0} aria-valuemax={100} />
                ) : null}
                {update ? <p className="mt-4 text-sm text-muted-foreground">
                  {update.mode === "mac" ? "Mac 安装包打开后，请退出软件，将新版拖入 Applications 替换。"
                    : update.mode === "linux" ? "使用系统安装程序更新，可能需要管理员密码。完成后重新启动软件。"
                      : update.mode === "portable" ? "更新将退出软件，替换便携版程序并重新启动。"
                        : "更新将打开 Windows 安装程序并退出软件，完成后重新启动。"}
                </p> : null}
              </DialogBody>
              <DialogFooter className="app-update-foot">
                <Button
                  id={APP_UPDATE_IDS.checkButton}
                  className="home-action-btn secondary"
                  onClick={() => handlersRef.current?.onCheck?.()}
                  disabled={Boolean(busy)}
                >
                  重新检查
                </Button>
                {update && (update.status === "available" || (update.status === "error" && update.canDownload)) ? (
                  <Button id="app-update-download-btn" className="home-action-btn"
                    onClick={() => handlersRef.current?.onDownload?.()}>下载更新</Button>
                ) : null}
                {update?.status === "downloading" ? (
                  <Button id="app-update-cancel-btn" className="home-action-btn secondary"
                    onClick={() => handlersRef.current?.onCancel?.()}>取消下载</Button>
                ) : null}
                {update?.status === "downloaded" ? (
                  <Button id="app-update-install-btn" className="home-action-btn"
                    onClick={() => handlersRef.current?.onInstall?.()}>
                    {update.mode === "portable" ? "重启并更新" : update.mode === "installer" ? "退出并安装" : "打开安装包"}
                  </Button>
                ) : null}
                <a
                  className={`app-update-link${panel.htmlUrl ? "" : " hidden"}`}
                  href={panel.htmlUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  打开 Release
                </a>
              </DialogFooter>
            </DialogShell>
          </DialogContent>
      </Dialog>
    </>
  );
}
