#!/usr/bin/env node
/**
 * `retainpdf2doc <spec.json> <out.docx>`
 *
 * Python 侧的 `retainpdf-pipeline layout-docx` 起的就是这个。参数刻意只有两个位置参数
 * ——所有排版决策都在规格 JSON 里，命令行不该再有第二处可以配的地方。
 *
 * 失败时往 stderr 打一行人话 + 一行 JSON。上游（Rust 的 `build_with_command`）会把
 * 子进程的 stderr 收进错误里，所以这行是用户唯一能看到的线索:今天就吃过一次亏，
 * 一个路径对不上的问题只表现成 "failed to build layout-docx"，什么都看不出来。
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { buildLayoutDocx } from "./index.mjs";

function usage() {
  return [
    "usage: retainpdf2doc <spec.json> <output.docx>",
    "",
    "  spec.json    排版规格（由 retainpdf-pipeline 生成，形状见 src/spec.mjs）",
    "  output.docx  输出路径",
  ].join("\n");
}

async function main(argv) {
  const args = argv.filter((item) => item !== "--");
  if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  if (args.length !== 2) {
    process.stderr.write(`${usage()}\n`);
    return 2;
  }
  const [specPath, outputPath] = args;

  let raw;
  try {
    raw = JSON.parse(await readFile(specPath, "utf8"));
  } catch (error) {
    process.stderr.write(`读不了排版规格 ${specPath}：${error.message}\n`);
    return 1;
  }

  const result = await buildLayoutDocx(raw, { baseDir: path.dirname(path.resolve(specPath)) });
  await writeFile(outputPath, result.bytes);

  // 公式转换失败不让整篇导出失败（那一处保留原始 LaTeX 文本），但必须说出来，
  // 否则就成了静默降级——正是这次要消灭的那种毛病。
  if (result.formulaErrors.length > 0) {
    process.stderr.write(
      `${result.formulaErrors.length} 个公式没能转成原生公式，已按原始 LaTeX 文本保留：\n`,
    );
    for (const item of result.formulaErrors.slice(0, 5)) {
      process.stderr.write(`  [${item.blockId}] ${item.latex}\n`);
    }
    if (result.formulaErrors.length > 5) {
      process.stderr.write(`  …另有 ${result.formulaErrors.length - 5} 个\n`);
    }
  }

  process.stdout.write(`${JSON.stringify({
    output: outputPath,
    pages: result.pageCount,
    textboxes: result.textboxCount,
    formulas: result.formulaCount,
    formulaErrors: result.formulaErrors.length,
  })}\n`);
  return 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((error) => {
    process.stderr.write(`${error?.message || error}\n`);
    process.stderr.write(`${JSON.stringify({
      error: `${error?.message || error}`,
      code: error?.code || "RETAINPDF2DOC_FAILED",
    })}\n`);
    process.exit(1);
  });
