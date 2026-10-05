# doc2x-gs PDF 内容流删正文实验

这个目录用于复现“删除原文正文，但保留行间公式”的 PDF content stream 实验。

## 目标

验证一种比 bbox 覆盖更精细的方案：

- 不整页栅格化；
- 不按大 bbox 一刀切删除；
- 直接改写 PDF content stream；
- 删除普通正文的 `TJ/Tj` text-show 操作；
- 保留行间公式里的细碎 `Tj/Tm` 操作和矢量元素；
- 后续再叠加我们的 Typst 中文译文。

闭源参考文件 `电子结构方法-第四章-高斯基组-onlyTrans.pdf` 基本就是类似路线：原始英文正文不可抽取，但行间公式仍保留为 PDF 原始文本/矢量。

## 文件

- `电子结构方法-第四章-高斯基组.pdf`：原始样本 PDF。
- `电子结构方法-第四章-高斯基组-onlyTrans.pdf`：闭源项目输出，用于对比。
- `content_stream_text_strip.py`：当前 POC 脚本。
- `work/`：实验输出目录。

## 运行

在本目录运行：

```bash
python3 content_stream_text_strip.py \
  --input 电子结构方法-第四章-高斯基组.pdf \
  --output work/content-op-strip.pdf \
  --diagnostics work/content-op-strip-diagnostics.json \
  --preview work/content-op-strip-page1.png \
  --pages 1
```

也可以运行专家建议的“先 redact 再贴回公式区域”方案：

```bash
python3 redact_restore_formula.py \
  --input 电子结构方法-第四章-高斯基组.pdf \
  --output work/redact-restore-formula.pdf \
  --diagnostics work/redact-restore-formula-diagnostics.json \
  --preview work/redact-restore-formula-page1.png \
  --pages 1
```

输出：

- `work/content-op-strip.pdf`
- `work/content-op-strip-diagnostics.json`
- `work/content-op-strip-page1.png`

## 当前效果

对第 1 页：

- 英文正文、英文标题、页脚被删除；
- 三个行间公式被保留；
- PDF 没有图片化，公式仍是原始 PDF 对象；
- 抽取文本基本只剩公式块。

## 当前限制

这还是样本 POC，不是后端通用实现。

当前规则利用了这个 PDF 的结构特征：

- 正文主要编码为长 `TJ` 数组；
- 行间公式主要编码为大量细碎 `Tj/Tm`；
- 正文中的孤立变量需要额外规则清掉。

后端通用版本还需要补：

- 稳定的 `Tj/TJ -> bbox` 映射；
- 接入 PaddleOCR `display_formula` bbox 作为保护区；
- 保护区内保留原文操作，保护区外删除正文操作；
- 与现有 Typst overlay / source cleanup 策略做成可选渲染模式。

## 推荐集成方向

专家建议优先集成 `apply_redactions + show_pdf_page`，原因是工程复杂度远低于完整 text-op interpreter。

后端流程可以是：

1. OCR 阶段保留 `display_formula` bbox。
2. cleanup 阶段对正文翻译 bbox 做 redaction。
3. redaction 后从原 PDF 按 `display_formula` bbox clip 回贴公式区域。
4. 再叠加 Typst 中文译文。
5. 如果回贴失败，降级到现有 bbox cover/strip。
