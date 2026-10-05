import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { writeDocumentsToZotero, type ZoteroBatchWritebackResult } from "@/platform/api/index.js";
import { Button } from "@/ui/components/button.js";
import {
  Dialog, DialogBody, DialogClose, DialogCloseButton, DialogContent,
  DialogDescription, DialogFooter, DialogHeader, DialogShell, DialogTitle,
} from "@/ui/components/dialog.js";

export function ZoteroBatchWritebackDialog({ open, onOpenChange, documentIds }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ZoteroBatchWritebackResult | null>(null);
  const count = new Set(documentIds).size;

  useEffect(() => {
    if (!open) return;
    setError("");
    setResult(null);
  }, [open]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      setResult(await writeDocumentsToZotero(documentIds));
    } catch (reason: any) {
      setError(`${reason?.message || reason}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent id="library-zotero-writeback-dialog" level="nested" showCloseButton={false} size="compact">
        <DialogShell>
          <DialogHeader>
            <DialogTitle>批量写回 Zotero</DialogTitle>
            <DialogCloseButton disabled={busy} />
          </DialogHeader>
          <DialogBody>
            <DialogDescription>
              将所选 {count} 篇文献的最新成功译文 PDF 写回原 Zotero 文献。需要同机运行 Zotero 10+；首次授权建议选择“始终允许”。再次写回更新原译文附件。
            </DialogDescription>
            {count > 200 ? <p className="mt-3 text-sm text-destructive" role="alert">每批最多写回 200 篇，请减少选择。</p> : null}
            {busy ? (
              <p className="mt-3 flex items-center gap-2 text-sm" role="status">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                正在逐篇写回；请在 Zotero 中完成授权，等待批次结束…
              </p>
            ) : null}
            {error ? <p className="mt-3 text-sm text-destructive" role="alert">{error}</p> : null}
            {result ? (
              <div className="mt-3 text-sm" role="status">
                <p>已创建 {result.created} 篇，更新 {result.updated} 篇，失败 {result.failed} 篇。</p>
                <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                  {result.items.map((item) => (
                    <li key={item.document_id}>
                      <strong>{item.title || item.document_id}</strong>：
                      {item.message || (item.result?.status === "created" ? "已创建译文附件" : "已更新译文附件")}
                      {item.result ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => window.open(item.result!.zotero_uri, "_blank")}>
                          在 Zotero 中打开
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            {!result ? <Button type="button" disabled={busy || count === 0 || count > 200} onClick={() => void submit()}>
              {busy ? "正在写回…" : "写回所选译文 PDF"}
            </Button> : null}
            <DialogClose asChild><Button type="button" variant="outline" disabled={busy}>{result ? "完成" : "取消"}</Button></DialogClose>
          </DialogFooter>
        </DialogShell>
      </DialogContent>
    </Dialog>
  );
}
