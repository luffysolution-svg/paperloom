ALTER TABLE document_external_refs RENAME TO old_external_refs;
CREATE TABLE document_external_refs (
    owner_user_id   TEXT NOT NULL,
    source          TEXT NOT NULL,
    library_id      TEXT NOT NULL,
    item_key        TEXT NOT NULL,
    attachment_key  TEXT NOT NULL,
    document_id     TEXT NOT NULL REFERENCES documents(document_id) ON DELETE CASCADE,
    metadata_json   TEXT NOT NULL DEFAULT '{}',
    collection_path TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    PRIMARY KEY(owner_user_id, source, library_id, attachment_key)
);
INSERT INTO document_external_refs
SELECT d.owner_user_id, r.source, r.library_id, r.item_key, r.attachment_key, r.document_id,
       r.metadata_json, r.collection_path, r.created_at, r.updated_at
FROM old_external_refs r JOIN documents d ON d.document_id = r.document_id;
DROP TABLE old_external_refs;
CREATE INDEX idx_document_external_refs_document
    ON document_external_refs(document_id);
