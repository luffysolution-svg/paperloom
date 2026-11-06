import { useEffect, useState } from "react";
import { getDesktopHost } from "@/platform/desktop/host.js";
import { API_PREFIX } from "@/platform/config/api-constants.js";
import { setPrivateProviderAccess } from "@/platform/api/index.js";

export function DesktopPrivateApiAccess() {
  const host = getDesktopHost();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!host) return;
    let cancelled = false;
    host.loadDesktopConfig().then((config) => {
      if (cancelled) return;
      setEnabled(config.allowPrivateProviderUrls === true);
      setBusy(false);
    }).catch(() => {
      if (!cancelled) {
        setMessage("无法读取本机 API 设置，请重新打开设置。");
        setBusy(false);
      }
    });
    return () => { cancelled = true; };
  }, [host]);

  if (!host) return null;

  async function save(nextEnabled: boolean) {
    const previous = enabled;
    setEnabled(nextEnabled);
    setBusy(true);
    try {
      const config = await host.saveDesktopConfig({ allowPrivateProviderUrls: nextEnabled });
      setEnabled(config.allowPrivateProviderUrls === true);
      setMessage("已保存，正在刷新后端…");
      try {
        await setPrivateProviderAccess(API_PREFIX, { enabled: nextEnabled });
        setMessage("已保存并立即生效；正在运行的任务仍保持原配置。");
      } catch {
        setMessage("配置已保存，但后端未刷新；请重启 PaperLoom 后再使用内网 API。");
      }
    } catch {
      setEnabled(previous);
      setMessage("保存失败，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="credential-private-api-access">
      <label>
        <input type="checkbox" checked={enabled} disabled={busy} onChange={(event) => { void save(event.target.checked); }} />
        允许本机和内网 API
      </label>
      <p>仅允许你信任的服务接收 API Key；切换后对新检测和新任务立即生效。</p>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
