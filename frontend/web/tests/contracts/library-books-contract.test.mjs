import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// 消费者契约测试: library / jobs 视图的 Rust 真值 ↔ TS 消费必须一致。
// 真值: contracts/job-status.v1.schema.json（library-books.v1 只剩删除任务的查询和返回，任务列表的定义都在 job-status.v1）
// 生产侧: backend/packages/retainpdf-jobs/src/views/job_types.rs
// 消费侧: contracts 生成 DTO（删除返回 LibraryDeleteResultView 由 @retainpdf/api 的 deleteJob 用）
// 改契约先改 schema，再让两端测试变绿——与 ai-ask / ai-conversations 同门禁。

const CONTRACT_PATH = join(process.cwd(), "..", "..", "contracts", "job-status.v1.schema.json");
const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8"));

function schemaProps(definition) {
  const def = contract.definitions[definition];
  assert.ok(def, `schema 缺少 definition ${definition}`);
  return new Set(Object.keys(def.properties || {}));
}

function tsTypeFields(source, typeName) {
  // 兼容 generator 的 interface 与历史 type object 两种形态。
  const block =
    source.match(new RegExp(`export interface ${typeName}\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ||
    source.match(new RegExp(`export type ${typeName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`))?.[1] ||
    source.match(new RegExp(`export type ${typeName}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1] ||
    source.match(new RegExp(`export type ${typeName}\\s*=\\s*[^;]*&\\s*\\{([\\s\\S]*?)\\n\\}`))?.[1];
  assert.ok(block, `未找到生成 DTO ${typeName}`);
  return new Set([...block.matchAll(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\??:/gm)].map((m) => m[1]));
}

// 生成的 TS 也读 job-status.ts：library-books 里重复登记的 GET /jobs 删了，library-books.ts 只导出删任务用到的类型。
const generatedContractsSource = readFileSync(join(
  process.cwd(),
  "../../contracts/src/job-status.ts",
), "utf8");

test("JobProgressView: TS progress 字段 ⊆ 契约", () => {
  const allowed = schemaProps("JobProgressView");
  const tsFields = tsTypeFields(generatedContractsSource, "JobProgressView");
  for (const f of tsFields) {
    assert.ok(allowed.has(f), `TS JobProgressView 声明了契约外的字段 ${f}`);
  }
  for (const f of ["current", "total", "percent"]) {
    assert.ok(allowed.has(f), `契约缺 progress 字段 ${f}`);
  }
});

test("前端不再调书架接口 library/books：列表走 jobs?job_ids=，删除走 DELETE jobs/:id", () => {
  // GET /library/books 冻结、GET /library/books/:job_id 已删（405），DELETE /library/books/:job_id 是旧地址。
  // 这个契约文件只剩删除的返回形状 LibraryDeleteResultView 和共用的枚举、进度类型还在用。
  const apiSrc = join(process.cwd(), "..", "packages", "api", "src");
  const files = readdirSync(apiSrc, { recursive: true }).filter((file) => `${file}`.endsWith(".ts"));
  assert.ok(files.length > 20, `采集到的接口文件过少(${files.length})`);
  for (const file of files) {
    const code = readFileSync(join(apiSrc, `${file}`), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    assert.doesNotMatch(code, /library\/books/, `${file} 还在拼 library/books 地址`);
  }
});

test("JobStatusKind / WorkflowKind 枚举与契约一致", () => {
  const statusEnum = new Set(contract.definitions.JobStatusKind.enum);
  const workflowEnum = new Set(contract.definitions.WorkflowKind.enum);
  assert.ok(statusEnum.has("succeeded") && statusEnum.has("queued"), "JobStatusKind 遗漏");
  assert.ok(workflowEnum.has("book") && workflowEnum.has("ocr"), "WorkflowKind 遗漏");
  assert.ok(
    generatedContractsSource.includes('"succeeded"') && generatedContractsSource.includes('"queued"'),
    "生成 DTO 未包含契约状态枚举",
  );
});

test("关键显示字段 job_id/display_name/workflow/status/stage_snapshot/progress/cover_url 均被前端消费", () => {
  const listItemProps = schemaProps("JobListItemView");
  for (const field of ["job_id", "display_name", "workflow", "status", "stage_snapshot", "cover_url"]) {
    assert.ok(listItemProps.has(field), `契约 JobListItemView 缺关键字段 ${field}`);
  }
  // stage_snapshot 内层 progress/cover 链路验证
  const snapshotProps = schemaProps("JobStageSnapshotView");
  assert.ok(snapshotProps.has("progress"), "stage_snapshot 缺 progress");
  assert.ok(snapshotProps.has("display_stage"), "stage_snapshot 缺 display_stage");
});
