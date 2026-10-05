# RetainPDF 533 页渲染基准

这个目录把真实 job `20260514183142-dec42e` 抽象成一个可复现的大文档渲染 benchmark。

它不是玩具题。样本来自真实 533 页科学书籍 PDF，包含正文、标题、脚注、图注、行内公式、
行间公式、复杂 PDF 背景、Typst overlay 和 PDF 合并。这个 benchmark 用来衡量真实文档翻译
渲染算法，而不是孤立函数性能。

## 适合优化什么

- 排版策略：字体、行距、bbox、视觉密度、正文/标题/脚注/图注策略
- Typst source builder：从翻译 JSON 生成 `.typ` 的速度和结构
- Typst compile：固定 `.typ` 输入下的编译耗时
- source prepare：bbox text strip、预热、背景 PDF 准备
- PDF overlay：overlay merge 和保存
- 端到端 render-only 性能

## 当前基线

在当前开发机上，warm benchmark 已验证：

```text
case: quantum_chem_533
pages: 533
render elapsed: 20.66s
overlay diagnostics total: 18.94s
payload prepare: 3.08s
Typst source prepare: 7.36s
Typst compile: 6.18s
PDF merge: 2.13s
source cleanup: 0.00s
```

单独编译导出的 Typst case：

```text
Typst compile only: 6.28s
```

这些数字不是最终目标，只是当前代码和当前机器上的参考基线。

## 一分钟流程

如果本机已有源 job：

```bash
python3 experiments/render-benchmark-533/scripts/materialize.py --overwrite
python3 experiments/render-benchmark-533/scripts/check_env.py
python3 experiments/render-benchmark-533/scripts/run_render_benchmark.py --run-id my-run --overwrite
```

查看结果：

```bash
cat experiments/render-benchmark-533/runs/my-run/report.json
```

导出并单独测试 Typst：

```bash
python3 experiments/render-benchmark-533/scripts/export_typst_case.py --run-id my-run --overwrite
python3 experiments/render-benchmark-533/scripts/compile_typst_case.py --typst-case my-run --run-id compile-1 --overwrite
```

## 数据要求

只 clone 代码不能直接跑这个 533 页 benchmark。

原因是 benchmark 依赖真实 PDF、OCR JSON、翻译 JSON 和预热产物。这些数据体积较大，且原始
PDF 可能涉及分发授权，所以默认不直接放进代码仓库。

能跑的人需要满足以下条件之一：

1. 本机已有源 job：

   ```text
   data/jobs/20260514183142-dec42e/
   ```

2. 或者拿到 benchmark 数据包，并解压成：

   ```text
   experiments/render-benchmark-533/case-data/quantum_chem_533/job/
   ```

源 job 中主要使用这些目录：

```text
source/
translated/
ocr/normalized/
specs/
artifacts/render_prewarm/
```

其中 `translated/` 约 54MB，`ocr/normalized/` 约 87MB，`source/` 约 10MB，
`artifacts/render_prewarm/` 约 11MB。完整源 job 会更大。

## 环境依赖

建议环境：

- Linux x86_64
- Python 3.10+
- RetainPDF 仓库源码
- 后端 Python 依赖已安装
- Typst CLI 可执行
- PyMuPDF / `fitz` 可 import
- 可用中文字体，当前默认 `Source Han Serif SC`

快速检查：

```bash
python3 experiments/render-benchmark-533/scripts/check_env.py
```

当前开发机示例：

```text
Python 3.10.12
Typst 0.14.2
PyMuPDF OK
```

说明：

- render-only 正常路径不需要 OCR API 或翻译 API。
- 如果 Typst 编译失败并触发 LLM repair fallback，可能读取 `RETAIN_TRANSLATION_API_KEY`。
- 做公开比赛时，建议关闭网络 fallback，或规定 fallback 触发即判失败，避免结果不可比。
- 给外部参与者时，最好提供 Docker 镜像或安装脚本，否则字体和 Typst 版本会影响结果。

## 目录结构

```text
experiments/render-benchmark-533/
  case.json                  # case 元信息、hash、参考基线
  README.md
  scripts/
    materialize.py           # 从源 job 生成本地 case-data
    check_env.py             # 检查依赖和 case 数据
    run_render_benchmark.py  # 跑完整 render-only benchmark
    export_typst_case.py     # 从某次 run 导出 Typst 物料
    compile_typst_case.py    # 只编译导出的 Typst source
  case-data/                 # 本地物料，默认 git ignore
  runs/                      # 每次完整 benchmark 的输出，默认 git ignore
  typst-cases/               # 导出的 Typst 子 benchmark，默认 git ignore
```

## 准备数据

从源 job materialize：

```bash
python3 experiments/render-benchmark-533/scripts/materialize.py
```

覆盖已有 case：

```bash
python3 experiments/render-benchmark-533/scripts/materialize.py --overwrite
```

输出：

```text
experiments/render-benchmark-533/case-data/quantum_chem_533/job/
```

脚本默认尽量使用硬链接，避免重复占用磁盘；如果文件系统不支持硬链接，则退化为复制。

脚本还会重写 `artifacts/render_prewarm/render_source_prewarm_manifest.json` 里的 source PDF
路径和 mtime 指纹。否则隔离 run 中预热会 miss，warm benchmark 会退化成 cold benchmark。

## 运行完整 Benchmark

默认运行：

```bash
python3 experiments/render-benchmark-533/scripts/run_render_benchmark.py
```

指定 run id：

```bash
python3 experiments/render-benchmark-533/scripts/run_render_benchmark.py --run-id my-test --overwrite
```

带 cProfile：

```bash
python3 experiments/render-benchmark-533/scripts/run_render_benchmark.py --run-id prof-1 --profile
```

每次 run 都会创建隔离目录：

```text
experiments/render-benchmark-533/runs/<run_id>/
```

核心输出：

```text
runs/<run_id>/report.json
runs/<run_id>/render.stdout.log
runs/<run_id>/render.stderr.log
runs/<run_id>/job/rendered/*.pdf
```

`report.json` 记录：

- `success`
- `wall_seconds`
- `render_elapsed_seconds`
- `effective_render_mode`
- `pages_processed`
- `render_diagnostics`
- 输出 PDF 路径
- stdout/stderr 路径
- 输入 hash
- 实际执行命令

## 查看关键耗时

可以直接用：

```bash
python3 - <<'PY'
import json
from pathlib import Path

report = json.loads(Path("experiments/render-benchmark-533/runs/my-test/report.json").read_text())
diag = report["render_diagnostics"]
print("success:", report["success"])
print("wall:", report["wall_seconds"])
print("render:", report["render_elapsed_seconds"])
print("prepare:", diag.get("payload_prepare_elapsed_seconds"))
print("typst source:", diag.get("typst_source_prepare_elapsed_seconds"))
print("typst compile:", diag.get("compile_elapsed_seconds"))
print("merge:", diag.get("overlay_merge_elapsed_seconds"))
print("source cleanup:", diag.get("source_overlay_elapsed_seconds"))
PY
```

## 单独测试 Typst

完整 render benchmark 包含 source prepare、layout、Typst source 生成、Typst compile、
PDF overlay merge 和保存。如果只想研究 Typst 编译，可以导出 Typst case。

从某次完整 run 导出：

```bash
python3 experiments/render-benchmark-533/scripts/export_typst_case.py --run-id my-test --overwrite
```

导出目录：

```text
experiments/render-benchmark-533/typst-cases/my-test/
```

包含：

```text
book-overlay.typ
book-overlay.typ.prebuilt
book-overlay.pdf
typst-case.json
source-run-report.json
```

只编译 Typst：

```bash
python3 experiments/render-benchmark-533/scripts/compile_typst_case.py \
  --typst-case my-test \
  --run-id compile-1 \
  --overwrite
```

输出：

```text
typst-cases/my-test/compile-runs/compile-1/compile-report.json
typst-cases/my-test/compile-runs/compile-1/book-overlay.pdf
typst-cases/my-test/compile-runs/compile-1/typst.stderr.log
```

这个流程不会重新跑 OCR、翻译、source prepare、layout 或 PDF merge，只测固定 `.typ` 输入下
的 Typst CLI 编译。

## warm 与 cold

当前完整 benchmark 默认是 warm-ish 模式：

- 会复制 `artifacts/render_prewarm/`
- 会自动修正 prewarm manifest 的 source PDF 指纹
- source bbox-text stripped PDF 和 payload prewarm 可以命中

如果要测试 cold 模式，可以删除 run job 里的：

```text
artifacts/render_prewarm/
```

后续建议把 cold/warm 做成显式参数，例如：

```bash
--mode warm
--mode cold
```

## 评分建议

不要只按速度排名。只比速度会鼓励少处理、牺牲质量、跳过复杂页面。

建议规则：

1. 必须成功生成 PDF。
2. 必须通过质量门槛。
3. 质量通过后，再按耗时排名。

质量门槛建议逐步加入：

- 文字溢出
- 文字重叠
- 行间公式保护
- 字体大小跳跃
- 页面视觉密度
- PDF 文件大小
- 抽样页截图 diff
- 固定页人工审阅

第一版可以先做硬门槛：

```text
success == true
pages_processed == 533
output_pdf exists
Typst compile 没有 fatal error
```

然后再扩展视觉质量评分。

## 发布数据包建议

如果要给外部算法开发者，建议发布两个包：

1. 轻量包：只含 `typst-cases/<case>/`，用于 Typst source/compile 优化。
2. 完整包：含 `case-data/quantum_chem_533/job/`，用于完整 render-only 优化。

完整包应包含：

```text
source/
translated/
ocr/normalized/
specs/
artifacts/render_prewarm/
case.json
README.md
scripts/
```

不建议发布完整 `data/jobs/<job_id>/`，因为其中包含大量日志、历史产物和调试文件，会让基准
输入不够干净。

## 当前限制

- 目前还没有自动视觉质量评分。
- 目前 cold/warm 不是显式参数。
- 当前 benchmark 依赖本仓库后端代码，不是独立 Python package。
- 当前字体、Typst 版本、系统环境会影响绝对耗时。
- 真实 PDF 是否能公开分发需要单独确认授权。
