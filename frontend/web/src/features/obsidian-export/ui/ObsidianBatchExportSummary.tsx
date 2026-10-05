import type { ObsidianBatchExportResult } from "@/platform/api/index.js";

export function ObsidianBatchExportSummary({ result }: { result: ObsidianBatchExportResult }) {
  return (
    <div className="book-detail-obsidian-done">
      <p>
        批量导出完成：已写入 {result.written} 篇，冲突 {result.conflicts} 篇，
        跳过 {result.skipped} 篇，失败 {result.failed} 篇。
      </p>
      {result.items.some((item) => item.message) ? (
        <ul>
          {result.items
            .filter((item) => item.message)
            .map((item) => (
              <li key={item.document_id}>
                <code>{item.document_id}</code>：{item.message}
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
