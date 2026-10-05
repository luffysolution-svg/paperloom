# PaperLoom: Layout-preserving PDF translation

<p align="center">
  <a href="README.md">中文</a> · <a href="README.en.md">English</a> · <a href="README.vi.md">Tiếng Việt</a>
</p>

<p align="center">
  <img src="resources/brand/RetainPDF-github.svg" alt="PaperLoom" width="320" />
</p>

Reading papers often means switching between a PDF reader, a translation tool, Zotero, and your notes app. PaperLoom brings these steps together: import a paper, parse and translate it, check the translation alongside the original, ask the document AI questions, then save the results to Zotero or Obsidian.

PaperLoom is an independently released derivative of [RetainPDF](https://github.com/wxyhgk/retain-pdf) (MIT). Its data and ports are separate from upstream installations. Thank you to the original author for the PDF processing, translation, and typesetting foundation.

## Translation and typesetting

PaperLoom is currently the only open-source project built for layout-preserving translation of image-based and scanned PDFs, with translation and typesetting quality that matches or even surpasses comparable commercial products.

**PaperLoom is far ahead on inline formulas: after translation, it keeps the formulas themselves, their surrounding context, and their inline layout intact—something other open-source PDF translators do not currently achieve.**

| Project | Scanned PDFs | Complex inline formulas | Protect code from translation | Table control | Custom translation strategies | Layout preservation | PDF size optimization | API automation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PDFMathTranslate | ❌ | ❌ | ❌ | Limited | Limited | Average | Average | ✅ |
| PolyglotPDF | ❌ | ❌ | ❌ | Limited | Limited | Average | Average | ✅ |
| Doc2X | ✅ | ✅ | ❌ | Moderate | Limited | Strong | Limited | ❌ Not public |
| PaperLoom | ✅ | ✅ Strong preservation | ✅ | ✅ Toggleable | ✅ Configurable rules | Strong | ✅ Continuously improved | ✅ |

## What it does

- **Translate PDFs while keeping their layout.** Supports editable, image-based, and scanned PDFs, including multi-column text, images, tables, and complex formulas.
- **Keep your papers organized.** The library, collections, favorites, task center, and source/translation reader share one interface.
- **Ask questions about a document.** Summarize papers, understand methods, or explain formulas. Answers include document citations that take you to the original page. PDF Agent offers document operations that require explicit approval.
- **Import from Zotero and save translations back.** Batch import is supported. With Zotero 10+, save translated PDFs individually or in batches; repeating the operation updates the existing attachment.
- **Save to Obsidian.** Export Chinese translation notes, optional source notes, images, and translated PDFs individually or in batches, with bibliographic metadata, source links, and links between notes.
- **Configure it for your workflow.** Supports MinerU/Paddle OCR, model APIs, glossaries, custom translation strategies, code protection, table controls, PDF size optimization, and an open API. You can also self-host or extend it.

The translation pipeline first restores complete meaning across columns, pages, and broken sentences before sending text to the model. This reduces the loss of context caused by translating isolated boxes. Its font and typesetting algorithm restores formulas and multi-column paper layouts.

## See it in use

These screenshots show real papers from the user's Zotero library and PaperLoom interfaces, including MinerU VLM parsing, model translation, PDF generation, batch Zotero writeback, and batch Obsidian export. Expand the sections for more screenshots; click side-by-side images to view the originals. See the [screenshot record](resources/brand/readme-gallery/product/SCREENSHOT_SOURCES.md) for their sources.

### Library and task progress

Imported papers stay in your library. To see which stage a task has reached, open Progress in the document details and check OCR, translation, and rendering. Completed documents are ready to read.

![PaperLoom library with the completed Talebian, Pan, and Yang papers](resources/brand/readme-gallery/product/paperloom-library-real.png)

<details>
<summary>Show task progress, Zotero import, and downloadable files</summary>

Browse your Zotero library and collections in PaperLoom, select local PDF attachments, and optionally translate them immediately after import. Once processing finishes, the document details provide translated PDFs, comparison PDFs, layout-preserving Word files, and Obsidian note bundles.

<table>
  <tr><th>OCR, translation, and rendering progress</th><th>Import from Zotero</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-progress-real.png"><img src="resources/brand/readme-gallery/product/paperloom-progress-real.png" alt="OCR, translation, and rendering progress in PaperLoom document details" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-zotero-import-real.png"><img src="resources/brand/readme-gallery/product/paperloom-zotero-import-real.png" alt="Zotero import in the native PaperLoom desktop interface" /></a></td>
  </tr>
  <tr><th colspan="2">Output files and download controls</th></tr>
  <tr><td colspan="2"><a href="resources/brand/readme-gallery/product/paperloom-artifacts-real.png"><img src="resources/brand/readme-gallery/product/paperloom-artifacts-real.png" alt="Output files and download controls in PaperLoom document details" /></a></td></tr>
</table>

</details>

### Source and translation side by side

The English source and Chinese translation of the same page appear side by side, making it easier to check terminology, formulas, figures, tables, and citations. You can also view only the source or translation.

![Yang 2024: two-column source and Chinese translation in PaperLoom desktop](resources/brand/readme-gallery/product/paperloom-translation-real.png)

<details>
<summary>Show figures, captions, tables, and formulas</summary>

Figure and table pages can be compared directly too. Below are the composite figure and captions from Yang 2024, alongside text, a table, and formulas from Li 2026.

<table>
  <tr><th>Yang 2024: composite figure and captions</th><th>Li 2026: text, table, and formulas</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-figures-real.png"><img src="resources/brand/readme-gallery/product/paperloom-figures-real.png" alt="Yang 2024 composite figure with English and Chinese captions" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-table-translation-real.png"><img src="resources/brand/readme-gallery/product/paperloom-table-translation-real.png" alt="Li 2026 text, table, and formulas compared with the translation" /></a></td>
  </tr>
</table>

</details>

### PDF and Markdown together

Open the Markdown panel when you need to copy or search the text while reading the original PDF. Formulas and images appear with the text, and long documents load on demand.

<details>
<summary>Show the PDF and Markdown reading interface</summary>

![Talebian 2025 PDF and Markdown in the PaperLoom reader](resources/brand/readme-gallery/product/paperloom-markdown-real.png)

</details>

### Document AI

Ask questions such as “What methods does this paper use?” or “Which page contains this number?” The screenshot below shows questions about materials synthesis and characterization in Yang 2024. The AI organizes the synthesis steps and characterization methods with document citations. Citation previews show the page number, a page thumbnail, and an excerpt from the source.

![Materials-synthesis question about Yang 2024 in PaperLoom desktop](resources/brand/readme-gallery/product/paperloom-ai-real.png)

<details>
<summary>Show the characterization summary and citation preview</summary>

![AI characterization-method table and page-3 citation preview in PaperLoom desktop](resources/brand/readme-gallery/product/paperloom-ai-citations-real.png)

</details>

This answer reached the retrieval-step limit, and the screenshot retains the early-wrap-up notice. Check AI answers and OCR output against the source, especially experimental conditions, units, and table values.

### Obsidian: metadata and note contents

Exported notes include the title, authors, year, DOI, journal, Zotero links, and links to the PaperLoom document and task. Source and translation notes link to each other; the translated PDF and images are stored in a companion assets directory.

Complex tables retain HTML and merged cells. The optional HTML Table Math 0.1.2 plugin can render formulas inside these tables. Existing Zotero highlights, annotations, and child notes are also exported, with page numbers and links that locate annotations in Zotero.

<details>
<summary>Show Obsidian frontmatter, note contents, tables, and Zotero annotations</summary>

<table>
  <tr><th>Bibliographic metadata and frontmatter</th><th>Embedded PDF and Chinese text</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-frontmatter-real.png"><img src="resources/brand/readme-gallery/product/obsidian-frontmatter-real.png" alt="Talebian 2025 frontmatter in the Obsidian properties panel" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-text-real.png"><img src="resources/brand/readme-gallery/product/obsidian-text-real.png" alt="Yang 2024 note in Obsidian with embedded translated PDF, Chinese title, and text" /></a></td>
  </tr>
  <tr><th>Merged cells and table formulas</th><th>Zotero annotations and page links</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-body-real.png"><img src="resources/brand/readme-gallery/product/obsidian-body-real.png" alt="Obsidian note with captions, merged cells, and table formulas" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/obsidian-annotations-real.png"><img src="resources/brand/readme-gallery/product/obsidian-annotations-real.png" alt="Yang 2024 Zotero annotations, page-location links, and notes in Obsidian" /></a></td>
  </tr>
</table>

</details>

### Batch save to Zotero

Select several documents in the library and click Save to Zotero to see creation, update, and failure results for each paper. Repeating the operation updates existing attachments. The “PaperLoom Chinese translation” PDF can then be opened directly in Zotero.

<details>
<summary>Show batch results and the translated PDF in Zotero</summary>

<table>
  <tr><th>PaperLoom: 3 updated, 0 failed</th><th>Zotero: Pan 2024 Chinese translation</th></tr>
  <tr>
    <td width="50%"><a href="resources/brand/readme-gallery/product/paperloom-zotero-batch-real.png"><img src="resources/brand/readme-gallery/product/paperloom-zotero-batch-real.png" alt="Actual PaperLoom Zotero batch result: 3 updated, 0 failed" /></a></td>
    <td width="50%"><a href="resources/brand/readme-gallery/product/zotero-translated-pdf-real.png"><img src="resources/brand/readme-gallery/product/zotero-translated-pdf-real.png" alt="Pan 2024 PaperLoom Chinese translation attachment open in Zotero's PDF reader, page 1 of 13" /></a></td>
  </tr>
</table>

</details>

## Quick start

Visit [GitHub Releases](https://github.com/luffysolution-svg/paperloom/releases) to download PaperLoom. v0.1.3 provides a Windows x64 installer and portable package; macOS and Linux desktop packages will be listed on their release pages when available.

1. Open PaperLoom and enter your OCR-service and translation-model API credentials in Settings. You can use MinerU, PaddleOCR, and supported translation models.
2. Click Add PDF, or select local papers through Import from Zotero. Zotero PDF attachments must be downloaded to your computer first.
3. Start translation and follow its progress in the task center.
4. Once it finishes, read source and translation side by side to check text, formulas, figures, and tables. Open Markdown or document AI when needed.
5. Export files from the document details, or select multiple documents in the library to save to Obsidian or Zotero.

OCR and model APIs are provided by their respective services. Account quotas and fees are set by those providers.

If macOS reports that the app is damaged, move it to `/Applications` and run:

```bash
sudo xattr -r -d com.apple.quarantine /Applications/PaperLoom.app
```

### Docker deployment

```bash
git clone https://github.com/luffysolution-svg/paperloom.git
cd paperloom/ops/deployment/docker/delivery
python3 init-local.py
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Build PaperLoom from source with Docker Compose. You need Docker Compose, Python 3, and network access to dependency download sites; on Windows, use `python` instead of `python3`. The first build downloads Rust, Python, Node, and typesetting dependencies, so it takes longer than subsequent restarts. Open <http://127.0.0.1:45001> and configure your own OCR and model APIs in the application. After updating the source, run again:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

See the [Docker deployment guide](ops/deployment/docker/delivery/README.md) for configuration and mounts.

## Zotero and Obsidian

### Save translated PDFs back to Zotero 10

In Zotero, enable Settings → Advanced → Allow other applications on this computer to communicate with Zotero, and leave Zotero running. After importing a paper from Zotero and translating it, click Save to Zotero in its details. For a batch, select papers in the library and use the same button.

Zotero displays an authorization dialog on the first write. Choose Always allow for convenience. Allow once may prompt again during later upload stages. The translated PDF is saved as a child attachment named “PaperLoom Chinese translation” under the original paper; repeating the write updates that same attachment. Remembered authorization is stored locally. Clearing it in Zotero's advanced settings requires authorization again on the next write.

A batch accepts up to 200 papers and removes duplicate selections. One failure does not stop the rest. It selects the latest successful translation that actually has an available PDF. Non-Zotero documents, missing translated PDFs, and a stopped Zotero app each receive a corresponding error.

Writeback requires **Zotero 10+ and its local API on the same computer**. Zotero 9 and earlier support import only. Docker's mounted Zotero-data-directory mode remains read-only. PaperLoom does not write directly to `zotero.sqlite`. See the [Zotero and Obsidian integration guide](docs/ops/planning/zotero-obsidian-integration.md) for configuration details.

### Batch export to Obsidian

Select papers in the library, click Save to Obsidian, and choose a vault and folder. Each batch accepts up to 200 papers and reports written, conflicting, skipped, or failed results per paper. One failure does not stop the batch. You can include source notes; translated PDFs and images go into the assets directory.

On repeat export, PaperLoom updates its managed content blocks and keeps your writing outside those blocks. Choose rename or skip when you want to keep an existing file.

**Optional plugin for table formulas: HTML Table Math 0.1.2**. Search for `html-table-math` in Obsidian Community plugins, install it, and enable it. PaperLoom does not bundle or automatically install the plugin. Ordinary note text and export do not require it.

## Common questions

### MinerU and Windows system proxies

The desktop app reads the Windows HTTP proxy and passes it to parsing, translation, and result-download processes. Restart PaperLoom after changing the proxy; local services and Zotero keep direct connections. If your proxy app provides only a SOCKS port, enable an HTTP or mixed port as well.

MinerU upload, parsing, and result download are separate stages. If downloading fails, check the network message, DNS, and proxy first; do not disable HTTPS certificate validation. When DNS points the official CDN to a node with an expired certificate, PaperLoom refreshes hostname resolution and retries under specific conditions while keeping certificate validation enabled. Restart PaperLoom after changing proxy settings.

The API token is used only for MinerU API requests, never sent to the result CDN or object storage. See the latest [official MinerU documentation](https://mineru.net/apiManage/docs).

### MinerU or Paddle OCR?

MinerU and PaddleOCR are both supported, but their complex-table and image-cropping results can differ. Check important formulas, table values, and figure captions against the original PDF. Do not treat one sample set as a general ranking.

## Development and acknowledgments

To contribute, start with the [contribution guide](CONTRIBUTING.md), [project documentation](docs/README.md), and [backend guide](backend/README.md). Report security issues privately through the [security reporting instructions](SECURITY.md); avoid posting credentials or private papers in public issues.

Thank you again to the original author and contributors of [RetainPDF](https://github.com/wxyhgk/retain-pdf). PaperLoom continues that foundation with document reading, Zotero/Obsidian integration, and improvements to the desktop experience. Thanks also to the maintainers of MinerU, PaddleOCR, Typst, Zotero, Obsidian, and the related open-source dependencies.

## License

PaperLoom is released under the [GNU AGPL-3.0](LICENSE). Every official release also provides the complete [corresponding source](CORRESPONDING_SOURCE.md), including the PyMuPDF/MuPDF source matching the installers and app image. The RetainPDF foundation retains its original [MIT copyright and permission notice](LICENSE-MIT); other dependencies and assets remain under their respective licenses as documented in the [third-party notices](THIRD_PARTY_NOTICES.md).

## PaperLoom community

<table>
  <tr>
    <th width="50%"></th>
    <th width="50%">If the group QR code expires, please<br />add me on WeChat and I will invite you</th>
  </tr>
  <tr>
    <td align="center" valign="top"><img src="resources/brand/paperloom-community-qr.png" alt="PaperLoom community QR code" height="360" /></td>
    <td align="center" valign="top"><img src="resources/brand/paperloom-community-qr-backup.jpg" alt="PaperLoom personal WeChat QR code" height="360" /></td>
  </tr>
</table>
