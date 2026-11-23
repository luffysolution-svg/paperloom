-- 每篇库内笔记各自的导出基准；ZIP 尚无库内路径，以任务标识保存。
CREATE TABLE IF NOT EXISTS obsidian_bibliography (
    document_id TEXT NOT NULL REFERENCES item_files(file_id) ON DELETE CASCADE,
    note_key TEXT NOT NULL,
    fields_json TEXT NOT NULL,
    PRIMARY KEY (document_id, note_key)
);
