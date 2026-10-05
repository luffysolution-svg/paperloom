import { useCallback, useEffect, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

import { writeTranslatedPdfToZotero, type ZoteroWritebackResult } from "@/platform/api/index.js";
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

function openZoteroUri(uri: string): void {
  if (typeof window === "undefined" || !uri) return;
  window.open(uri, "_blank");
}

export function ZoteroWritebackDialog({
  open,
  onOpenChange,
  jobId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ZoteroWritebackResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError("");
    setResult(null);
  }, [open]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setResult(await writeTranslatedPdfToZotero(jobId));
    } catch (reason: any) {
      setError(`${reason?.message || reason}`);
    } finally {
      setBusy(false);
    }
  }, [jobId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        id="book-detail-zotero-writeback-dialog"
        level="nested"
        showCloseButton={false}
        size="compact"
      >
        <DialogShell>
          <DialogHeader>
            <DialogTitle>写回 Zotero</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <DialogBody>
            {result ? (
              <div className="book-detail-obsidian-done">
                <strong>{result.status === "created" ? "已创建译文附件" : "已更新译文附件"}</strong>
                <p>{result.filename}</p>
              </div>
            ) : (
              <DialogDescription>
                将译文 PDF 作为原文献的子附件写回 Zotero。首次写入时 Zotero 会弹出授权窗口；建议选择“始终允许”，否则上传各阶段可能需要重复确认。再次写回会更新同一个译文附件。
              </DialogDescription>
            )}
            {busy ? (
              <p className="book-detail-obsidian-status" role="status">
                <LoaderCircle className="is-spinning" aria-hidden="true" />
                正在等待 Zotero 授权并上传译文 PDF…
              </p>
            ) : null}
            {error ? (
              <p className="book-detail-obsidian-error" role="alert">{error}</p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {result ? (
              <Button type="button" onClick={() => openZoteroUri(result.zotero_uri)}>
                <ExternalLink aria-hidden="true" />
                在 Zotero 中打开
              </Button>
            ) : (
              <Button type="button" disabled={busy} onClick={() => void submit()}>
                {busy ? "正在写回…" : "写回译文 PDF"}
              </Button>
            )}
            <DialogClose asChild>
              <Button type="button" variant="outline">{result ? "完成" : "取消"}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogShell>
      </DialogContent>
    </Dialog>
  );
}
