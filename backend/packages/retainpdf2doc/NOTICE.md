# 第三方代码

`vendor/visualtex/` 下是 **VisualTeX** 的源码，MIT 协议：

- 上游：https://github.com/paulhe666/visualtex
- 取自 `@visualtex/core` 0.2.0 与 `@visualtex/office` 0.2.0
- 协议：MIT（见 LICENSE-VISUALTEX）

## 为什么是 vendor 而不是依赖

这两个包**没有发布到 npm**（`npm view @visualtex/core` 是 404），所以没法当普通依赖装。

## 我们改了什么

只改了让它能脱离原仓库编译的部分，逻辑一行没动：

- `office/docx/fonts/fontEmbedding.ts`、`office/docx/package/validatePackage.ts`：
  `from "@visualtex/core"` → 指向 vendor 里 core 的相对路径。
- `office/docx/model/types.ts`：去掉 `BuildNativeMathDocxOptions`。它是上游“语义重排
  文档”那条路径的入参，依赖 core 的文档模型；我们只用 `buildDocxPackage` 这一层原语、
  自己拼文档主体，所以连同那条依赖一起删了。

## 没有拿的部分

pptx、markdown 解析、`docx/paddleocr/` 的固定排版构建器、语义重排（`buildDocument.ts`）。
最后那个尤其值得说明:上游的固定排版构建器按区块 label 查一张写死的字号表
（`doc_title`→Arial 17pt）再加一个 `heightPt * 0.7` 的粗估，而 RetainPDF 的字号来自
排版层的收敛结果（读回译文 PDF，或阅读器那套二分）。我们自己写这一层是因为我们的更准，
不是因为嫌它不好用。

## 字体

`assets/fonts/latinmodern-math.otf` —— Latin Modern Math，GUST Font License
（允许再分发，见同目录的 GUST-FONT-LICENSE.txt / README / MANIFEST）。随文档嵌入，
所以目标机器不需要预装。

## 包里还有什么

- `src/` —— 我们自己的:排版规格契约（`spec.mjs`）、文档主体构建（`body.mjs`，
  DrawingML 绝对定位文本框 + 背景图 + 分节）、公式桥接（`formula.mjs`）、
  文本模式符号规范化（`text-symbols.mjs`）、CLI。
- `vendor/` —— 上游的公式链路与 docx 打包原语，见上。
