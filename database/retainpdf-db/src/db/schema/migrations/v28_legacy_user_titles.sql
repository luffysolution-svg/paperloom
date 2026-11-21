-- 有书名来源记录（document_title_state，v12）之前手改过的书名，补一条 user + 锁定。
--
-- 自动命名判断「书名还是默认值」以前看 `title == 文件名去掉 .pdf`，同一本书换个文件名再传
-- （source_filename 变了、书名没变）就被误判成用户改过。2026-10-19 起只看来源和锁；没有来源记录
-- 的书读出来是 filename，所以 v12 以前手改、一直没有来源记录的书名要在这里一次性标成 user，
-- 免得被自动命名盖掉。只在升级时跑一次：之后没有来源记录、书名又不等于文件名的，就是换名重传。
-- 升级之前已经换名重传过的书分不出来，也按 user 处理（和升级前一样不自动命名，用户可以自己改名）。
INSERT INTO document_title_state (document_id, source, locked, suggestion_id, updated_at)
SELECT d.document_id, 'user', 1, NULL, d.updated_at
FROM documents d
WHERE NOT EXISTS (SELECT 1 FROM document_title_state ts WHERE ts.document_id = d.document_id)
  AND TRIM(d.title) <> TRIM(
        CASE
            WHEN substr(d.source_filename, -4) IN ('.pdf', '.PDF')
                THEN substr(d.source_filename, 1, length(d.source_filename) - 4)
            ELSE d.source_filename
        END
      );
