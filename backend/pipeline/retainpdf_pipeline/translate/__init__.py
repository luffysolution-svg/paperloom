"""翻译阶段的 worker 外壳：Rust 用 ``python -m retainpdf_pipeline.translate --spec ...`` 启动。

外壳只读 stage spec、建任务目录、发事件和 stdout 标签；翻译本身在独立包 retainpdf_translation（backend/translation）。
"""
