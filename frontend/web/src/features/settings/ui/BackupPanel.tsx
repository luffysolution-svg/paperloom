import { useEffect, useRef, useState } from "react";
import { backupApi, type BackupClient, type BackupProgress, type BackupStatus, type RemoteBackup } from "@/platform/api/domains/backups.js";

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}

export function BackupPanel({ active = true, client = backupApi }: { active?: boolean; client?: BackupClient }) {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [busy, setBusy] = useState("");
  const [downloadProgress, setDownloadProgress] = useState<BackupProgress | null>(null);
  const running = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remoteItems, setRemoteItems] = useState<RemoteBackup[] | null>(null);
  const [deleting, setDeleting] = useState<{ name: string; remote: boolean } | null>(null);

  useEffect(() => {
    if (!active) return;
    let ignore = false;
    client.status().then((next) => {
      if (ignore) return;
      setStatus(next);
      setUrl(next.webdav.url);
      setUsername(next.webdav.username);
    }).catch((failure) => { if (!ignore) setError(failure.message || "读取备份状态失败，请重试。"); });
    return () => { ignore = true; };
  }, [active, client]);

  const serverBusy = status?.operation?.state === "running";
  useEffect(() => {
    if (!active || (!busy && !serverBusy)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const next = await client.status().catch(() => null);
      if (cancelled) return;
      if (next) setStatus(next);
      timer = setTimeout(() => void poll(), 500);
    }
    timer = setTimeout(() => void poll(), 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [active, busy, serverBusy, client]);

  async function run(label: string, action: () => Promise<unknown>, success = "") {
    if (running.current) return;
    running.current = true;
    setBusy(label);
    setError("");
    setMessage("");
    setDownloadProgress(null);
    try {
      await action();
      setStatus(await client.status());
      setMessage(success);
    } catch (failure) {
      // Upload failures can still leave a complete local package.
      const latest = await client.status().catch(() => null);
      if (latest) setStatus(latest);
      if (!(failure instanceof Error && failure.name === "AbortError")) {
        setError(failure instanceof Error ? failure.message : "操作失败，请重试。");
      }
    } finally {
      running.current = false;
      setBusy("");
    }
  }

  const locked = Boolean(busy) || serverBusy || Boolean(status?.pending_restore);
  const cannotSnapshot = locked || !status || status.active_tasks > 0;
  const cannotRestore = cannotSnapshot || !status?.restore_supported || !confirmed;
  const dirty = password !== "" || url.trim() !== status?.webdav.url || username !== status?.webdav.username;
  const davInput = () => ({ url, username, ...(password ? { password } : {}) });
  const restoreMessage = "迁移包已校验并暂存。请退出并重新启动应用；网页部署请重启后端服务。";
  const progress = downloadProgress || (serverBusy ? status.operation : null);
  const phaseLabels = { pack: "正在打包", upload: "正在上传到 WebDAV", download: "正在下载", import: "正在接收迁移包", validate: "正在校验迁移包" };
  const feedbackError = error || (!busy && status?.operation?.state === "failed" ? status.operation.message : "");
  const feedbackMessage = message || (status?.operation?.state === "completed" ? "上次备份操作已完成。" : "");
  const progressText = progress
    ? `${phaseLabels[progress.phase]} · ${progress.unit === "files" ? `${progress.completed}${progress.total ? ` / ${progress.total}` : ""} 个文件` : `${size(progress.completed)}${progress.total ? ` / ${size(progress.total)}` : ""}`}`
    : busy;

  function restore(name: string, remote: boolean) {
    if (!confirmed) return;
    void run("正在下载、校验并暂存恢复…", () => client.restore(name, remote), restoreMessage);
  }

  function deleteActions(name: string, remote: boolean) {
    if (deleting?.name !== name || deleting.remote !== remote) {
      return <button type="button" disabled={locked} onClick={() => setDeleting({ name, remote })}>删除</button>;
    }
    return (
      <div className="app-backup-delete" role="group" aria-label={`确认删除${remote ? "云端" : "本地"}备份`}>
        <p>{remote ? "删除此云端备份，本地副本与资料库会保留。" : "删除此本地备份，云端副本与资料库会保留。"}</p>
        <div className="app-backup-actions">
          <button type="button" disabled={locked} onClick={() => void run("正在删除备份…", async () => {
            await client.delete(name, remote);
            setDeleting(null);
            if (remote) setRemoteItems(await client.listRemote());
          }, `已删除${remote ? "云端" : "本地"}备份。`)}>确认删除</button>
          <button type="button" disabled={Boolean(busy)} onClick={() => setDeleting(null)}>取消</button>
        </div>
      </div>
    );
  }

  function copyAddress(name = "") {
    void run("正在复制备份地址…", () => navigator.clipboard.writeText(new URL(name, status!.webdav.url).href), "备份地址已复制。");
  }

  return (
    <div className="app-settings-backup" aria-busy={Boolean(busy) || serverBusy}>
      {feedbackError || busy || serverBusy || feedbackMessage ? <div className="app-backup-feedback">
        {feedbackError ? <p role="alert" className="app-backup-error">{feedbackError}</p> : null}
        <p role="status" aria-live="polite" className="app-backup-status">{busy || serverBusy ? progressText : feedbackMessage}</p>
        {busy || serverBusy ? <progress className="app-backup-progress" aria-label="备份操作进度" max={progress?.total || 1} value={progress?.total ? Math.min(progress.completed, progress.total) : undefined} /> : null}
      </div> : null}
      {status?.pending_restore ? (
        <div className="app-backup-notice">
          <p>恢复已准备好。重启后替换资料库，当前数据会保留在备份目录。</p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void run("正在取消恢复…", () => client.cancel(), "已取消恢复，可以继续使用当前资料库。")}>取消待恢复操作</button>
        </div>
      ) : null}

      <section aria-labelledby="backup-local-title">
        <div className="app-backup-section-head">
          <h4 id="backup-local-title">本地迁移</h4>
          <div className="app-backup-actions">
            {client.canOpenLocation() ? <button type="button" disabled={Boolean(busy)} onClick={() => void run("正在打开备份文件夹…", () => client.openLocation())}>打开备份文件夹</button> : null}
            <button type="button" disabled={Boolean(busy)} onClick={() => void run("正在刷新…", async () => {})}>刷新</button>
          </div>
        </div>
        {status ? <p>本地备份位置：<span className="app-backup-path">{status.backup_dir}</span></p> : null}
        <p>将书库、原文与译文、合集、收藏批注、问答记录和术语表打包，换机时导入同一份 ZIP。</p>
        <label className="app-backup-check"><input type="checkbox" checked={includeCredentials} disabled={locked} onChange={(event) => setIncludeCredentials(event.target.checked)} />同时包含 OCR、翻译模型密钥与 Agent 配置</label>
        {includeCredentials ? <p className="app-backup-notice">密钥会以明文随迁移包保存，请只将文件存放在你信任的位置。WebDAV 密码始终留在本机。</p> : <p>未勾选时，迁移后需要重新设置模型接口。</p>}
        <button type="button" className="app-settings-action" disabled={cannotSnapshot} onClick={() => void run("正在创建迁移包，请稍候…", () => client.create(includeCredentials), "迁移包已创建，可以在下方下载。")}>创建迁移包</button>
        {status && status.active_tasks > 0 ? <p>当前有 {status.active_tasks} 个任务未结束，完成或取消后请点击刷新。</p> : null}
        <label className="app-backup-check"><input type="checkbox" checked={confirmed} disabled={locked} onChange={(event) => setConfirmed(event.target.checked)} />我确认重启后用备份替换当前资料库，现有数据会保留</label>
        {status?.items.length ? (
          <ul className="app-backup-file-list" aria-label="本地迁移包">
            {status.items.map((item) => (
              <li key={item.id}>
                <div><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time><small>{size(item.bytes)} · {item.file_count} 个文件{item.includes_credentials ? " · 含密钥" : ""}</small><small className="app-backup-path">{item.name}</small></div>
                <div className="app-backup-actions"><button type="button" disabled={Boolean(busy) || serverBusy} onClick={() => void run("正在下载迁移包…", () => client.download(item.name, setDownloadProgress), "迁移包已下载。")}>下载</button><button type="button" disabled={cannotRestore} onClick={() => restore(item.name, false)}>恢复</button>{client.canOpenLocation() ? <button type="button" disabled={Boolean(busy)} onClick={() => void run("正在定位备份文件…", () => client.openLocation(item.name))}>位置</button> : null}{deleteActions(item.name, false)}</div>
              </li>
            ))}
          </ul>
        ) : <p className="app-backup-empty">还没有本地迁移包。先创建一份，或选择另一台电脑导出的文件。</p>}
        <label htmlFor="backup-import-file">导入迁移包<input id="backup-import-file" type="file" accept=".zip,application/zip" disabled={locked} onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <button type="button" disabled={cannotRestore || !file} onClick={() => { if (file && confirmed) void run("正在上传并校验迁移包，请稍候…", () => client.import(file), restoreMessage); }}>校验并暂存恢复</button>
        {status?.restore_hint ? <p>{status.restore_hint}</p> : null}
        {status?.last_restore ? <div className="app-backup-location"><p>上次恢复前的数据：<span className="app-backup-path">{status.last_restore.previous_data_dir}</span></p>{client.canOpenLocation() ? <button type="button" disabled={Boolean(busy)} onClick={() => void run("正在打开恢复前的数据文件夹…", () => client.openLocation(undefined, true))}>打开原数据文件夹</button> : null}</div> : null}
      </section>

      <section aria-labelledby="backup-webdav-title">
        <h4 id="backup-webdav-title">WebDAV 备份</h4>
        <p>每次备份保存独立迁移包，并在本机保留副本。文件夹不存在时会尝试创建，父文件夹需已存在。</p>
        <p>坚果云填写 https://dav.jianguoyun.com/dav 即可，备份会保存到 PaperLoom 文件夹。</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          void run("正在保存 WebDAV 设置…", async () => {
            const saved = await client.saveSettings(davInput());
            setUrl(saved.url);
            setUsername(saved.username);
            setPassword("");
            setRemoteItems(null);
          }, "WebDAV 设置已保存。");
        }}>
          <label htmlFor="backup-webdav-url">文件夹地址<input id="backup-webdav-url" type="url" placeholder="https://dav.example.com/PaperLoom/" value={url} disabled={locked} required onChange={(event) => setUrl(event.target.value)} /></label>
          <div className="app-backup-fields">
            <label htmlFor="backup-webdav-username">账号<input id="backup-webdav-username" autoComplete="username" value={username} disabled={locked} onChange={(event) => setUsername(event.target.value)} /></label>
            <label htmlFor="backup-webdav-password">密码<input id="backup-webdav-password" type="password" autoComplete="new-password" value={password} disabled={locked} placeholder={status?.webdav.password_configured ? "已保存，留空保留原密码" : "WebDAV 密码或应用专用密码"} onChange={(event) => setPassword(event.target.value)} /></label>
          </div>
          <div className="app-backup-actions"><button type="submit" disabled={locked || !url.trim()}>保存设置</button><button type="button" disabled={locked || !url.trim()} onClick={() => void run("正在测试 WebDAV 连接…", () => client.test(davInput()), "WebDAV 连接成功，可以读取备份文件夹；上传时会检查文件写入权限。")}>测试连接</button></div>
        </form>
        {dirty && url ? <p>保存设置后，可以备份到此文件夹并查看云端文件。</p> : null}
        {status?.webdav.url ? <div className="app-backup-location"><p>云端备份位置：<span className="app-backup-path">{status.webdav.url}</span></p><button type="button" disabled={Boolean(busy)} onClick={() => copyAddress()}>复制文件夹地址</button></div> : null}
        <div className="app-backup-actions">
          <button type="button" className="app-settings-action" disabled={cannotSnapshot || dirty || !status?.webdav.url} onClick={() => void run("正在创建并上传 WebDAV 备份…", async () => { await client.backupRemote(includeCredentials); setRemoteItems(await client.listRemote()); }, "备份已上传到 WebDAV，本机副本也已保留。")}>立即备份</button>
          <button type="button" disabled={locked || dirty || !status?.webdav.url} onClick={() => void run("正在读取云端备份…", async () => setRemoteItems(await client.listRemote()))}>查看云端备份</button>
        </div>
        {remoteItems ? remoteItems.length ? (
          <ul className="app-backup-file-list" aria-label="WebDAV 迁移包">{remoteItems.map((item) => <li key={item.name}><div><span className="app-backup-path">{item.name}</span><small>{size(item.bytes)}</small></div><div className="app-backup-actions"><button type="button" disabled={locked || status?.items.some((local) => local.name === item.name)} onClick={() => void run("正在同步云端备份到本地…", () => client.syncRemote(item.name), "备份已同步到本地，可在本地列表中下载或恢复。")}>{status?.items.some((local) => local.name === item.name) ? "已在本地" : "同步到本地"}</button><button type="button" disabled={cannotRestore} onClick={() => restore(item.name, true)}>恢复</button><button type="button" disabled={Boolean(busy)} onClick={() => copyAddress(item.name)}>复制地址</button>{deleteActions(item.name, true)}</div></li>)}</ul>
        ) : <p className="app-backup-empty">此文件夹还没有 PaperLoom 备份。</p> : null}
      </section>
    </div>
  );
}
