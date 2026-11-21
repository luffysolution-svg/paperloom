import { useEffect, useRef, useState } from "react";
import { Archive, FileArchive, FolderOpen, Import, PackageOpen, RefreshCw, Upload } from "lucide-react";
import { Button, Checkbox, Input } from "@retainpdf/ui";
import { backupApi, type BackupClient, type BackupProgress, type BackupStatus } from "@/platform/api/domains/backups.js";

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}

function displayPath(path: string): string {
  return path.replace(/^\\\\\?\\UNC\\/i, "\\\\").replace(/^\\\\\?\\/, "");
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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!active) return;
    let ignore = false;
    client.status().then((next) => {
      if (ignore) return;
      setStatus(next);
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
  const restoreMessage = "迁移包已校验并暂存。请退出并重新启动应用；网页部署请重启后端服务。";
  const progress = downloadProgress || (serverBusy ? status.operation : null);
  const phaseLabels = { pack: "正在打包", upload: "正在上传到 WebDAV", download: "正在下载", import: "正在接收迁移包", validate: "正在校验迁移包" };
  const feedbackError = error || (!busy && status?.operation?.state === "failed" ? status.operation.message : "");
  const progressText = progress
    ? `${phaseLabels[progress.phase]} · ${progress.unit === "files" ? `${progress.completed}${progress.total ? ` / ${progress.total}` : ""} 个文件` : `${size(progress.completed)}${progress.total ? ` / ${progress.total}` : ""}`}`
    : busy;

  function restore(name: string) {
    if (!confirmed) return;
    void run("正在下载、校验并暂存恢复…", () => client.restore(name, false), restoreMessage);
  }

  function deleteActions(name: string) {
    if (!deleting) {
      return <Button type="button" variant="secondary" disabled={locked} onClick={() => setDeleting(true)}>删除</Button>;
    }
    return (
      <div className="app-backup-delete" role="group" aria-label="确认删除本地备份">
        <p>删除此本地备份，资料库会保留。</p>
        <div className="app-backup-actions">
          <Button type="button" variant="secondary" disabled={locked} onClick={() => void run("正在删除备份…", async () => {
            await client.delete(name, false);
            setDeleting(false);
          }, "已删除本地备份。")}>确认删除</Button>
          <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => setDeleting(false)}>取消</Button>
        </div>
      </div>
    );
  }

  const credentialOption = (
    <div className="app-backup-option">
      <Checkbox checked={includeCredentials} disabled={locked} onChange={(event) => setIncludeCredentials(event.target.checked)} label="包含 OCR、翻译密钥与 Agent 配置" />
      {includeCredentials && <p>密钥将以明文写入迁移包，请妥善保管。</p>}
    </div>
  );
  const restoreConsent = (
    <Checkbox checked={confirmed} disabled={locked} onChange={(event) => setConfirmed(event.target.checked)} label="我确认重启后用迁移包替换当前资料库，并保留原数据副本" />
  );

  return (
    <div className="app-settings-backup" aria-busy={Boolean(busy) || serverBusy}>
      {feedbackError || busy || serverBusy || message ? <div className="app-backup-feedback">
        {feedbackError ? <p role="alert" className="app-backup-error">{feedbackError}</p> : null}
        <p role="status" aria-live="polite" className="app-backup-status">{busy || serverBusy ? progressText : message}</p>
        {busy || serverBusy ? <progress className="app-backup-progress" aria-label="备份操作进度" max={progress?.total || 1} value={progress?.total ? Math.min(progress.completed, progress.total) : undefined} /> : null}
      </div> : null}
      {status?.pending_restore ? (
        <div className="app-backup-notice">
          <p>恢复已准备好。重启后替换资料库，当前数据会保留在备份目录。</p>
          <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => void run("正在取消恢复…", () => client.cancel(), "已取消恢复，可以继续使用当前资料库。")}>取消待恢复操作</Button>
        </div>
      ) : null}

      {status && status.active_tasks > 0 ? <p role="status">当前有 {status.active_tasks} 个任务未结束，完成或取消后可备份或恢复。</p> : null}
      <section aria-labelledby="backup-export-title">
        <div className="app-backup-section-head">
          <h4 id="backup-export-title"><PackageOpen aria-hidden="true" />导出书库</h4>
          <Button variant="primary" disabled={cannotSnapshot} onClick={() => void run("正在创建迁移包…", () => client.create(includeCredentials), "迁移包已创建，可在本地迁移包列表中下载。")}><Archive size={15} aria-hidden="true" />创建迁移包</Button>
        </div>
        <p>将原文和译文、合集、收藏与批注、问答记录及术语表打包为 ZIP，供另一台电脑导入。</p>
        {credentialOption}
      </section>
      <section aria-labelledby="backup-import-title">
        <h4 id="backup-import-title"><Import aria-hidden="true" />导入与恢复</h4>
        <label className="app-backup-picker">
          <FileArchive size={20} aria-hidden="true" />
          <span>{file ? file.name : "选择 ZIP 迁移包"}</span>
          <Upload size={15} aria-hidden="true" />
          <Input id="backup-import-file" type="file" aria-label="选择 ZIP 迁移包" accept=".zip,application/zip" disabled={locked} onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        {restoreConsent}
        <Button variant="secondary" disabled={cannotRestore || !file} onClick={() => { if (file && confirmed) void run("正在上传并校验迁移包…", () => client.import(file), restoreMessage); }}>校验并暂存恢复</Button>
        {status?.restore_hint ? <p>{status.restore_hint}</p> : null}
      </section>
      <section aria-labelledby="backup-local-title">
        <div className="app-backup-section-head">
          <h4 id="backup-local-title"><FolderOpen aria-hidden="true" />本地迁移包</h4>
          <div className="app-backup-actions">
            {client.canOpenLocation() ? <Button variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => void run("正在打开备份文件夹…", () => client.openLocation())}>打开备份文件夹</Button> : null}
            <Button variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => void run("正在刷新…", async () => {})}><RefreshCw size={13} aria-hidden="true" />刷新</Button>
          </div>
        </div>
        {status ? <p>本地备份位置：<span className="app-backup-path app-backup-location-path" title={displayPath(status.backup_dir)}>{displayPath(status.backup_dir)}</span></p> : null}
        {status?.items.length ? (
          <ul className="app-backup-file-list" aria-label="本地迁移包">
            {status.items.map((item) => (
              <li key={item.id}>
                <div>
                  <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time>
                  <small>{size(item.bytes)} · {item.file_count} 个文件{item.includes_credentials ? " · 含密钥" : ""}</small>
                  <small className="app-backup-path">{item.name}</small>
                </div>
                <div className="app-backup-actions">
                  <Button variant="secondary" size="sm" disabled={Boolean(busy) || serverBusy} onClick={() => void run("正在下载迁移包…", () => client.download(item.name, setDownloadProgress), "迁移包已下载。")}>下载</Button>
                  <Button variant="secondary" size="sm" disabled={cannotRestore} onClick={() => restore(item.name)}>恢复</Button>
                  {client.canOpenLocation() && <Button variant="secondary" size="sm" disabled={Boolean(busy)} onClick={() => void run("正在定位备份文件…", () => client.openLocation(item.name))}>位置</Button>}
                  {deleteActions(item.name)}
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="app-backup-empty">尚无本地迁移包</p>}
        {status?.last_restore ? <div className="app-backup-location"><p>上次恢复前的数据：<span className="app-backup-path app-backup-location-path" title={displayPath(status.last_restore.previous_data_dir)}>{displayPath(status.last_restore.previous_data_dir)}</span></p>{client.canOpenLocation() ? <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => void run("正在打开恢复前的数据文件夹…", () => client.openLocation(undefined, true))}>打开原数据文件夹</Button> : null}</div> : null}
      </section>
    </div>
  );
}
