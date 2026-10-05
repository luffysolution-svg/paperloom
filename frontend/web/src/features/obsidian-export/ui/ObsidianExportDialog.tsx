import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Gem, LoaderCircle } from "lucide-react";
import { ObsidianBatchExportSummary } from "./ObsidianBatchExportSummary.js";

import { Button } from "@/ui/components/button.js";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogShell,
  DialogTitle,
} from "@/ui/components/dialog.js";
import {
  exportDocumentsToObsidian,
  exportJobToObsidian,
  getObsidianIntegration,
  type ObsidianBatchExportResult,
  type ObsidianConflictPolicy,
  type ObsidianExportResult,
  type ObsidianIntegration,
} from "@/platform/api/index.js";

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

type Phase =
  | { kind: "form" }
  | { kind: "conflict"; result: ObsidianExportResult }
  | { kind: "done"; result: ObsidianExportResult }
  | { kind: "batchDone"; result: ObsidianBatchExportResult };

export function ObsidianExportDialog({
  open,
  onOpenChange,
  jobId = "",
  documentIds = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId?: string;
  documentIds?: string[];
}) {
  const [integration, setIntegration] = useState<ObsidianIntegration | null>(
    null,
  );
  const [loadError, setLoadError] = useState("");
  const [vaultId, setVaultId] = useState("");
  const [folder, setFolder] = useState("");
  const [includeSource, setIncludeSource] = useState(true);
  const [byCollection, setByCollection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const batchMode = documentIds.length > 0;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIntegration(null);
    setLoadError("");
    setError("");
    setPhase({ kind: "form" });
    getObsidianIntegration()
      .then((data) => {
        if (cancelled) return;
        setIntegration(data);
        const available = data.vaults.filter((vault) => vault.available);
        const preferred = available.find(
          (vault) => vault.id === data.settings.default_vault_id,
        );
        setVaultId((preferred || available[0])?.id || "");
        setFolder(data.settings.folder);
        setIncludeSource(data.settings.include_source);
        setByCollection(Boolean(data.settings.folder_by_collection));
      })
      .catch(
        (reason) => !cancelled && setLoadError(`${reason?.message || reason}`),
      );
    return () => {
      cancelled = true;
    };
  }, [open]);

  const submit = useCallback(
    async (onConflict: ObsidianConflictPolicy) => {
      setBusy(true);
      setError("");
      try {
        const payload = {
          vault_id: vaultId,
          folder,
          include_source: includeSource,
          folder_by_collection: byCollection,
          on_conflict: onConflict,
        };
        if (batchMode) {
          const result = await exportDocumentsToObsidian(documentIds, payload);
          setPhase({ kind: "batchDone", result });
          return;
        }
        const result = await exportJobToObsidian(jobId, payload);
        if (result.status === "conflict") {
          setPhase({ kind: "conflict", result });
        } else if (result.status === "skipped") {
          onOpenChange(false);
        } else {
          setPhase({ kind: "done", result });
        }
      } catch (reason: any) {
        setError(`${reason?.message || reason}`);
      } finally {
        setBusy(false);
      }
    },
    [
      batchMode,
      byCollection,
      documentIds,
      folder,
      includeSource,
      jobId,
      onOpenChange,
      vaultId,
    ],
  );

  const availableVaults =
    integration?.vaults.filter((vault) => vault.available) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="book-detail-obsidian-dialog"
        level="nested"
        showCloseButton={false}
        size="compact"
      >
        <DialogShell>
          <DialogHeader>
            <DialogTitle>
              {batchMode
                ? `批量保存 ${documentIds.length} 篇到 Obsidian`
                : "保存到 Obsidian"}
            </DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <DialogBody>
            {!integration && !loadError ? (
              <p className="book-detail-obsidian-status">
                <LoaderCircle className="is-spinning" aria-hidden="true" />
                正在查找 Obsidian 库…
              </p>
            ) : null}
            {loadError ? (
              <p className="book-detail-obsidian-error" role="alert">
                {loadError}
              </p>
            ) : null}

            {integration &&
            phase.kind === "form" &&
            availableVaults.length === 0 ? (
              <div className="book-detail-obsidian-empty">
                <p>没有找到可写入的 Obsidian 库。</p>
                <p>
                  桌面版：先在 Obsidian 里创建或打开一个库，再回来重试
                  {integration.obsidian_config_path
                    ? `（读取 ${integration.obsidian_config_path}）`
                    : ""}
                  。
                </p>
                <p>
                  Docker：把库目录挂载进容器，并设置{" "}
                  <code>PAPERLOOM_OBSIDIAN_VAULTS_DIR</code>
                  {integration.mounted_vaults_dir
                    ? `（当前 ${integration.mounted_vaults_dir}）`
                    : ""}
                  。
                </p>
              </div>
            ) : null}

            {integration &&
            phase.kind === "form" &&
            availableVaults.length > 0 ? (
              <form
                id="book-detail-obsidian-form"
                className="book-detail-obsidian-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(batchMode ? "rename" : "ask");
                }}
              >
                <DialogDescription>
                  译文笔记与原文笔记分开保存、互相链接；图片按出现顺序重命名，与译文
                  PDF 一起放在同名 .assets 目录。
                  {batchMode
                    ? "同名冲突会自动另存为新笔记；没有已完成译文的文献会列在结果中。"
                    : "再次保存会更新同一篇，你在标记外写的内容会保留。"}
                </DialogDescription>
                <label>
                  <span>库</span>
                  <select
                    id="book-detail-obsidian-vault"
                    value={vaultId}
                    onChange={(event) => setVaultId(event.target.value)}
                  >
                    {availableVaults.map((vault) => (
                      <option
                        key={vault.id}
                        value={vault.id}
                        title={vault.path}
                      >
                        {vault.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>目录</span>
                  <input
                    id="book-detail-obsidian-folder"
                    value={folder}
                    placeholder="留空表示库根目录"
                    onChange={(event) => setFolder(event.target.value)}
                  />
                </label>
                <label className="book-detail-obsidian-check">
                  <input
                    id="book-detail-obsidian-include-source"
                    type="checkbox"
                    checked={includeSource}
                    onChange={(event) => setIncludeSource(event.target.checked)}
                  />
                  <span>同时保存原文笔记</span>
                </label>
                <label className="book-detail-obsidian-check">
                  <input
                    id="book-detail-obsidian-by-collection"
                    type="checkbox"
                    checked={byCollection}
                    onChange={(event) => setByCollection(event.target.checked)}
                  />
                  <span>Zotero 文献按所在分类建子目录</span>
                </label>
              </form>
            ) : null}

            {phase.kind === "conflict" ? (
              <div className="book-detail-obsidian-conflict" role="alert">
                <p>
                  库里已有 <code>{phase.result.note_path}</code>
                  ，且不是这篇文献导出的笔记。
                </p>
                <p>另存为会使用带编号的新文件名；覆盖会替换原来那篇。</p>
              </div>
            ) : null}

            {phase.kind === "done" ? (
              <div className="book-detail-obsidian-done">
                <p>
                  已{phase.result.status === "updated" ? "更新" : "保存到"}「
                  {phase.result.vault_name}」：
                  <code>{phase.result.note_path}</code>
                </p>
                {phase.result.source_note_path ? (
                  <p>
                    原文笔记：<code>{phase.result.source_note_path}</code>
                  </p>
                ) : null}
              </div>
            ) : null}

            {phase.kind === "batchDone" ? (
              <ObsidianBatchExportSummary result={phase.result} />
            ) : null}

            {error ? (
              <p className="book-detail-obsidian-error" role="alert">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {phase.kind === "form" ? (
              <>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    取消
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  form="book-detail-obsidian-form"
                  disabled={busy || !vaultId}
                >
                  {busy ? (
                    <LoaderCircle className="is-spinning" aria-hidden="true" />
                  ) : (
                    <Gem aria-hidden="true" />
                  )}
                  {batchMode ? `保存 ${documentIds.length} 篇` : "保存"}
                </Button>
              </>
            ) : null}
            {phase.kind === "conflict" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setPhase({ kind: "form" })}
                >
                  返回
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void submit("overwrite")}
                >
                  覆盖
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit("rename")}
                >
                  另存为新笔记
                </Button>
              </>
            ) : null}
            {phase.kind === "batchDone" ? (
              <DialogClose asChild>
                <Button type="button">完成</Button>
              </DialogClose>
            ) : null}
            {phase.kind === "done" ? (
              <>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    完成
                  </Button>
                </DialogClose>
                {phase.result.obsidian_uri ? (
                  <Button
                    type="button"
                    onClick={() =>
                      openExternalUri(phase.result.obsidian_uri || "")
                    }
                  >
                    <ExternalLink aria-hidden="true" />在 Obsidian 中打开
                  </Button>
                ) : null}
              </>
            ) : null}
          </DialogFooter>
        </DialogShell>
      </DialogContent>
    </Dialog>
  );
}
