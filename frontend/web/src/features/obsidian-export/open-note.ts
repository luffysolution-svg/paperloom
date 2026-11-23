/**
 * 交给系统打开 obsidian:// 链接。桌面端的窗口拦截只对 window.open 放行
 * 白名单协议；浏览器里直接改 location 不会离开当前页，只是唤起 Obsidian。
 */
export function openExternalUri(uri: string): void {
  if (typeof window === "undefined" || !uri) return;
  if ((window as any).retainPdfDesktop) {
    window.open(uri, "_blank");
  } else {
    window.location.href = uri;
  }
}
