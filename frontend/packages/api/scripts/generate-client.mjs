// 从契约端点表生成前端请求函数（方案：docs/ops/planning/api-client-codegen/）。
//
// 读仓库根目录 contracts/*.schema.json 的 endpoints，凡是带 client_name、transport 为 json（缺省也算）
// 的端点，生成一个只做传输的函数，输出到 src/generated/<契约名>.ts。sse、binary、websocket、
// raw_json 先不生成。
//
//   node scripts/generate-client.mjs          生成
//   node scripts/generate-client.mjs --check  只比对，生成结果和磁盘上不一致就退出码 1

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractsRoot = resolve(packageRoot, "../../../contracts");
const outDir = resolve(packageRoot, "src/generated");
const API_PREFIX_PATH = "/api/v1/";
const METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function contractName(fileName) {
  const match = /^(.+)\.v\d+\.schema\.json$/.exec(fileName);
  if (!match) throw new Error(`契约文件名不认识：${fileName}`);
  return match[1];
}

function pathParams(path) {
  return [...path.matchAll(/:([a-z_][a-z0-9_]*)/g)].map((m) => m[1]);
}

function renderEndpoint(endpoint, contractFile) {
  const { method, path, client_name: name, query, input, output } = endpoint;
  const where = `${contractFile} ${method} ${path}`;
  if (!METHODS.has(method)) throw new Error(`${where}：不支持的方法`);
  if (!path.startsWith(API_PREFIX_PATH)) throw new Error(`${where}：地址要以 ${API_PREFIX_PATH} 开头`);
  if (path.includes("?")) throw new Error(`${where}：地址里不能带查询串，查询参数写进 query 定义`);
  const params = pathParams(path);
  const relative = path.slice(API_PREFIX_PATH.length).replace(/:([a-z_][a-z0-9_]*)/g, (_, p) => `\${encodePathParam(args.${p})}`);

  const argFields = [
    ...params.map((p) => `${p}: string`),
    ...(query ? [`query?: ${query}`] : []),
    ...(input ? [`body: ${input}`] : []),
  ];
  const argsRequired = params.length > 0 || Boolean(input);
  const argsDecl = argFields.length
    ? `args: { ${argFields.join("; ")} }${argsRequired ? "" : " = {}"}`
    : "_args: Record<string, never> = {}";
  const spec = [
    "apiPrefix",
    `method: "${method}"`,
    `path: \`${relative}\``,
    ...(query ? ["query: args.query"] : []),
    ...(input ? ["body: args.body"] : []),
    "options",
  ];
  const result = output || "unknown";
  return [
    `/** ${method} ${path} */`,
    `export function ${name}(`,
    `  apiPrefix: string | undefined,`,
    `  ${argsDecl},`,
    `  options?: RequestOptions,`,
    `): Promise<${result}> {`,
    `  return request<${result}>({ ${spec.join(", ")} });`,
    `}`,
  ].join("\n");
}

async function buildFiles() {
  const files = new Map();
  const seen = new Map();
  for (const fileName of (await readdir(contractsRoot)).filter((f) => f.endsWith(".schema.json")).sort()) {
    const contract = JSON.parse(await readFile(resolve(contractsRoot, fileName), "utf8"));
    const endpoints = (contract.endpoints || []).filter((e) => e.client_name && (e.transport ?? "json") === "json");
    if (!endpoints.length) continue;
    const name = contractName(fileName);
    const types = new Set();
    for (const e of endpoints) {
      if (seen.has(e.client_name)) throw new Error(`client_name 重名：${e.client_name}（${seen.get(e.client_name)} 和 ${fileName}）`);
      seen.set(e.client_name, fileName);
      for (const t of [e.query, e.input, e.output]) {
        if (!t) continue;
        if (!contract.definitions?.[t]) throw new Error(`${fileName}：端点引用的 ${t} 在 definitions 里没有`);
        types.add(t);
      }
    }
    const body = [
      `// 生成文件，不要手改。来源：contracts/${fileName} 的 endpoints。`,
      `// 重新生成：npm --prefix frontend/packages/api run generate:client`,
      ``,
      `import type {`,
      ...[...types].sort().map((t) => `  ${t},`),
      `} from "@retainpdf/contracts/${name}";`,
      `import { encodePathParam, request, type RequestOptions } from "../request.js";`,
      ``,
      endpoints.map((e) => renderEndpoint(e, fileName)).join("\n\n"),
      ``,
    ].join("\n");
    files.set(`${name}.ts`, body);
  }
  return files;
}

const check = process.argv.includes("--check");
const files = await buildFiles();
let stale = [];
if (check) {
  const existing = new Set(await readdir(outDir).catch(() => []));
  for (const [name, content] of files) {
    const current = await readFile(resolve(outDir, name), "utf8").catch(() => null);
    if (current?.replace(/\r\n/g, "\n") !== content) stale.push(name);
    existing.delete(name);
  }
  stale.push(...[...existing].map((name) => `${name}（多余）`));
  if (stale.length) {
    console.error(`src/generated 不是最新：${stale.join("、")}。运行 npm --prefix frontend/packages/api run generate:client`);
    process.exit(1);
  }
  console.log(`src/generated 是最新的（${files.size} 个文件）`);
} else {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const [name, content] of files) await writeFile(resolve(outDir, name), content);
  console.log(`生成 ${files.size} 个文件到 src/generated：${[...files.keys()].join("、")}`);
}
