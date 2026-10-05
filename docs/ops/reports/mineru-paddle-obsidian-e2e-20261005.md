# Zotero → MinerU → DeepSeek → Obsidian 真实验收

2026-10-05，Windows。使用当前安装版后端、Zotero 10.0.5 本地 API、DeepSeek `deepseek-flash`、Obsidian 1.13.7 和已启用的 HTML Table Math 0.1.2。系统代理关闭。用户提供的凭据只用于本机测试，未写入报告、源码或截图。

## 完成的真实链路

| 文献 | MinerU + DeepSeek + PDF | 批量导出 |
| --- | --- | --- |
| Pan 2024（13 页） | 首次 MinerU 返回服务端 parsing failed；单篇重试后成功 | 成功 |
| Talebian-Kiakalaieh 2025（15 页） | 成功 | 成功 |

两篇真实 Zotero PDF 在独立 PaperLoom 数据目录中重新导入，使用 MinerU VLM 完整解析与 DeepSeek 翻译，生成保留排版 PDF。最终批量写入 2 篇、失败 0 篇。Paddle 对照使用相同原文的既有成功任务，也使用 `deepseek-flash`；本次未重跑 Paddle，运行时间、并发和翻译随机性不是严格控制变量。

用户实际 vault 的结果：`F:\个人知识库\PaperLoom\MinerU-vs-Paddle-20261005\Comparison.md`。相邻 `MinerU/`、`Paddle/` 保存各自笔记与 PDF，`screenshots/` 保存真实 Obsidian 预览截图。均未上传。

## 发现、修复与回归

MinerU HTML 表格使用 `<eq>…</eq>` 公式标记；原导出未转换，COF 表格 MathJax 公式数为 0，显示原始 TeX。修复只在 HTML 表格内转换为 `$…$`，保留 rowspan/colspan，表格外正文、图片链接和图注逐字不变。原文与译文都应用转换。

回归先复现失败，再通过；Markdown 导出完整 focused tests **23/23**。独立只读复核未发现该修复中的报告级问题。当前安装目录的 `rust_api.exe` 已更新，SHA-256 与最终 release 构建一致，替换前二进制保留本地备份。

真实 Obsidian 重导出后：

| 观察区域 | Paddle | MinerU 修复后 |
| --- | --- | --- |
| COF 表格公式 | 8 | 9（含催化剂名称下标） |
| HOF 表格公式 | 13 | 14 |
| HOF rowspan | 3 | 5 |
| 检查区域中的 MathJax 错误／未渲染 `$`／横向溢出 | 0 | 0 |
| Pan 图片引用 | 48，全部存在 | 54，全部存在 |
| Talebian 图片引用 | 21，全部存在 | 17，全部存在 |
| PDF 页数 | Pan 13，Talebian 15 | Pan 13，Talebian 15 |

图片数量反映 OCR 切图差异，不代表质量分数。Pan 的真实图文、图注和行内公式均能显示；Paddle 复合图更紧凑，MinerU 拆出更多独立子图，笔记更长。为检查 Markdown，Pan 截图时临时隐藏了顶部嵌入 PDF 的预览，随后恢复；笔记未修改。

## 识别质量与限制

对照原 PDF 的 HOF 表格：HOF-25-Re 的正确数值为 1448，HOF-25-Ni@GO 为 24323。MinerU 保留了两者；Paddle 将 `ppm/20 min` 放进 Re 行，将 1448 放进 Ni 行，丢失 24323。MinerU 仍有合并单元格/行归属偏差（包括 H₂ evolution reaction 与降解/BPA 部分）。两者关键数据都应回查原 PDF。

因此，本样本中 MinerU 的数值提取更完整，Paddle 的复合图展示更紧凑；不据此对所有 PDF 做通用排名。没有逐项语义核对全文每个公式。本轮 API 完整测试仍有此前出现的 Windows/路径/进程失败（550 通过、10 失败、2 忽略），发布门禁未记为通过。

Obsidian 在关闭测试重复标签时记录过一次 PDF.js `Transport destroyed`；截图中的 PDF 和 Markdown 均可显示，检查区域未发现 MathJax 错误。该日志不作为“所有控制台错误为零”的证据。

## 收尾

已关闭测试专用服务，清除临时 credential vault；扫描本地测试日志、JSON、数据库和 Obsidian 笔记，没有残留两项用户提供的 key。当前 PaperLoom 原书库仍为 6 篇，所有基线文件存在，现有 generated dist 为 0 项变化。没有 commit、push、tag、Release 或 artifacts 上传。
