// 架构门禁共享扫描设施：源码枚举、注释/字符串剥离、顶层可变状态识别。
//
// 这里刻意不引入完整 AST parser：仓库约束是「轻量、稳健、实用即可」。
// 做法是先做词法处理（去注释、字符串、模板字面量，保留换行以维持行号），
// 再用逐行状态机统计花括号深度，只在模块顶层（depth === 0）做模式匹配。
// 这样函数体 / 对象字面量 / 类型字面量里的 `let`、`new Map()` 不会被误判为
// 顶层全局状态。已知的取舍：不做正则字面量识别，对绝大多数源码足够。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { relative, join } from "node:path";
import { fileURLToPath } from "node:url";

/** frontend/web 根目录。 */
export const PROJECT_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const SRC_ROOT = join(PROJECT_ROOT, "src");

// 只统计生产源码；mock 数据与 generated 文件不计入体量/全局门禁。
const EXCLUDED_SOURCE_PREFIXES = [
  "src/platform/api/mocks",
  "src/platform/mock",
  "src/platform/generated",
];

function toPosix(path) {
  return path.replace(/\\/g, "/");
}

/** 相对 PROJECT_ROOT 的 posix 路径。 */
export function toRelative(absolutePath) {
  return toPosix(relative(PROJECT_ROOT, absolutePath));
}

/** mock 数据 / generated 文件不计入门禁。 */
export function isExcludedSource(relativePath) {
  const rel = toPosix(relativePath);
  return EXCLUDED_SOURCE_PREFIXES.some(
    (prefix) => rel === prefix || rel.startsWith(`${prefix}/`),
  );
}

/** 枚举 src 下所有 .ts/.tsx（排除 mock/generated），返回排序后的 posix 相对路径。 */
export function walkSourceFiles() {
  const files = [];
  const pending = [SRC_ROOT];
  while (pending.length > 0) {
    const dir = pending.pop();
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        pending.push(full);
      } else if (/\.(ts|tsx)$/.test(name)) {
        files.push(full);
      }
    }
  }
  return files
    .map(toRelative)
    .filter((rel) => !isExcludedSource(rel))
    .sort();
}

export function readSource(relativePath) {
  return readFileSync(join(PROJECT_ROOT, relativePath), "utf8");
}

/** 逻辑行数：换行计数 + 末尾无换行时的最后一行。 */
export function countLines(source) {
  if (source.length === 0) return 0;
  let newlines = 0;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "\n") newlines += 1;
  }
  return source.endsWith("\n") ? newlines : newlines + 1;
}

/**
 * 剥离注释与字符串/模板内容，保留换行以维持行号。
 * - 行注释整段丢弃（换行保留）；
 * - 块注释内容丢弃但保留其中的换行；
 * - 字符串替换为 ""；
 * - 模板字面量替换为 ``（含插值一起丢弃，实用取舍）。
 */
export function stripCommentsAndStrings(code) {
  let out = "";
  let i = 0;
  const n = code.length;
  while (i < n) {
    const c = code[i];
    const d = code[i + 1];

    if (c === "/" && d === "/") {
      while (i < n && code[i] !== "\n") i += 1;
      continue; // 换行走下一轮，保留
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(code[i] === "*" && code[i + 1] === "/")) {
        if (code[i] === "\n") out += "\n";
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i += 1;
      while (i < n && code[i] !== quote) {
        if (code[i] === "\\") i += 1;
        i += 1;
      }
      i += 1;
      out += '""';
      continue;
    }
    if (c === "`") {
      i += 1;
      let interpolationDepth = 0;
      while (i < n) {
        if (code[i] === "\\") {
          i += 2;
          continue;
        }
        if (code[i] === "$" && code[i + 1] === "{") {
          interpolationDepth += 1;
          i += 2;
          continue;
        }
        if (code[i] === "}" && interpolationDepth > 0) {
          interpolationDepth -= 1;
          i += 1;
          continue;
        }
        if (code[i] === "`" && interpolationDepth === 0) {
          i += 1;
          break;
        }
        if (code[i] === "\n") out += "\n";
        i += 1;
      }
      out += "``";
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

const LET_VAR_RE =
  /^(?:export\s+)?(?:declare\s+)?(let|var)\s+([A-Za-z_$][\w$]*)/;
const NEW_COLLECTION_RE =
  /^(?:export\s+)?(?:declare\s+)?const\s+([A-Za-z_$][\w$]*)\b[^;]*?\bnew\s+(Map|Set)\s*[(<]/;
const GLOBAL_ASSIGN_RE =
  /\b(window|globalThis)\s*((?:\.[A-Za-z_$][\w$]*|\[[^\]]*\])+)\s*=/;
const SYMBOL_FOR_RE = /\bSymbol\s*\.\s*for\s*\(/;
const SYMBOL_FOR_CONST_RE =
  /^(?:export\s+)?(?:declare\s+)?const\s+([A-Za-z_$][\w$]*)\b/;

function classifyTopLevelLine(trimmed) {
  let match;

  match = trimmed.match(LET_VAR_RE);
  if (match) return { kind: "let-var", name: match[2] };

  match = trimmed.match(NEW_COLLECTION_RE);
  if (match) return { kind: "new-collection", name: match[1], collection: match[2] };

  match = trimmed.match(GLOBAL_ASSIGN_RE);
  if (match) return { kind: "global-assign", name: `${match[1]}${match[2]}` };

  if (SYMBOL_FOR_RE.test(trimmed)) {
    const named = trimmed.match(SYMBOL_FOR_CONST_RE);
    return { kind: "symbol-for-store", name: named ? named[1] : "Symbol.for" };
  }

  return null;
}

/**
 * 找到模块顶层的可变状态声明。
 * 识别：顶层 let/var、顶层 const ... new Map()/Set()、顶层 window/globalThis
 * 属性赋值、顶层 Symbol.for(...) 全局 store key。函数体内的一律忽略。
 * @returns {Array<{line:number, kind:string, name:string}>}
 */
export function findTopLevelMutableState(source) {
  const code = stripCommentsAndStrings(source);
  const lines = code.split("\n");
  const found = [];
  let depth = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (depth === 0 && trimmed.length > 0) {
      const hit = classifyTopLevelLine(trimmed);
      if (hit) found.push({ line: index + 1, ...hit });
    }

    for (let j = 0; j < line.length; j += 1) {
      if (line[j] === "{") depth += 1;
      else if (line[j] === "}") depth = Math.max(0, depth - 1);
    }
  }

  return found;
}

/** 门禁条目稳定 key：文件 + 类别 + 名称。 */
export function mutableStateKey(relativePath, hit) {
  return `${relativePath}::${hit.kind}::${hit.name}`;
}
