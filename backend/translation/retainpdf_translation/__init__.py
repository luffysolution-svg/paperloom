"""RetainPDF 翻译：把规范化的 document.v1.json 变成逐页 translation payload 和 translation-manifest.json。

外部（流水线的 worker 外壳、渲染、OCR）只走 ``retainpdf_translation.public``；说明见 backend/translation/README.md。
"""
