import { useRef, useState } from "react";
import { Button } from "@/ui/components/button.js";
import {
  Dialog, DialogBody, DialogCloseButton, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogShell, DialogTitle,
} from "@/ui/components/dialog.js";
import { batchExportApi, type BatchExportFormat, type BatchExportResult } from "@/platform/api/domains/batch-export.js";

const formats: { value: BatchExportFormat; label: string; description: string }[] = [
  { value: "translated", label: "仅译文", description: "每篇文献的翻译 PDF。" },
  { value: "comparison", label: "对照译文", description: "将原文与译文并排排版为对照 PDF。" },
  { value: "source", label: "原文", description: "上传时的原始 PDF，无需先完成翻译。" },
  { value: "markdown", label: "仅 Markdown", description: "OCR 原文 Markdown 及其图片附件，不包含 PDF。" },
  { value: "obsidian", label: "Obsidian 笔记包", description: "译文笔记、图片及译文 PDF，可同时包含互相链接的原文笔记。解压后放入 Obsidian 库即可。" },
];

export function BatchExportDialog({ open, onOpenChange, documentIds, client = batchExportApi }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentIds: string[];
  client?: typeof batchExportApi;
}) {
  const [format, setFormat] = useState<BatchExportFormat>("translated");
  const [includeSource, setIncludeSource] = useState(true);
  const [busy, setBusy] = useState("");
  const running = useRef(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<BatchExportResult | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number | null } | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  async function run(downloadOnly = false) {
    if (running.current) return;
    running.current = true;
    setBusy(downloadOnly ? "正在下载导出包…" : `正在整理 ${documentIds.length} 篇文献并生成导出包…`);
    setError("");
    setProgress(null);
    setDownloaded(false);
    if (!downloadOnly) setResult(null);
    try {
      const destination = await client.pickDestination();
      const next = downloadOnly ? result! : await client.export([...documentIds], format, includeSource);
      setResult(next);
      if (next.name) {
        setBusy("正在下载导出包…");
        await client.download(next.name, destination, (loaded, total) => setProgress({ loaded, total }));
        setDownloaded(true);
      }
    } catch (failure) {
      if (!(failure instanceof Error && failure.name === "AbortError")) {
        setError(failure instanceof Error ? failure.message : "导出失败，请重试。");
      }
    } finally {
      running.current = false;
      setBusy("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!running.current) onOpenChange(next); }}>
      <DialogContent size="standard" showCloseButton={false} aria-busy={Boolean(busy)}>
        <DialogShell>
          <DialogHeader>
            <DialogTitle>批量导出文献</DialogTitle>
            <DialogDescription>已选择 {documentIds.length} 篇，每次最多导出 100 篇。每篇文献独立存放，图片与笔记保持关联；未就绪的文献会列出原因。</DialogDescription>
            <DialogCloseButton disabled={Boolean(busy)} />
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-4">
              <label className="grid gap-2" htmlFor="batch-export-format">
                <span>导出内容</span>
                <select id="batch-export-format" className="w-full rounded-[var(--btn-radius)] border border-border bg-paper p-2 text-foreground" value={format} disabled={Boolean(busy)} onChange={(event) => { setFormat(event.target.value as BatchExportFormat); setResult(null); setError(""); }}>
                  {formats.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <p className="text-sm text-muted-foreground">{formats.find((item) => item.value === format)?.description}</p>
              {format === "obsidian" ? <label className="flex items-center gap-2"><input type="checkbox" checked={includeSource} disabled={Boolean(busy)} onChange={(event) => { setIncludeSource(event.target.checked); setResult(null); }} />同时包含原文笔记</label> : null}
              {busy ? <div className="grid gap-2" role="status" aria-live="polite">
                <p>{busy}{progress ? ` ${(progress.loaded / 1024 / 1024).toFixed(1)}${progress.total ? ` / ${(progress.total / 1024 / 1024).toFixed(1)}` : ""} MiB` : ""}</p>
                <progress className="w-full" aria-label="文献导出进度" max={progress?.total || 1} value={progress?.total ? progress.loaded : undefined} />
              </div> : null}
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              {result ? <div className="grid gap-2">
                <p role="status">已导出 {result.exported} 篇，{result.failed} 篇未导出。{downloaded ? "导出包已下载。" : ""}</p>
                {result.failed ? <ul className="grid gap-2 text-sm">{result.items.filter((item) => item.message).map((item) => <li key={item.document_id} className="break-words"><strong>{item.title}</strong>：{item.message}</li>)}</ul> : null}
                {result.name && !busy ? <Button variant="outline" onClick={() => void run(true)}>重新下载导出包</Button> : null}
              </div> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" disabled={Boolean(busy)} onClick={() => onOpenChange(false)}>关闭</Button>
            <Button disabled={Boolean(busy) || !documentIds.length || documentIds.length > 100} onClick={() => void run()}>导出 ZIP</Button>
          </DialogFooter>
        </DialogShell>
      </DialogContent>
    </Dialog>
  );
}
