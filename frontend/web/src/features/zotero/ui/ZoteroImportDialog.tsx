// 从 Zotero 选择文献导入书库（桌面端读本地 API，Docker 读挂载的数据目录）。
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, LoaderCircle, Search } from "lucide-react";

import { Button } from "@/ui/components/button.js";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogShell,
  DialogTitle,
} from "@/ui/components/dialog.js";
import {
  getZoteroStatus,
  importZoteroAttachments,
  listZoteroCollections,
  listZoteroItems,
  type ZoteroCollection,
  type ZoteroItem,
  type ZoteroStatus,
} from "@/platform/api/index.js";
import {
  orderCollections,
  runZoteroImport,
  selectionKey,
  type ZoteroImportSummary,
  type ZoteroSelection,
} from "../domain/import-flow.js";

const PAGE_SIZE = 50;

export function ZoteroImportDialog({
  open,
  onOpenChange,
  translateDocument,
  requestLibraryRefresh,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translateDocument: (documentId: string) => Promise<unknown>;
  requestLibraryRefresh: () => void;
}) {
  const [status, setStatus] = useState<ZoteroStatus | null>(null);
  const [loadError, setLoadError] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [collections, setCollections] = useState<ZoteroCollection[]>([]);
  const [collectionKey, setCollectionKey] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ZoteroItem[]>([]);
  const [total, setTotal] = useState(0);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selected, setSelected] = useState<Map<string, ZoteroSelection>>(new Map());
  const [translate, setTranslate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ZoteroImportSummary | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStatus(null);
    setLoadError("");
    setSelected(new Map());
    setSummary(null);
    setCollectionKey("");
    setQueryInput("");
    setQuery("");
    getZoteroStatus()
      .then((data) => {
        if (cancelled) return;
        setStatus(data);
        setLibraryId(data.libraries[0]?.id || "");
      })
      .catch((reason) => !cancelled && setLoadError(`${reason?.message || reason}`));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !libraryId) return;
    let cancelled = false;
    setCollections([]);
    listZoteroCollections(libraryId)
      .then((data) => !cancelled && setCollections(data))
      .catch((reason) => !cancelled && setLoadError(`${reason?.message || reason}`));
    return () => {
      cancelled = true;
    };
  }, [open, libraryId]);

  const loadItems = useCallback(async (start: number) => {
    setItemsLoading(true);
    setLoadError("");
    try {
      const page = await listZoteroItems({
        library_id: libraryId,
        collection_key: collectionKey || undefined,
        q: query || undefined,
        start,
        limit: PAGE_SIZE,
      });
      setItems((previous) => (start === 0 ? page.items : [...previous, ...page.items]));
      setTotal(page.total);
    } catch (reason: any) {
      setLoadError(`${reason?.message || reason}`);
    } finally {
      setItemsLoading(false);
    }
  }, [collectionKey, libraryId, query]);

  useEffect(() => {
    if (!open || !libraryId) return;
    setItems([]);
    void loadItems(0);
  }, [open, libraryId, loadItems]);

  const orderedCollections = useMemo(() => orderCollections(collections), [collections]);

  const toggle = (item: ZoteroItem, attachmentKey: string, checked: boolean) => {
    setSelected((previous) => {
      const next = new Map(previous);
      const key = selectionKey(item.key, attachmentKey);
      if (checked) {
        next.set(key, {
          item_key: item.key,
          attachment_key: attachmentKey,
          collection_key: collectionKey,
          title: item.title,
        });
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const submit = async () => {
    setBusy(true);
    try {
      setSummary(await runZoteroImport({
        libraryId,
        selections: [...selected.values()],
        translate,
        importAttachments: importZoteroAttachments,
        translateDocument,
        requestLibraryRefresh,
      }));
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(status?.supported && libraryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="home-zotero-dialog" showCloseButton={false} size="wide">
        <DialogShell>
          <DialogHeader>
            <DialogTitle>从 Zotero 导入</DialogTitle>
            <DialogCloseButton />
          </DialogHeader>
          <DialogBody>
            {!status && !loadError ? (
              <p className="home-zotero-status">
                <LoaderCircle className="is-spinning" aria-hidden="true" />正在连接 Zotero…
              </p>
            ) : null}
            {status && !status.supported ? (
              <p className="home-zotero-error" role="alert">{status.message || "Zotero 不可用。"}</p>
            ) : null}
            {status?.supported && status.notice ? (
              <p className="home-zotero-status" role="status">{status.notice}</p>
            ) : null}

            {ready && !summary ? (
              <div className="home-zotero-layout">
                <nav className="home-zotero-collections" aria-label="Zotero 分类">
                  {status && status.libraries.length > 1 ? (
                    <select
                      id="home-zotero-library"
                      value={libraryId}
                      onChange={(event) => {
                        setCollectionKey("");
                        setLibraryId(event.target.value);
                      }}
                    >
                      {status.libraries.map((library) => (
                        <option key={library.id} value={library.id}>{library.name}</option>
                      ))}
                    </select>
                  ) : null}
                  <button
                    type="button"
                    className={collectionKey === "" ? "is-active" : ""}
                    onClick={() => setCollectionKey("")}
                  >
                    全部文献
                  </button>
                  {orderedCollections.map((collection) => (
                    <button
                      key={collection.key}
                      type="button"
                      className={collectionKey === collection.key ? "is-active" : ""}
                      style={{ paddingLeft: `${10 + collection.depth * 14}px` }}
                      onClick={() => setCollectionKey(collection.key)}
                    >
                      {collection.name}
                    </button>
                  ))}
                </nav>

                <section className="home-zotero-items" aria-label="文献">
                  <form
                    className="home-zotero-search"
                    role="search"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setQuery(queryInput.trim());
                    }}
                  >
                    <Search aria-hidden="true" />
                    <input
                      id="home-zotero-search"
                      type="search"
                      value={queryInput}
                      placeholder="搜索标题、作者、年份，回车确认"
                      onChange={(event) => setQueryInput(event.target.value)}
                    />
                  </form>
                  <ul>
                    {items.map((item) => (
                      <li key={item.key} className="home-zotero-item">
                        <div className="home-zotero-item-title">{item.title || "（无标题）"}</div>
                        <div className="home-zotero-item-meta">
                          {[item.creators, item.year].filter(Boolean).join(" · ")}
                        </div>
                        {item.attachments.length === 0 ? (
                          <div className="home-zotero-item-meta">没有 PDF 附件</div>
                        ) : (
                          item.attachments.map((attachment) => (
                            <label
                              key={attachment.key}
                              className={`home-zotero-attachment${attachment.available ? "" : " is-unavailable"}`}
                            >
                              <input
                                type="checkbox"
                                disabled={!attachment.available}
                                checked={selected.has(selectionKey(item.key, attachment.key))}
                                onChange={(event) => toggle(item, attachment.key, event.target.checked)}
                              />
                              <span>{attachment.title}</span>
                              {attachment.document_id ? <em>已在书库</em> : null}
                              {attachment.available ? null : <em>未下载到本机</em>}
                            </label>
                          ))
                        )}
                      </li>
                    ))}
                  </ul>
                  {itemsLoading ? (
                    <p className="home-zotero-status">
                      <LoaderCircle className="is-spinning" aria-hidden="true" />加载中…
                    </p>
                  ) : null}
                  {!itemsLoading && items.length === 0 ? (
                    <p className="home-zotero-status">这里没有文献。</p>
                  ) : null}
                  {!itemsLoading && items.length < total ? (
                    <Button type="button" variant="outline" onClick={() => void loadItems(items.length)}>
                      加载更多（{items.length}/{total}）
                    </Button>
                  ) : null}
                </section>
              </div>
            ) : null}

            {summary ? (
              <div className="home-zotero-summary" role="status">
                <p>
                  {[
                    summary.queued ? `${summary.queued} 篇已提交翻译` : "",
                    summary.reused ? `${summary.reused} 篇已有译文或正在翻译` : "",
                    summary.stored ? `${summary.stored} 篇已导入书库` : "",
                  ].filter(Boolean).join("，") || "没有导入任何文献"}
                  。
                </p>
                {summary.failed.length ? (
                  <ul>
                    {summary.failed.map((failure, index) => (
                      <li key={index}>
                        <strong>{failure.title || "未命名"}</strong>：{failure.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {loadError ? <p className="home-zotero-error" role="alert">{loadError}</p> : null}
          </DialogBody>
          <DialogFooter>
            {summary ? (
              <DialogClose asChild>
                <Button type="button">完成</Button>
              </DialogClose>
            ) : (
              <>
                <label className="home-zotero-translate">
                  <input
                    id="home-zotero-translate"
                    type="checkbox"
                    checked={translate}
                    onChange={(event) => setTranslate(event.target.checked)}
                  />
                  <span>导入后立即翻译</span>
                </label>
                <DialogClose asChild>
                  <Button type="button" variant="outline">取消</Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={busy || !ready || selected.size === 0}
                  onClick={() => void submit()}
                >
                  {busy ? <LoaderCircle className="is-spinning" aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
                  导入 {selected.size || ""} 个 PDF
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogShell>
      </DialogContent>
    </Dialog>
  );
}
