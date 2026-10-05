# PaperLoom：PDF 保留排版翻译工具

<p align="center">
  <a href="README.md">中文</a> · <a href="README.en.md">English</a> · <a href="README.vi.md">Tiếng Việt</a>
</p>

<p align="center">
  <img src="resources/brand/RetainPDF-github.svg" alt="PaperLoom" width="320" />
</p>

读论文时，常常要在 PDF、翻译工具、Zotero 和笔记软件之间来回切换。PaperLoom 把这些步骤放在一起：导入文献，解析和翻译，边读原文边核对译文，向文档 AI 提问，再把结果保存回 Zotero 或 Obsidian。

PaperLoom 基于 [RetainPDF](https://github.com/wxyhgk/retain-pdf)（MIT）二次开发，独立发布，与上游版本的数据和端口互不干扰。感谢原作者提供的 PDF 处理、翻译和排版基础。

## 翻译与排版能力

PaperLoom 是目前唯一面向图片型 / 扫描版 PDF、支持保留排版翻译的开源项目，翻译与排版效果对标甚至超过同类商业产品。

**在行内公式部分 PaperLoom 的断层领先：翻译后仍能稳定保留公式本体、前后文关系与行内排版，这是其他开源 PDF 翻译项目目前做不到的。**

| 项目 | 扫描型 PDF | 复杂行内公式 | 代码不误翻 | 表格控制 | 自定义翻译策略 | 排版保留 | PDF 压缩优化 | API 自动化 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PDFMathTranslate | ❌ | ❌ | ❌ | 弱 | 弱 | 一般 | 一般 | ✅ |
| PolyglotPDF | ❌ | ❌ | ❌ | 弱 | 弱 | 一般 | 一般 | ✅ |
| Doc2X | ✅ | ✅ | ❌ | 中 | 弱 | 强 | 弱 | ❌ 不开放 |
| PaperLoom | ✅ | ✅ 强保留 | ✅ | ✅ 可开关 | ✅ 可按规则配置 | 强 | ✅ 持续优化 | ✅ |

## 能做什么

- **翻译 PDF，并保留版面。** 支持可编辑 PDF、图片型和扫描版 PDF，处理多栏正文、图片、表格和复杂公式。
- **集中管理文献。** 书库、合集、收藏、任务中心和原文／译文对照阅读都在同一个界面里。
- **围绕文档问问题。** 可以总结论文、梳理方法、解释公式；回答带文档引用，点击引用回到原文页码。PDF Agent 提供需要明确授权的文档操作。
- **从 Zotero 导入，再把译文写回。** 支持批量导入；Zotero 10+ 可单篇或批量保存译文 PDF，重复写回更新原附件。
- **保存到 Obsidian。** 单篇或批量导出中文笔记、可选原文笔记、图片和译文 PDF，带文献信息、来源链接和互链。
- **按自己的习惯配置。** 支持 MinerU／Paddle OCR、模型 API、术语表、自定义翻译策略、代码保护、表格控制、PDF 压缩优化和开放 API；也可以自部署或二次开发。

翻译流程会先恢复跨栏、跨页和断句后的完整语义，再交给模型翻译，减少逐框翻译造成的上下文割裂。字体排版算法用于还原公式和多栏论文的版式。

## 看看实际效果

下面展示的是用户 Zotero 文库中的真实文献和真实界面。2026-10-05，在 Windows 候选安装版上完成了三篇论文的 MinerU VLM 解析、DeepSeek 翻译、PDF 生成、Zotero 批量写回和 Obsidian 批量导出。补充截图可展开查看，并排图片可点击打开原图。截图来源和验证范围见 [截图记录](resources/brand/readme-gallery/product/SCREENSHOT_SOURCES.md)。

### 书库与任务进度

导入后，文献留在书库里。想知道卡在哪一步，打开详情页的“进度”，查看 OCR、翻译和渲染状态；已经完成的文献可以直接阅读。

![PaperLoom 真实书库：本轮完成的 Talebian、Pan 和 Yang 文献](resources/brand/readme-gallery/product/paperloom-library-real.png)

<details>
<summary>展开任务进度、Zotero 导入与下载产物</summary>

在 PaperLoom 中浏览 Zotero 文库和分类，勾选本机 PDF，可以选择导入后立即翻译。处理完成后，详情页集中提供译文 PDF、对照 PDF、Word 排版稿和 Obsidian 笔记包等文件。

<table>
  <tr><th>OCR、翻译和渲染进度</th><th>从 Zotero 导入</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-progress-real.png"><img src="resources/brand/readme-gallery/product/paperloom-progress-real.png" alt="PaperLoom 文档详情中的 OCR、翻译和渲染进度" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-zotero-import-real.png"><img src="resources/brand/readme-gallery/product/paperloom-zotero-import-real.png" alt="PaperLoom 原生桌面界面中的 Zotero 文献导入" /></a></td>
  </tr>
  <tr><th colspan="2">文件产物与下载入口</th></tr>
  <tr><td colspan="2"><a href="resources/brand/readme-gallery/product/paperloom-artifacts-real.png"><img src="resources/brand/readme-gallery/product/paperloom-artifacts-real.png" alt="PaperLoom 文档详情中的文件产物与下载入口" /></a></td></tr>
</table>

</details>

### 原文与译文对照

同一页的英文原文和中文译文并排显示，核对术语、公式、图表和引用会方便很多。也可以只看原文或译文。

![Yang 2024 文献在 PaperLoom 桌面版中的双栏原文与中文译文对照](resources/brand/readme-gallery/product/paperloom-translation-real.png)

<details>
<summary>展开组合图、图注、表格与公式对照</summary>

图表所在页也可以直接对照：下图展示 Yang 2024 的组合图和图注，以及 Li 2026 的正文、表格与公式。

<table>
  <tr><th>Yang 2024：组合图与图注</th><th>Li 2026：正文、表格与公式</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-figures-real.png"><img src="resources/brand/readme-gallery/product/paperloom-figures-real.png" alt="Yang 2024 文献的组合图与中英文图注对照" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-table-translation-real.png"><img src="resources/brand/readme-gallery/product/paperloom-table-translation-real.png" alt="Li 2026 文献的正文、表格与公式翻译对照" /></a></td>
  </tr>
</table>

</details>

### PDF 与 Markdown 同屏

需要复制、检索正文时，可以打开 Markdown 面板，与原 PDF 一起阅读。公式和图片随正文显示，长文按需加载。

<details>
<summary>展开 PDF 与 Markdown 同屏截图</summary>

![Talebian 2025 文献在 PaperLoom 中的 PDF 与 Markdown 阅读界面](resources/brand/readme-gallery/product/paperloom-markdown-real.png)

</details>

### 文档 AI 对话

直接问“这篇论文的方法是什么”“这个数字在哪一页”。下图是围绕 Yang 2024 文献的材料合成与表征问答：AI 分别整理了合成步骤和表征方法，并附上文档引用。引用预览可以查看页码、页面缩略图和原文摘录。

![PaperLoom 桌面版中围绕 Yang 2024 文献的材料合成问答](resources/brand/readme-gallery/product/paperloom-ai-real.png)

<details>
<summary>展开 AI 表征方法总结与引用预览</summary>

![PaperLoom 桌面版中的 AI 表征方法表格与第 3 页引用预览](resources/brand/readme-gallery/product/paperloom-ai-citations-real.png)

</details>

截图中的这次回答触及检索步数上限，界面保留了提前收尾提示。AI 回答和 OCR 结果都需要结合原文核对，尤其是实验条件、单位和表格数值。

### Obsidian：文献信息与正文

导出笔记带有标题、作者、年份、DOI、期刊、Zotero 链接，以及 PaperLoom 文档和任务链接。原文笔记与译文笔记互链，译文 PDF 和图片放在配套资源目录里。

复杂表格保留 HTML 和合并单元格，表格公式可使用可选的 HTML Table Math 0.1.2 渲染。文献已有的 Zotero 高亮、批注和子笔记也会随导出带入，批注保留页码和“在 Zotero 中定位”链接。

<details>
<summary>展开 Obsidian 的 frontmatter、正文、表格与 Zotero 批注</summary>

<table>
  <tr><th>文献信息与 frontmatter</th><th>嵌入 PDF 与中文正文</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-frontmatter-real.png"><img src="resources/brand/readme-gallery/product/obsidian-frontmatter-real.png" alt="Obsidian 中 Talebian 2025 笔记的 frontmatter 属性面板" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-text-real.png"><img src="resources/brand/readme-gallery/product/obsidian-text-real.png" alt="Obsidian 中 Yang 2024 笔记的嵌入译文 PDF、中文标题与正文" /></a></td>
  </tr>
  <tr><th>合并单元格与表格公式</th><th>Zotero 批注与页码定位</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-body-real.png"><img src="resources/brand/readme-gallery/product/obsidian-body-real.png" alt="Obsidian 真实正文：图注、合并单元格和表格公式" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-annotations-real.png"><img src="resources/brand/readme-gallery/product/obsidian-annotations-real.png" alt="Obsidian 中 Yang 2024 文献的 Zotero 批注、页码定位链接与笔记" /></a></td>
  </tr>
</table>

</details>

### Zotero 批量写回

在书库选中多篇文献，点击“写回 Zotero”，逐篇查看创建、更新和失败结果。重复写回更新原附件；写回的“PaperLoom 中文译文”PDF 可以直接在 Zotero 中打开阅读。

<details>
<summary>展开批量写回结果与 Zotero 中的译文 PDF</summary>

<table>
  <tr><th>PaperLoom：更新 3 篇，失败 0 篇</th><th>Zotero：打开 Pan 2024 中文译文</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-zotero-batch-real.png"><img src="resources/brand/readme-gallery/product/paperloom-zotero-batch-real.png" alt="PaperLoom 真实 Zotero 批量写回结果：更新 3 篇、失败 0 篇" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/zotero-translated-pdf-real.png"><img src="resources/brand/readme-gallery/product/zotero-translated-pdf-real.png" alt="Zotero 原生 PDF 阅读器中打开 PaperLoom 中文译文附件：Pan 2024，第 1 页，共 13 页" /></a></td>
  </tr>
</table>

</details>

## 快速开始

前往 [GitHub Releases](https://github.com/luffysolution-svg/paperloom/releases) 查看可下载版本。v0.1.3 的正式桌面产物为 Windows x64 安装版和便携版；macOS、Linux 桌面产物需完成对应平台安装验收后再发布。

1. 打开 PaperLoom，在“设置”中填写 OCR 服务和翻译模型的 API 凭据。本轮示例使用 MinerU 与 DeepSeek。
2. 点击“添加 PDF”，或“从 Zotero 导入”选择本机文献。Zotero 的 PDF 需要先下载到本地。
3. 开始翻译，在任务中心查看进度。
4. 完成后打开对照阅读，核对正文、公式和图表；需要时打开 Markdown 或 AI 问答。
5. 在书籍详情中导出文件，或在书库多选后保存到 Obsidian、写回 Zotero。

OCR 与模型 API 由相应服务商提供，账户额度和费用以服务商为准。

macOS 若提示应用“已损坏”，将应用拖入 `/Applications` 后执行：

```bash
sudo xattr -r -d com.apple.quarantine /Applications/PaperLoom.app
```

### Docker 部署

```bash
git clone https://github.com/luffysolution-svg/paperloom.git
cd paperloom/ops/deployment/docker/delivery
python3 init-local.py
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

从源码构建，不需要私有 GHCR 权限。需要 Docker Compose、Python 3 和能访问依赖下载站点的网络；Windows 上将 `python3` 换成 `python`。首次构建会下载 Rust、Python、Node 和排版依赖，耗时比启动已有镜像长。启动后访问 <http://127.0.0.1:45001>，在页面中填写自己的 OCR 和模型 API 配置。更新源码后重新构建：

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

配置和挂载方式见 [Docker 部署说明](ops/deployment/docker/delivery/README.md)。

## Zotero 与 Obsidian

### Zotero 10 译文 PDF 写回

在 Zotero 中开启“设置 → 高级 → 允许此电脑上的其他应用与 Zotero 通信”，保持 Zotero 运行。文献从 Zotero 导入并完成翻译后，在详情页点击“写回 Zotero”；批量操作则在书库多选后点击同名按钮。

首次写入时，Zotero 会弹出授权窗口。推荐选择“始终允许”；选择“仅允许一次”时，后续上传阶段可能再次提示。译文作为“PaperLoom 中文译文”PDF 子附件放在原文献下，再次写回更新同一个附件。PaperLoom 会在本机保存记住的授权；在 Zotero 高级设置中清除授权后，下次写回需要重新授权。

每批最多 200 篇，重复选择会去重；一篇失败不会中断其他文献。批量写回选择最新实际可用的成功译文 PDF。非 Zotero 来源、尚无译文 PDF 或 Zotero 未运行时，会显示对应错误。

写回需要 **Zotero 10+、同机本地 API**。Zotero 9 及以下只支持导入；Docker 挂载 Zotero 数据目录的模式保持只读。PaperLoom 不直接写入 `zotero.sqlite`。实现和验证范围见 [联动记录](docs/ops/planning/zotero-obsidian-integration.md)。

### Obsidian 批量导出

在书库多选，点击“保存到 Obsidian”，选择 vault 和目录。每批最多 200 篇，逐篇显示写入、冲突、跳过或失败结果；单篇失败不会中断整个批次。可以同时导出原文笔记，译文 PDF 和图片会放在资源目录中。

再次导出时，PaperLoom 更新自己管理的内容区块，保留你写在区块外的笔记。需要保留旧文件时，可以选择重命名或跳过。

**表格公式可选插件：HTML Table Math 0.1.2**，Obsidian 社区 ID 为 `html-table-math`。在社区插件中搜索、安装并启用即可。用户已确认它能渲染 PaperLoom 导出的 HTML 表格公式；本轮真实表格也完成了复验。PaperLoom 不捆绑或自动安装这个插件，普通正文和笔记导出不要求安装它。

## 常见问题

### MinerU 与 Windows 系统代理

桌面版会读取 Windows 系统 HTTP 代理，并传给解析、翻译及结果下载进程。修改代理后重启 PaperLoom；本地服务和 Zotero 保留直连。代理软件只有 SOCKS 端口时，请同时开启 HTTP 或混合端口。

MinerU 上传、解析和下载结果是不同阶段。下载失败时先查看网络提示，检查 DNS 和代理；不要关闭 HTTPS 证书校验。对于官方 CDN 被 DNS 指向过期证书节点的情况，PaperLoom 会在限定条件下刷新域名解析并重试，保持证书校验。Windows 安装版已验证系统代理与关闭代理的场景。

API token 只用于 MinerU API 请求，不发送给结果 CDN 或对象存储。最新接口说明见 [MinerU 官方文档](https://mineru.net/apiManage/docs)。

### OCR 选 MinerU 还是 Paddle

两者都可以使用，复杂表格和图像裁剪的结果可能不同。在本轮两篇同文献比较中，MinerU 保留了部分被 Paddle 错位的表格数值，但它也有行归属错误；Paddle 的组合图更紧凑，MinerU 会拆出更多子图。关键公式和表格数据建议回到原 PDF 核对，不能把这组样本当作所有论文的排名。详见 [真实比较记录](docs/ops/reports/mineru-paddle-obsidian-e2e-20261005.md)。

## 开发与致谢

想参与开发，请先看 [贡献指南](CONTRIBUTING.md)、[项目文档](docs/README.md)和[后端说明](backend/README.md)。安全问题请按 [安全报告说明](SECURITY.md)私下反馈，避免在公开 Issue 中贴出凭据或私人文献。

再次感谢 [RetainPDF](https://github.com/wxyhgk/retain-pdf) 原作者与贡献者。PaperLoom 在原项目基础上继续完善文献阅读、Zotero／Obsidian 联动和桌面使用体验，也感谢 MinerU、PaddleOCR、Typst、Zotero、Obsidian 及相关开源依赖的维护者。

## License

PaperLoom 以 [GNU AGPL-3.0](LICENSE) 发布。每个正式版本都会同时提供完整的 [对应源码](CORRESPONDING_SOURCE.md)，包括与安装包及 app 镜像匹配的 PyMuPDF／MuPDF 源码。RetainPDF 基础代码保留原 [MIT 版权与许可声明](LICENSE-MIT)，其他依赖与素材继续遵循各自许可，详见 [第三方通知](THIRD_PARTY_NOTICES.md)。
