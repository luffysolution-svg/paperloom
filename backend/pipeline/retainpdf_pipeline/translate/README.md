# 翻译 worker 外壳

翻译本身在独立包 [`retainpdf-translation`](../../../translation/README.md)（`backend/translation`，`import retainpdf_translation`）。
这里只剩 Rust 启动翻译 worker 用的外壳，模块名 `retainpdf_pipeline.translate` 写在 `retainpdf-runner` 的进程约定里，不要改。

| 文件 | 作用 |
| --- | --- |
| `__main__.py` | `python -m retainpdf_pipeline.translate --spec <job_root>/specs/translate.spec.json` 进程入口 |
| `entrypoints/translate_only_pipeline.py` | translate-only worker：读 `translate.stage.v1` spec、建任务目录、写事件和 stdout 标签，调翻译包的 public 门面 |
| `entrypoints/from_ocr_pipeline.py` | 本地整本 OCR → 翻译 → 渲染串联（生产 book 由 Rust 顺序调三个进程） |
| `translation_stage.py` | 把翻译参数交给 `retainpdf_translation.public.execute_translation_request` |

外壳可以依赖流水线的其他部分；翻译包不许反过来依赖流水线（门禁 `check_translation_library_self_contained`）。
新的翻译逻辑一律放进翻译包，这里不加文件（门禁按 `TRANSLATION_SHELL_ALLOWED_FILES` 查）。
