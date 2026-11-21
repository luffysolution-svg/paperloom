# 阶段事件、stdout 标签和 JSON 落盘已经下放到底座包 retainpdf_base（contracts / events / io），
# 翻译和流水线都从那里拿；这里只剩依赖 OCR 规范化报告的 pipeline summary。
from .summary import print_pipeline_summary
from .summary import write_pipeline_summary

__all__ = [
    "print_pipeline_summary",
    "write_pipeline_summary",
]
