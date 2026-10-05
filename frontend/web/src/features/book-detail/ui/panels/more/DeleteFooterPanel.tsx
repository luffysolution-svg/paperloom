// 右栏：错误提示 + 删除确认（ConfirmDialog 二次确认）。

import { useState } from "react";
import { ConfirmDialog } from "@/ui/components/confirm-dialog.js";
import { Trash2 } from "lucide-react";

/**
 * @param {object} props
 * @param {string} [props.error]
 * @param {string|boolean} props.busy
 * @param {() => void} props.onDelete
 * @param {string} [props.title] 确认框展示的书名
 */
export function DeleteFooterPanel({
  error,
  busy,
  onDelete,
  title = "",
  blockedFavoriteCount = 0,
  onClearFavorites,
  onDismissBlocked,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const bookName = `${title || ""}`.trim();
  // 第一次删除被收藏挡住时，hook 会把结构化 409 的条数传下来，这里弹出第二步确认。
  const clearFavoritesOpen = blockedFavoriteCount > 0;
  return (
    <>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="book-detail-delete-panel border-t border-border/30 pt-3">
        <button
          id="book-detail-delete-btn"
          type="button"
          disabled={Boolean(busy)}
          onClick={() => setConfirmOpen(true)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted hover:text-foreground disabled:opacity-55"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          删除
        </button>
        <ConfirmDialog
          id="book-detail-delete-confirm"
          title="删除书籍"
          description={bookName ? `确定删除「${bookName}」吗？关联的任务与文件将一并删除，无法恢复。` : "确定删除这本书吗？关联的任务与文件将一并删除，无法恢复。"}
          confirmLabel="删除"
          tone="danger"
          level="nested"
          open={confirmOpen}
          pending={busy === "delete"}
          onOpenChange={(next) => { if (!next) setConfirmOpen(false); }}
          onConfirm={() => { setConfirmOpen(false); onDelete(); }}
        />
        <ConfirmDialog
          id="book-detail-clear-favorites-confirm"
          title="文档被收藏引用"
          description={`该文档有 ${blockedFavoriteCount} 条收藏锚点。收藏会一并删除，之后才能删除文档，此操作无法恢复。`}
          confirmLabel="一并删除收藏并删除"
          tone="danger"
          level="nested"
          open={clearFavoritesOpen}
          pending={busy === "delete"}
          onOpenChange={(next) => { if (!next) onDismissBlocked?.(); }}
          onConfirm={() => onClearFavorites?.()}
        />
      </div>
    </>
  );
}
