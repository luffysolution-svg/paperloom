import { useEffect, useState } from "react";
import { getDesktopHost } from "@/platform/desktop/host.js";

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
      if (!cancelled) setMessage("无法读取本机 API 设置，请重新打开设置。");
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
      setMessage("已保存，重启 PaperLoom 后生效。");
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
      <p>仅允许你信任的服务接收 API Key；更改后需重启 PaperLoom。</p>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
