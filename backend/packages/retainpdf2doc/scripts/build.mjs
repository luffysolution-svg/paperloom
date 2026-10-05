#!/usr/bin/env node
/**
 * 打成两个自包含的 .mjs（cli + 库入口）。
 *
 * 为什么要打包而不是直接跑源码:vendor 进来的是 TypeScript（上游就是 .ts，还带显式的
 * `.ts` import 后缀），而 package.json 的 engines 是 node>=20——Node 20 没有类型剥离。
 * 打包一次把这个问题消掉，运行时只需要一个能跑 ESM 的 Node。
 *
 * mathjax-full 不打进去（它很大而且有自己的运行时假设），当外部依赖留给 node_modules。
 */

import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const shared = {
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  // 全部内联，不留外部依赖。
  //
  // 反直觉但实测如此:mathjax-full 在 node_modules 里是 **40MB**，而 tree-shake 之后
  // 内联进产物只占 ~3MB。桌面应用因此从 42MB 降到 5.8MB，而且不用再往包里拷
  // node_modules——运行时只要一个 node 和这两个 .mjs 就够了。
  external: [],
  logLevel: "warning",
};

await build({
  ...shared,
  entryPoints: [path.join(root, "src", "index.mjs")],
  outfile: path.join(root, "dist", "index.mjs"),
});

await build({
  ...shared,
  entryPoints: [path.join(root, "src", "cli.mjs")],
  outfile: path.join(root, "dist", "cli.mjs"),
  // 不加 banner:esbuild 会原样保留 src/cli.mjs 里的 shebang，再加一条就变成第二行
  // 出现 `#!`，直接是语法错误。
});

process.stdout.write("retainpdf2doc: dist/index.mjs, dist/cli.mjs\n");
