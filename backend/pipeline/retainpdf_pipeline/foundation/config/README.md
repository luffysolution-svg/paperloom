# Config 分层说明

`scripts/foundation/config` 用来集中管理配置，避免共享层继续承载所有职责。

## 拆分结果

- 路径（`ROOT_DIR`、`DATA_DIR`、`OUTPUT_DIR`、各缓存目录）和任务目录子目录名已经下放到底座包：
  `retainpdf_base.paths`、`retainpdf_base.output_layout`（`backend/base`），流水线和翻译共用。
- `fonts.py`
  只放字体与字号相关配置，例如默认字体路径、默认字号、Typst 默认字体族。
- `runtime.py`
  只放运行时默认项，例如默认页码、默认输出名、PDF 压缩 DPI。
- `layout.py`
  只放版式调参相关配置，以及 `apply_layout_tuning(...)`。

## 兼容策略

当前仍保留 `scripts/foundation/shared/config.py` 作为兼容 facade。

历史代码里常见的旧写法是：

```python
from foundation.config.paths import OUTPUT_DIR
from foundation.config.layout import apply_layout_tuning
```

后续如果要逐步去耦合，可以再把各模块的 import 迁移到更明确的来源：

- 路径相关优先用 `foundation.config.paths`
- 字体相关优先用 `foundation.config.fonts`
- 版式调参优先用 `foundation.config.layout`
- 运行默认值优先用 `foundation.config.runtime`
