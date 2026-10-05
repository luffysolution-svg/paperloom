# API 查询改造：隔离验收

本页记录 2026-09-14 的本机验收方法。它不等同于生产发布、真实 OCR/翻译
供应商验收或 Reader/PDF 视觉验收。前后端需要按 [events v2](event-feed-v2.md)
契约协调升级；本轮不修改用户数据库、不提交 Git、不部署。

## 可复现工具

- `backend/api/examples/query_acceptance.rs`：真实 `build_state` / `build_app`
  HTTP 服务，release 构建；新建隔离数据库，不启动 worker 或服务监督。
- `backend/api/scripts/query_acceptance.py`：真实 HTTP 查询、正确性断言、计时，
  以及只允许 GET 的本地网页代理。不伪造 API 结果。
- `backend/api/scripts/test_query_acceptance.py`：统计计算、目录和夹具写入范围检查。

在仓库根目录、终端 A 执行：

```sh
cargo build --locked --release -p rust_api --example query_acceptance
ACCEPTANCE_ROOT=$(mktemp -d /tmp/retain-api-acceptance.XXXXXX)
mkdir "$ACCEPTANCE_ROOT/runtime"
printf '%s\n' "$ACCEPTANCE_ROOT"
target/release/examples/query_acceptance "$ACCEPTANCE_ROOT/runtime" 42831
```

等待 `READY`，在终端 B 将 `ACCEPTANCE_ROOT` 设为刚打印的路径，然后运行：

```sh
python3 backend/api/scripts/query_acceptance.py bench "$ACCEPTANCE_ROOT/runtime"
```

数据库含 12,006 个合成任务，其中五个有事件。分别测 1,000 / 10,000 /
100,000 条历史，初始一半来自 SQLite、一半来自 Python JSONL。每组首次
tail=500 请求建立投影，然后测 40 次空轮询、10 次单条追加读取。列表每项
15 次（100 条与 500 条页面分别计时）；另测 16 个客户端并发发出的 32 个不同事件查询，避免 single-flight
把相同请求合并成一个而掩盖排队。p95 采用 nearest-rank；计时包含本机 HTTP
连接和 JSON 解析，返回字节数不含 HTTP 头。

**每次冷启动基准必须换一个全新目录**：首次查询会持久化投影，追加测试也会
增加源事件。不要在同一目录重复测量并把它称为冷启动。示例拒绝对非空目录
执行初始化；端口占用会直接报错，不能把另一进程的健康检查当作启动成功。

## 浏览器验收

使用当前前端构建和真实 API，运行数据全部来自上述隔离夹具。若不希望改动
工作区中的网页构建输出，可以将官方构建脚本复制到临时树：

```sh
ACCEPTANCE_REPO=$(pwd)
mkdir -p "$ACCEPTANCE_ROOT/web/scripts" "$ACCEPTANCE_ROOT/web/dist/css"
cp frontend/web/scripts/build-js-bundle.mjs "$ACCEPTANCE_ROOT/web/scripts/"
ln -s "$ACCEPTANCE_REPO/frontend/web/src" "$ACCEPTANCE_ROOT/web/src"
ln -s "$ACCEPTANCE_REPO/frontend/web/node_modules" "$ACCEPTANCE_ROOT/web/node_modules"
ln -s "$ACCEPTANCE_REPO/node_modules" "$ACCEPTANCE_ROOT/node_modules"
# 先确保 workspace 包 dist 对应当前源码；日常命令为：
npm --workspace frontend/web run prepare:workspace
node "$ACCEPTANCE_ROOT/web/scripts/build-js-bundle.mjs"
node_modules/.bin/tailwindcss -i frontend/web/src/styles/entries/home.css -o "$ACCEPTANCE_ROOT/web/dist/css/home.css" --minify
node_modules/.bin/tailwindcss -i frontend/web/src/styles/entries/detail.css -o "$ACCEPTANCE_ROOT/web/dist/css/detail.css" --minify
python3 backend/api/scripts/query_acceptance.py web "$ACCEPTANCE_ROOT"
```

访问 `http://127.0.0.1:42832/`。网页代理只注入本地 API 地址及公开的测试 key
`local-acceptance-only`，不读取已有 runtime-config.local.js 中的私密配置。
代理仅打印事件请求模式、状态码、条数，不打印 cursor 或凭据。此构建流程
仅覆盖主页和详情的 CSS，不作为 Reader 样式验收。

实际验收路径：

1. `detail.html?job_id=acceptance-ui`：打开前不加载事件；点击“按需加载”，
   观察 head 500 → cursor 500 → cursor 200，事件弹窗显示全部 1,200 条。
2. 主页 → 任务中心 → `acceptance-ui` → 打开详情：运行中先读 tail 500，
   随后空 cursor 轮询。任务中心自身目前仍有 2,000 条前端安全上限。
3. 运行以下命令，观察只新增 1 条事件，翻译进度从 92% 变成 96%：

   ```sh
   python3 backend/api/scripts/query_acceptance.py append "$ACCEPTANCE_ROOT/runtime"
   ```

4. 修订已经消费过的 SQLite 事件，观察 cursor 410 → tail 500 → 空 cursor
   自动恢复，现有进度不闪回：

   ```sh
   python3 backend/api/scripts/query_acceptance.py invalidate "$ACCEPTANCE_ROOT/runtime"
   ```

5. 经真实 `Db.save_job` 保存成功终态，并追加结束事件；不要伪造 PDF 或
   `terminal_reason=done`。观察补齐完整历史，然后停止主轮询：

   ```sh
   target/release/examples/query_acceptance "$ACCEPTANCE_ROOT/runtime" --terminal
   ```

终态验收发现并修复的契约缺口：现代后端返回 `status=succeeded`、
`stage_snapshot=null`，正常 runtime 原因是 `succeeded`，但旧前端只接受
done/completed 或最终 PDF，导致无 PDF 的成功任务持续轮询。现代明确
终态与旧格式模糊成功信号需要分别判断；不能为了通过测试向夹具塞入虚假产物。

本次实测终态分页为 **head 500 → cursor 500 → cursor 202**，补齐原始 1,200
条、追加进度 1 条、结束事件 1 条。关闭仍运行旧构建的对照页面后，修复版
页面的事件请求计数保持不变；新回归也验证主轮询停止、旧 timer 不能复活，
且 head 只请求一次。修复版页面检查未发现 console error / warning。

## 本机结果（2026-09-14）

Apple M1 Max、64 GiB、macOS arm64；release 构建。以下是全新数据库、浏览器
验收和测试进程结束后的单次基准。冷查询期间每约 50 ms 再发起一次健康检查，
其开销包含在这次测量条件中。不是持续压力测试，也没有改造前的同条件对照。

| 历史事件数 | 首次 tail 建投影（ms，1 次） | 空轮询 p50 / p95（ms） | 单条追加 p50 / p95（ms） | 空轮询响应体（B） |
| --- | ---: | ---: | ---: | ---: |
| 1,000 | 63.27 | 5.86 / 6.36 | 7.42 / 8.07 | 280 |
| 10,000 | 559.14 | 5.81 / 7.79 | 6.30 / 7.20 | 284 |
| 100,000 | 7,325.91 | 5.43 / 6.16 | 6.23 / 6.86 | 288 |

100,000 条冷查询期间，101 次 `/health` 均返回 200，p50 17.61 ms、p95
29.87 ms、最大 55.91 ms。说明此次冷建投影没有使健康接口一起等待 7 秒，
不代表数据库相关的其他查询完全不受竞争影响。

| 查询 | 样本数 | p50 / p95（ms） | 响应体平均字节数 |
| --- | ---: | ---: | ---: |
| jobs，100 条 | 15 | 350.36 / 677.07 | 87,431 |
| library/books，100 条 | 15 | 345.00 / 365.03 | 51,734 |
| 全库搜索超过旧 10,000 条截断位置的目标 | 15 | 62.26 / 76.18 | 566 |
| 32 个不同事件查询，客户端并发 16 | 32 | 88.15 / 105.58 | 15,904 |

列表搜索每次均命中唯一的 `acceptance-library-00000`，并发查询全部返回 200。
列表中首次样本包含尚未加载过的任务投影，未将该开销从结果中剔除。

回归结果：

- Rust workspace：814 通过、4 忽略、0 失败（`npm run test:api`）。
- 前端全部 Node 测试：1,369 通过、2 跳过、0 失败；其中新增终态契约 6 条。
  新增测试在修复前有 5 条失败，修复后全部通过。
- API Python 架构/测试过滤/验收工具：39 通过。
- Rust architecture、fmt、diff 检查通过；domain/frontend TypeScript、domain
  包类型与导入检查通过。

本次机器上的原始 JSON：`/tmp/retain-query-benchmark-final.json`；回归日志：
`/tmp/retain-query-acceptance-workspace-tests.log`、
`/tmp/retain-job-terminal-all-tests.log`、
`/tmp/retain-query-acceptance-python-tests.log`。这些是临时证据，不是仓库依赖。
浏览器事件请求证据在 `/tmp/retain-acceptance-http.log` 和
`/tmp/retain-acceptance-http-current.log`；关闭旧标签页产生的代理 BrokenPipe
仅说明客户端中断连接，不是 API 查询失败。

## 尚未覆盖与后续热点

- 首轮架构/事件改造没有改造前同机对照数据；下述对照仅衡量后续列表批量化这一轮。
- 首次访问大历史仍需全量建立持久投影；warm cursor 的小响应不代表首次打开也快。
- 列表的重复数据库读取已在下述后续优化中批量化。大量任务同时首次建立事件
  投影、或每次轮询均有新事件时，仍会进入正常同步路径；这类负载需要单独测量。
- 未进行生产 DB 备份恢复演练、真实供应商调用、真实 PDF/Reader 验收、持续压力
  测试或生产发布；不要把本页作为这些事项已完成的证据。
- 用完关闭验收页，并在启动服务的终端按 Ctrl-C；保留临时目录便于检查，
  不需要清理用户的其他服务或数据。

## 后续优化：列表批量投影（2026-09-14）

本轮将列表的逐任务重复状态查询改为请求级批量读取，覆盖任务列表、文档任务
历史及图书馆列表。最多两条查询读取任务与直接 OCR 子任务，并在同一个短读
事务中取得事件版本、pipeline authority、retention cutoff、feed 检查点。
事务结束后检查 JSONL 文件身份、长度、修改时间；变化或错误仍回退到已有同步
流程。此处没有跨请求 TTL 缓存，也没有为了快而忽略实时事件。没有任何事件的
任务不再仅因进入列表而创建空 feed。

新增 3 条数据库测试、6 条投影/列表测试：超过 1,100 个 ID 仍最多两条查询；
DB 追加/修改/删除、文件追加/半行/截断/替换/删除、子任务创建/追加/解绑、
authority/status 变化、保留期清理及重试不复活历史，以及任务/文档/图书馆
列表的主进度和后台阶段一致性。

对照方式：保留改动前的 release 二进制；前后各使用一个全新夹具目录，在同一
台 M1 Max 上依次执行同一版 `bench`。页面有 5 个运行中任务，其余为没有事件
的失败任务；因此该组收益主要反映常见历史列表的批量读取，并不代表 500 个
持续产生增量的活跃任务也有同样延迟。所有列表样本的返回条数和响应体字节数
与优化前一致；展示语义另外由回归测试校验。

| 查询 | 优化前 p50（ms） | 优化后 p50（ms） | 优化后 p95（ms） |
| --- | ---: | ---: | ---: |
| jobs 100 条 | 323.95 | 4.75 | 110.66 |
| library/books 100 条 | 323.49 | 4.42 | 4.76 |
| jobs 500 条 | 1,627.94 | 18.64 | 19.41 |
| library/books 500 条 | 1,627.59 | 16.80 | 17.88 |
| 超过旧截断位置的全库搜索 | 59.89 | 56.16 | 58.88 |

每项 15 次。jobs 100 条的 p95 含首次访问尚未建立投影的任务，未剔除这一
冷请求；后续 500 条页面新增的无事件任务不需要建空投影。全库搜索仍需扫描
匹配候选，因此没有同量级收益。

事件增量路径没有被这轮改写：100,000 条空轮询 p50 为 4.83 ms；首次建投影
仍为 7,027.31 ms（对照 6,623.21 ms），**本轮不宣称冷建投影已优化**。
32 个不同事件查询全部返回 200。性能结果是本机合成数据基线，不是生产 SLA。

仅重测列表可用（不要求 fresh，不能冒充冷事件基准）：

```sh
python3 backend/api/scripts/query_acceptance.py lists "$ACCEPTANCE_ROOT/runtime"
```

本机对照证据保留在 `/tmp/retain-query-comparison.y1QnQX/`，包括 `before.json`、
`after.json`、改动前二进制以及数据库/投影/完整 workspace 测试日志。
完整回归结束后，再次单独运行 `lists`：jobs 100 / 500 条 p50 分别为
5.63 / 19.26 ms，library 500 条为 17.80 ms，记录于 `after-warm-repeat.json`。

## 2026-09-14 首屏与历史事件解耦

这轮优化的是用户首次看到列表的等待，不是把所有事件历史的完整读取变成常数时间。

- `/api/v1/jobs` 与 `/api/v1/library/books` 新增可选 `include_live_stage=false`。
  只使用已持久化的任务摘要，不导入事件历史；阶段与进度是已保存快照，
  不包含事件推导的后台阶段。省略或传 `true` 时保持原有完整实时投影。
  详情、文档任务历史和事件游标协议不变。
- 任务中心首批 50 条，明确提供“加载更多任务”，最多 2000 条；计数只代表
  当前加载范围。只有已加载的 queued/running 任务异步补取详情，每次最多
  2 路并发；迟到的旧分页响应不覆盖新页，单任务失败不丢掉其它任务状态。
- 主页 `/documents` 返回后先显示书卡，标注“读取状态…”；任务投影和
  OCR-only 回填完成后更新状态。已有卡片在刷新时保留，补态失败不隐藏书籍。

### 接口计时（不是浏览器 LCP）

独立 release 样本 `/tmp/retain-api-acceptance.UzlSTh/runtime`，12006 个任务，
其中包含 100000 条历史事件的任务。先请求轻量列表，再请求完整列表；
轻量路径不创建事件投影（另有 Rust 回归断言 JSONL 读取字节数不变）。

| 请求 | 第一次（ms） | 重复一次（ms） |
| --- | ---: | ---: |
| jobs 50，`include_live_stage=false` | 32.92 | 4.45 |
| jobs 50，默认完整投影 | 13577.54 | 6.79 |

这是一组本机对照样本，不是统计性性能保证，完整投影首次初始化的成本仍然存在。

真实书库本地 debug API，每项连续 5 次，未清理原库缓存：

| 请求 | 返回条数 | p50（ms） |
| --- | ---: | ---: |
| documents 首屏 | 24 | 3.58 |
| 新任务首屏，轻量投影 | 50 | 29.55 |
| 原任务请求，完整投影 | 179 | 293.57 |

以上任务首屏对比同时包含分页缩小与投影简化，不能归因于单个优化点。
Browser 实际验证主页先出现书卡及“读取状态…”、随后恢复真实状态，任务中心
首次进入显示 50 条，继续加载依次达到 100、150、179 条，最后移除加载更多按钮；
控制台无错误。原库仍有 40 条文档、179 条任务，SQLite quick_check 为 ok。
没有配置 Chrome DevTools 性能追踪，
因此不报告 FCP/LCP，也不声称整个浏览器首屏只需 30 毫秒。

验证：前端 1380 通过 / 1 跳过；Rust workspace 在
`uv run --project backend --locked --all-extras cargo test --locked --workspace`
下 824 通过 / 4 忽略；TypeScript、Rust fmt、API 架构检查通过。
直接在未激活后端 Python 环境的 shell 跑 Rust 测试会有 4 项 PDF 执行测试失败，
上述项目环境下均通过。CSS 构建仍报告已有嵌套选择器警告，此轮没有修改它们。

本轮最终回归：`npm run test:api` **823 通过、4 忽略、0 失败**；39 条 Python
测试、Rust architecture、fmt 和 diff 检查通过。本轮未修改前端，未重跑此前的
浏览器/PDF/供应商验收；没有提交或部署，隔离测试服务在结束后关闭。
