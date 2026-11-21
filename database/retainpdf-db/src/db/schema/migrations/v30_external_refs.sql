-- 外部文献库（Zotero）附件 → 文档。document_id 即文件 sha256，同一附件换了
-- 文件内容会改指新文档。metadata_json 是导入时的条目快照（导出笔记 frontmatter 用），
-- collection_path 是导入时所在的分类路径（「按分类建子目录」用）。
CREATE TABLE IF NOT EXISTS document_external_refs (
    source          TEXT NOT NULL,
    library_id      TEXT NOT NULL,
    item_key        TEXT NOT NULL,
    attachment_key  TEXT NOT NULL,
    document_id     TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    metadata_json   TEXT NOT NULL DEFAULT '{}',
    collection_path TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    PRIMARY KEY(source, library_id, attachment_key)
);
CREATE INDEX IF NOT EXISTS idx_document_external_refs_document
    ON document_external_refs(document_id);
