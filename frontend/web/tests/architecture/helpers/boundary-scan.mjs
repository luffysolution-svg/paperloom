/** architecture-boundaries 与 react-migration-boundaries 两个门禁共用的取文件工具。
 *
 * 原来都写在 architecture-boundaries.test.mjs 里；那个文件按主题拆成两份后，两边都要
 * 「遍历目录 + 扫描根失效即红」这一套，抽到这里免得复制出两份会各自走样的实现。
 *
 * PROJECT_ROOT 刻意沿用 process.cwd()（= frontend/web，npm test 的工作目录），和拆分前
 * 的语义一致。
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();

export function isSourceFile(filePath) {
  return filePath.endsWith(".ts")
    || filePath.endsWith(".tsx")
    || filePath.endsWith(".js")
    || filePath.endsWith(".jsx");
}

export function walkFiles(root) {
  if (!existsSync(root)) {
    return [];
  }
  const pending = [root];
  const files = [];
  while (pending.length > 0) {
    const current = pending.pop();
    const stat = statSync(current);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current)) {
        pending.push(join(current, entry));
      }
      continue;
    }
    if (isSourceFile(current)) {
      files.push(current);
    }
  }
  return files.sort();
}

export function relativeToProject(filePath) {
  return relative(PROJECT_ROOT, filePath);
}

/**
 * 扫描类门禁的共用取文件入口。
 *
 * walkFiles 对不存在的目录返回 []，于是 `assert.deepEqual(offenders, [])` 恒真——
 * 扫描根一旦被搬走或写错，门禁就"静默变绿"，看起来还在守着，实际什么都不查。
 * 批次 4 的 ingest 迁移已经让 upload 门禁这样死过一次。凡是"遍历目录找违规"的
 * 门禁都必须经这里取文件：目录不存在、或过滤后一个文件都没扫到，都直接判失败，
 * 并在消息里点名是哪个根失效了。
 */
export function scanRoot(root, filter = isSourceFile) {
  assert.ok(existsSync(root), `扫描根不存在，门禁已失效: ${relativeToProject(root)}`);
  const files = walkFiles(root).filter(filter);
  assert.ok(files.length > 0, `扫描根为空，门禁已失效: ${relativeToProject(root)}`);
  return files;
}

/** 多扫描根版本：逐个根做存在性与非空校验，任一根失效即失败 */
export function scanRoots(roots, filter = isSourceFile) {
  return roots.flatMap((root) => scanRoot(root, filter));
}
