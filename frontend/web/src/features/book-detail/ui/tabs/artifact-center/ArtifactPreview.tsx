import { useEffect, useRef, useState } from "react";
import { strFromU8, unzipSync } from "fflate";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogShell,
  DialogTitle,
} from "@retainpdf/ui";

import { fetchProtected } from "@/platform/api/index.js";
import type { ArtifactCenterItem } from "../../../domain/artifact-center-model.js";

type Contents =
  | { pdfUrl: string }
  | { text: string; files?: string[] }
  | { error: string };

export function ArtifactPreview({ item, onClose }: { item: ArtifactCenterItem; onClose: () => void }) {
  const [contents, setContents] = useState<Contents | null>(null);
  const opener = useRef(document.activeElement);
  const format = item.preview || (item.kind === "PDF" ? "pdf" : item.kind === "JSON" ? "json" : "markdown");
  useEffect(() => {
    const controller = new AbortController();
    let pdfUrl = "";
    async function load() {
      const response = await fetchProtected(item.url, { signal: controller.signal });
      if (!response.ok) throw new Error(`文件读取失败（HTTP ${response.status}）`);
      if (format === "pdf") {
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        pdfUrl = URL.createObjectURL(blob.slice(0, blob.size, "application/pdf"));
        setContents({ pdfUrl });
      } else if (format === "markdown-zip") {
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (controller.signal.aborted) return;
        const files: string[] = [];
        const markdown = unzipSync(bytes, { filter: ({ name }) => {
          if (!name.endsWith("/")) files.push(name);
          return /\.md$/i.test(name);
        } });
        setContents({ files, text: Object.values(markdown).map(data => strFromU8(data)).join("\n\n") });
      } else {
        const text = format === "json"
          ? JSON.stringify(await response.json(), null, 2)
          : await response.text();
        if (!controller.signal.aborted) setContents({ text });
      }
    }
    void load().catch((error: Error) => {
      if (!controller.signal.aborted) setContents({ error: error.message });
    });
    return () => {
      controller.abort();
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [item, format]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent id="book-detail-artifact-preview" level="nested" size="wide"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (opener.current instanceof HTMLElement) opener.current.focus({ preventScroll: true });
        }}
        aria-describedby={undefined} showCloseButton={false}>
        <DialogShell>
          <DialogHeader>
            <DialogTitle className="min-w-0 break-all">{item.filename}</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <DialogBody className="book-detail-preview-body">
            {!contents && <p role="status">正在读取文件…</p>}
            {contents && "error" in contents && <p role="alert">{contents.error}</p>}
            {contents && "pdfUrl" in contents && (
              <iframe title={item.label} src={contents.pdfUrl} />
            )}
            {contents && "text" in contents && <>
              {contents.files && <details>
                <summary>包内文件（{contents.files.length}）</summary>
                <ul>{contents.files.map(name => <li key={name}>{name}</li>)}</ul>
              </details>}
              <pre className="m-0 whitespace-pre-wrap break-words text-sm">{contents.text}</pre>
            </>}
          </DialogBody>
        </DialogShell>
      </DialogContent>
    </Dialog>
  );
}
