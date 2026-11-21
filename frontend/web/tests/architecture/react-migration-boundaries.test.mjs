// React 迁移防回弹门禁：旧目录不得复活、features 只经 DI 容器引用 app 层、新世界不得
// import 旧视图层，以及 @retainpdf/* 包入口与规范 API 客户端的使用。
// 从原 architecture-boundaries.test.mjs（960+ 行）拆出，用例原样搬移。

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import {
  isSourceFile,
  relativeToProject,
  scanRoot,
} from "./helpers/boundary-scan.mjs";

const PROJECT_ROOT = process.cwd();

// ===== React 迁移防回弹门禁(Phase 0 起生效) =====
// 新世界(src/app/**、src/ui/**、src/features/**)只能消费旧世界的纯逻辑层
// (api/contracts/state-port/actions/view-model 等),禁止 import 旧视图层——
// 一旦引用,旧 DOM 视图就会"回弹"进 React 树,迁移永远收不了口。
//
// 注:tests/esm-entry-resolution.test.mjs 已随 Phase 2b reader cutover 退役——
// 三页(home/detail/reader)入口全部经 esbuild 打包,import 断链在 build:js
// 构建期即失败,不再需要独立的原生 ESM 解析守卫。

// features 只允许经这一条路径引用 app 层：主页装配出来的 DI 容器。
//
// 为什么不能靠搬文件消除：useHomeServices() 要的是 HomeApp 装配出来的**实例**，
// 而它的类型 HomeServices（composition/types.ts）引用了
// 每一个功能的类型。把 context 下沉到 platform 会造成 platform → features，
// 比现状更糟。正确终局是按域拆窄 Context（代码里已有 useHomeDialogStore /
// useHomeStatusAreaStore / useHomeWorkflowDialog / useHomeSettingsHub 四个先例），
// 但那是行为影响性重构，违反「移动与行为修改分开」，留作批次 6。
//
// 在此之前用**只减不增的清单**把这条遗留倒置显性化：新增消费方必须先改这里，
// 评审时能看见。
const HOME_SERVICES_CONTEXT_CONSUMERS = Object.freeze([
  // 批次 6 完成：15 个消费者已全部迁移到 @/ui/context 的窄 hook，
  // features 不再 import app 的 home-services-context。清单清空（只减不增）。
]);

// detail / reader 两页原本各有一条「不得直连 src/js/*，须经本页 external.ts」。
// 批次 5 之后 src/js 与两页的 external.ts 都已删除——detail 的在 C1 解散，
// reader 的仍在（它是 @retainpdf/reader 包的宿主注入面，不是旧世界网关）。
// 规则对象消失，改为断言旧目录不得复活；方向约束由 C3 的四层门禁接管。
test("已删除的旧目录不得复活", () => {
  for (const dir of ["src/js", "src/pages", "src/shared", "src/components", "src/lib"]) {
    assert.equal(
      existsSync(join(PROJECT_ROOT, dir)),
      false,
      `${dir} 已在批次 5 删除，不得以任何形式复活`,
    );
  }
  assert.equal(
    existsSync(join(PROJECT_ROOT, "src/app/home/composition/external.ts")),
    false,
    "主页集中网关已在 B8 解散，不得复活（蓝图 §5.2：不允许用新 barrel 取代）",
  );
  assert.equal(
    existsSync(join(PROJECT_ROOT, "src/app/detail/external.ts")),
    false,
    "detail 页网关已在 C1 解散，不得复活",
  );
});

test("features 引用 app 层仅限主页 DI 容器，且消费方清单只减不增", () => {
  const featureFiles = scanRoot(join(PROJECT_ROOT, "src/features"));
  const appImports = [];
  const contextConsumers = [];
  for (const file of featureFiles) {
    const source = readFileSync(file, "utf8");
    const rel = relativeToProject(file).replace(/\\/g, "/");
    for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["'](@\/app\/[^"']+)["']/g)) {
      const target = match[1];
      if (target === "@/app/home/home-services-context.js") {
        contextConsumers.push(rel);
      } else {
        appImports.push(`${rel} → ${target}`);
      }
    }
  }
  assert.deepEqual(
    appImports,
    [],
    "features 不得引用 app 层（唯一例外是 @/app/home/home-services-context.js）",
  );
  const unlisted = [...new Set(contextConsumers)]
    .filter((file) => !HOME_SERVICES_CONTEXT_CONSUMERS.includes(file))
    .sort();
  assert.deepEqual(
    unlisted,
    [],
    "新增了 useHomeServices 消费方，请先登记进 HOME_SERVICES_CONTEXT_CONSUMERS（该清单只减不增，批次 6 用窄 Context 消除）",
  );
  const stale = HOME_SERVICES_CONTEXT_CONSUMERS
    .filter((file) => !contextConsumers.includes(file))
    .sort();
  assert.deepEqual(stale, [], "清单里有已不再消费该 context 的条目，请删除（只减不增）");
});

test("React 新世界禁止 import 旧视图层(防回弹)", () => {
  const REACT_ROOTS = [
    join(PROJECT_ROOT, "src/app"),
    // src/shared 已在 A7 解散：React 侧（hooks/icons/theme/decor/download-toast）
    // 全部落到 src/ui，防回弹扫描根随之改指这里。
    join(PROJECT_ROOT, "src/ui"),
    // 按功能重组后的新树同样受防回弹约束，否则功能迁过去就脱离门禁。
    join(PROJECT_ROOT, "src/features"),
  ];
  // 旧视图层路径特征:命中即违规
  const FORBIDDEN_IMPORT_PATTERNS = [
    // 只拦旧世界的 src/js/components/;新世界页面自身的 components/ 子目录
    // (src/app/*/components/,目录约定)不在此列
    // src/js/components/ 已随 library 迁移清空并删除；保留本条防止新代码重建该目录。
    [/(?:from\s+|import\s+)["'][^"']*\/js\/components\//, "src/js/components/(自定义元素/对话框视图)"],
    // domain/ 可以读构建产物（app-update 需要 APP_VERSION）；ui/ 不行，
    // 由同功能的 domain/ 做一层薄封装再向 ui/ 暴露。
    [/(?:from\s+|import\s+)["'][^"']*\/generated\//, "platform/generated/(预编译产物)", { domainAllowed: true }],
    // 装配层：app/ 做依赖接线是它的职责，features/ 与 ui/ 不得触达。
    // 作用域在下面的循环里按扫描根收窄（src/app 即未来的 app/）。
    [/(?:from\s+|import\s+)["'][^"']*\/bootstrap\//, "bootstrap/(DI 装配层，仅 app 可用)"],
    [/(?:from\s+|import\s+)["'][^"']*\/features\/[^"']*\/view\.js["']/, "features/*/view.js(旧 DOM 视图)"],
    [/(?:from\s+|import\s+)["'][^"']*\/features\/[^"']*view-port\.js["']/, "features/*view-port.js(旧 DOM 端口)"],
    [/(?:from\s+|import\s+)["'][^"']*\/features\/[^"']*dom-contract\.js["']/, "features/*dom-contract.js(旧 DOM 契约)"],
    [/(?:from\s+|import\s+)["'][^"']*\/features\/[^"']*card-markup\.js["']/, "features/*card-markup.js(字符串模板)"],
    [/(?:from\s+|import\s+)["'][^"']*\/features\/[^"']*card-template\.js["']/, "features/*card-template.js(字符串模板)"],
    [/(?:from\s+|import\s+)["'][^"']*\/js\/dom\//, "src/js/dom/(旧 DOM 工具)"],
    // src/js/state 已在 B10 整体删除（6 片死代码 + 塌缩剩余两片到
    // platform/desktop/state.ts）。保留本条防止该目录以任何形式复活。
    [/(?:from\s+|import\s+)["'][^"']*\/js\/state\//, "src/js/state/(已删除的全局状态单例)"],
    [/(?:from\s+|import\s+)["'][^"']*\/js\/job\/core/, "src/js/job/core.js(任务核心)"],
    // domain/ 用 platform 的 store 工厂建自己的状态是目标架构（15 个功能在用）；
    // ui/ 不得直连，须经同功能 domain/ 暴露的 store 实例。
    [/(?:from\s+|import\s+)["'][^"']*\/platform\/store\/store/, "platform/store/store.ts(状态框架)", { domainAllowed: true }],
    [/import\s*\(\s*["'][^"']*\/js\//, "dynamic import src/js/*(应经 composition/external)"],
  ];

  function walkReactFiles(root) {
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

  function isExternalGate(file) {
    const normalized = file.replace(/\\/g, "/");
    return normalized.includes("/composition/external")
      || normalized.endsWith("/external.ts")
      || normalized.endsWith("/external.js");
  }

  const violations = [];
  // 原先是 `if (!existsSync(root)) continue;`——三个根一旦都被搬走，循环整个跳过，
  // violations 保持 []，本门禁（防回弹总闸）就静默变绿。改为逐根断言存在，并在
  // 循环外累计实际扫过的文件数，扫到 0 个同样判失败。
  let scannedFileCount = 0;
  for (const root of REACT_ROOTS) {
    assert.ok(
      existsSync(root),
      `扫描根不存在，防回弹门禁已失效: ${relativeToProject(root)}`,
    );
    const rootFiles = walkReactFiles(root);
    scannedFileCount += rootFiles.length;
    for (const file of rootFiles) {
      if (isExternalGate(file)) continue;
      const source = readFileSync(file, "utf8");
      // src/app 是装配层（B1 后改名为 src/app），依赖接线正是它的职责。
      const normalizedPath = file.replace(/\\/g, "/");
      const isAppLayer = normalizedPath.includes("/src/app/") || normalizedPath.includes("/src/app/");
      const isFeatureDomain = /\/src\/features\/[^/]+\/domain\//.test(normalizedPath);
      // app 是装配层：它建页面级 store（home-store / text-store）、给各域接线，
      // 用 platform 的 store 工厂与 features/*/domain 同理合法。禁止的是
      // features/*/ui 与 src/ui 直连——那两处必须经 domain 暴露的实例。
      const isStoreFactoryUser = isFeatureDomain || isAppLayer;
      for (const [pattern, label, options] of FORBIDDEN_IMPORT_PATTERNS) {
        if (isAppLayer && label.startsWith("bootstrap/")) continue;
        if (isFeatureDomain && options?.domainAllowed) continue;
        if (isStoreFactoryUser && label.startsWith("platform/store/store")) continue;
        if (label.startsWith("dynamic import")) {
          if (file.includes("/composition/")) {
            // composition 层含大量 TS 类型查询 `import("js/...")`，非运行时动态 import，豁免
            continue;
          }
          // 排除 TS 类型查询 `import("...")`（Promise<import> / `=> import(` / `: import(` / `as import(`），只拦运行时动态 import
          const stripped = source
            .replace(/Promise<\s*import\s*\(/g, "Promise<typeImport(")
            .replace(/:\s*import\s*\(/g, ": typeImport(")
            .replace(/=>\s*import\s*\(/g, "=> typeImport(")
            .replace(/\bas\s+import\s*\(/g, "as typeImport(")
            .replace(/import\s+type\s+/g, "typeImport ");
          if (pattern.test(stripped)) {
            violations.push(`${relative(PROJECT_ROOT, file)} → ${label}`);
          }
          continue;
        }
        if (pattern.test(source)) {
          violations.push(`${relative(PROJECT_ROOT, file)} → ${label}`);
        }
      }
    }
  }
  assert.ok(
    scannedFileCount > 0,
    `防回弹门禁一个文件都没扫到，门禁已失效: ${REACT_ROOTS.map(relativeToProject).join(", ")}`,
  );
  assert.deepEqual(
    violations,
    [],
    `React 新世界引用了旧视图层,请改为消费纯逻辑层或在 React 内重写:\n  ${violations.join("\n  ")}`,
  );
});

// 已退休：`app/home/features/` 在批次 5B 被清空（app-shell 迁 app/home/shell，
// shared 的两个文件按归属迁进 features/{jobs,library}）。该规则的意图「app 层
// 不得直连 src/js/*」现由防回弹总闸覆盖——src/js 只剩 state/，其 store 已在
// FORBIDDEN_IMPORT_PATTERNS 里，且 REACT_ROOTS 含 src/app。已实证：
// 往 app/home/HomeApp.tsx 注入 @/js/state/store.js 会被点名。

// 已退休：本规则校验「external barrel 覆盖 home features 用到的全部符号」，
// 两侧对象都没了——home features 目录已清空，external 网关本身也在 B8 解散。

test("@/ui/lib/utils proxies to @retainpdf/ui (not duplicated cn impl)", () => {
  const utilsPath = join(PROJECT_ROOT, "src/ui/lib/utils.ts");
  const uiUtilsPath = join(PROJECT_ROOT, "../../frontend/packages/ui/src/lib/utils.ts");
  assert.equal(existsSync(utilsPath), true, "src/ui/lib/utils.ts must exist");
  assert.equal(existsSync(uiUtilsPath), true, "frontend/packages/ui/src/lib/utils.ts must exist");
  const proxySource = readFileSync(utilsPath, "utf8");
  // sole export should re-export from @retainpdf/ui, no local clsx/twMerge impl
  assert.match(proxySource, /from\s+["']@retainpdf\/ui\/lib\/utils["']/, "src/ui/lib/utils.ts should proxy to @retainpdf/ui/lib/utils");
  assert.equal(proxySource.includes("clsx"), false, "proxy must not duplicate clsx impl");
  assert.equal(proxySource.includes("twMerge"), false, "proxy must not duplicate twMerge impl");
  const uiSource = readFileSync(uiUtilsPath, "utf8");
  assert.match(uiSource, /clsx/, "frontend/packages/ui/src/lib/utils.ts should own clsx/twMerge impl");
  assert.match(uiSource, /twMerge/, "frontend/packages/ui/src/lib/utils.ts should own clsx/twMerge impl");
  // Workspace packages must resolve through package.json exports, not source aliases.
  const tsconfigRaw = readFileSync(join(PROJECT_ROOT, "tsconfig.json"), "utf8");
  assert.doesNotMatch(tsconfigRaw, /packages\/(?:api|domain|reader|ui)\/src/);
  const bundle = readFileSync(join(PROJECT_ROOT, "scripts/build-js-bundle.mjs"), "utf8");
  assert.doesNotMatch(bundle, /packages\/(?:api|domain|reader|ui)\/src/);
  const loader = readFileSync(join(PROJECT_ROOT, "tests/helpers/jsx-loader.mjs"), "utf8");
  assert.doesNotMatch(loader, /packages\/(?:api|domain|reader|ui)\/src/);
});

test("@retainpdf/ui and @retainpdf/api packages expose expected entries", () => {
  for (const pkg of ["ui", "api"]) {
    const pkgJson = JSON.parse(readFileSync(join(PROJECT_ROOT, `../packages/${pkg}/package.json`), "utf8"));
    assert.equal(pkgJson.name, `@retainpdf/${pkg}`, `packages/${pkg}/package.json name must be @retainpdf/${pkg}`);
    assert.ok(pkgJson.exports?.["."], `packages/${pkg} must export "."`);
    assert.ok(pkgJson.scripts?.build, `packages/${pkg} must have build script`);
    assert.ok(pkgJson.scripts?.typecheck, `packages/${pkg} must have typecheck script`);
  }
  // ui exports styles.css must resolve to existing built artifact after build
  const uiPkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "../../frontend/packages/ui/package.json"), "utf8"));
  assert.ok(uiPkg.exports?.["./styles.css"], "@retainpdf/ui must export ./styles.css");
  // api exports jobs subpaths（书架 library-books 已删：列表走 jobs?job_ids=，删除走 DELETE jobs/:id）
  const apiPkg = JSON.parse(readFileSync(join(PROJECT_ROOT, "../../frontend/packages/api/package.json"), "utf8"));
  assert.ok(apiPkg.exports?.["./jobs-actions"], "@retainpdf/api must export ./jobs-actions");
  assert.ok(apiPkg.exports?.["./jobs"], "@retainpdf/api must export ./jobs");
  assert.ok(apiPkg.exports?.["./job-images"], "@retainpdf/api must export ./job-images");
  assert.ok(apiPkg.exports?.["./reader"], "@retainpdf/api must export ./reader");
  assert.ok(apiPkg.exports?.["./search"], "@retainpdf/api must export ./search");
});

test("reader, search, and recent-job images use the canonical API package", () => {
  // reader 宿主已随按功能重组迁至 src/features/reader/domain/host。
  const readerData = readFileSync(
    join(PROJECT_ROOT, "src/features/reader/domain/host/data.ts"),
    "utf8",
  );
  // translation-debug 的 canonical 消费方是 web 平台 barrel；reader 宿主不再
  // 取翻译条目（该能力已作为死代码移除），故不再要求它出现在这里的清单。
  for (const entry of ["http", "jobs-artifacts", "jobs", "reader"]) {
    assert.match(
      readerData,
      new RegExp(`from ["']@retainpdf/api/${entry}["']`),
      `Reader data port must consume @retainpdf/api/${entry}`,
    );
  }
  assert.doesNotMatch(
    readerData,
    /from\s+["'][^"']*js\/api\/(?:http|jobs-artifacts|reader|translation-debug)\.js["']/,
  );
  assert.doesNotMatch(readerData, /loadAiChat\s*:/, "deprecated Reader AI chat must not be wired");

  // 搜索的 mock 适配器不得自带 HTTP；canonical 客户端由平台 barrel 接线。
  const searchMockAdapter = readFileSync(join(PROJECT_ROOT, "src/platform/api/mocks/search.ts"), "utf8");
  assert.doesNotMatch(searchMockAdapter, /\bfetch\s*\(/, "search mock adapter must not duplicate HTTP logic");
  const apiBarrel = readFileSync(join(PROJECT_ROOT, "src/platform/api/index.ts"), "utf8");
  assert.match(apiBarrel, /from\s+["']@retainpdf\/api\/search["']/);

  // 卡片 presenter 与图片加载器已随 library 功能迁至 features/library/domain/card。
  for (const file of [
    "src/features/library/domain/card/recent-job-card-presenter.ts",
    "src/features/library/domain/card/recent-job-card-image-loader.ts",
  ]) {
    const source = readFileSync(join(PROJECT_ROOT, file), "utf8");
    assert.match(source, /from\s+["']@retainpdf\/api\/job-images["']/);
    assert.doesNotMatch(source, /api\/job-images\.js/);
  }
  assert.equal(existsSync(join(PROJECT_ROOT, "src/platform/api/legacy")), false);
  assert.equal(existsSync(join(PROJECT_ROOT, "src/platform/api/mocks/search.ts")), true);
});

test("job cancellation and OCR ambiguity recovery use canonical endpoint clients", () => {
  const runtimeController = readFileSync(
    join(PROJECT_ROOT, "src/features/jobs/domain/runtime/controller.ts"),
    "utf8",
  );
  assert.match(runtimeController, /cancelOcrJob/);
  assert.match(runtimeController, /cancelJob/);
  assert.doesNotMatch(runtimeController, /submitJson/);
  assert.doesNotMatch(runtimeController, /buildJobDetailEndpoint/);

  const apiActions = readFileSync(
    join(PROJECT_ROOT, "../../frontend/packages/api/src/jobs-actions.ts"),
    "utf8",
  );
  assert.match(apiActions, /export async function cancelJob/);
  assert.match(apiActions, /export async function cancelOcrJob/);
  assert.match(apiActions, /export async function resolveOcrAmbiguity/);
  // 地址在契约 job-actions.v1 生成的函数里，手写层调它。
  assert.match(apiActions, /actions\.resolveOcrAmbiguity\(/);
  const generatedActions = readFileSync(
    join(PROJECT_ROOT, "../../frontend/packages/api/src/generated/job-actions.ts"),
    "utf8",
  );
  assert.match(generatedActions, /\/actions\/resolve-ocr-ambiguity/);
});
