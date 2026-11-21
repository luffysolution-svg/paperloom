-- 2026 年早期 workflow 叫 "mineru"，后来改名 "book"。这段修正原来是 rust_api 每次启动都跑的
-- `cleanup_legacy_workflows`，对 events.payload_json 做 LIKE 全表扫描；事件多了以后每次启动都慢。
-- 现在的代码写不出 "mineru"（`WorkflowKind` 没有这个值），改成升级时跑一次。
UPDATE jobs
SET workflow = '"book"'
WHERE workflow = '"mineru"';

UPDATE jobs
SET request_json = replace(request_json, '"workflow":"mineru"', '"workflow":"book"')
WHERE request_json LIKE '%"workflow":"mineru"%';

UPDATE events
SET payload_json = replace(payload_json, '"workflow":"mineru"', '"workflow":"book"')
WHERE payload_json LIKE '%"workflow":"mineru"%';
