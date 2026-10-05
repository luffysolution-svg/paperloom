use std::path::{Path, PathBuf};

use serde_json::{json, Value};

use super::images::{ImageKind, ImagePlan};
use super::note::{sanitize_file_name, NoteMeta, NoteNames};
use super::render::tighten_inline_math;
use super::{build_notes, ExportInputs};

fn golden_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures/golden-jobs/chem-6ada81-10p")
}

fn load_json(path: &Path) -> Value {
    serde_json::from_str(&std::fs::read_to_string(path).expect("read fixture"))
        .expect("parse fixture")
}

fn golden_translation_pages() -> Vec<(i64, Vec<Value>)> {
    let translated = golden_root().join("translated");
    let manifest = load_json(&translated.join("translation-manifest.json"));
    manifest["pages"]
        .as_array()
        .expect("pages")
        .iter()
        .map(|page| {
            let items = load_json(&translated.join(page["path"].as_str().expect("path")));
            (
                page["page_index"].as_i64().unwrap_or_default(),
                items.as_array().cloned().unwrap_or_default(),
            )
        })
        .collect()
}

fn meta() -> NoteMeta {
    NoteMeta {
        title: "The Role of Conjugation".to_string(),
        authors: vec!["Smith, John".to_string()],
        year: Some(2023),
        doi: "10.1002/chem.202301439".to_string(),
        document_id: Some("doc-1".to_string()),
        job_id: "job-1".to_string(),
        source_lang: "en".to_string(),
        paperloom_uri: "paperloom://open?job=job-1&document=doc-1".to_string(),
        zotero: None,
    }
}

fn item_field(pages: &[(i64, Vec<Value>)], item_id: &str, field: &str) -> String {
    pages
        .iter()
        .flat_map(|(_, items)| items)
        .find(|item| item["item_id"] == item_id)
        .and_then(|item| item[field].as_str())
        .expect("item")
        .trim()
        .to_string()
}

fn names_for(meta: &NoteMeta) -> NoteNames {
    NoteNames::new(meta.note_name(), &meta.source_lang)
}

fn translated_of(pages: &[(i64, Vec<Value>)], item_id: &str) -> String {
    item_field(pages, item_id, "translated_text")
}

#[test]
fn golden_job_export_keeps_paragraphs_whole_and_drops_page_noise() {
    let normalized = load_json(&golden_root().join("ocr/normalized/document.v1.json"));
    let pages = golden_translation_pages();
    let meta = meta();
    let notes = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &pages,
            full_markdown: None,
            images_dir: None,
            meta: &meta,
            has_pdf: true,
            include_source: true,
            zotero_extras: None,
        },
        names_for(&meta),
    );

    assert_eq!(notes.names.base, "Smith2023Role");
    let translated = &notes.translated;
    // 跨栏翻译单元 p001-b008 + p001-b009 作为一整段输出一次，不在句中断开。
    let unit = item_field(&pages, "p001-b008", "translation_unit_translated_text");
    assert_eq!(translated.matches(&unit).count(), 1);
    for member in ["p001-b008", "p001-b009"] {
        let text = translated_of(&pages, member);
        assert_eq!(
            translated.matches(&text).count(),
            1,
            "member {member} must appear once"
        );
    }
    // 跨页单元 cg-002-002 的 member_ids 只列本页成员（p002 两块、p003 两块），
    // 仍须只输出一次。推广到全部多成员单元。
    let mut units = std::collections::HashMap::<&str, (usize, &str)>::new();
    for item in pages.iter().flat_map(|(_, items)| items) {
        if let (Some(id), Some(text)) = (
            item["translation_unit_id"].as_str(),
            item["translation_unit_translated_text"].as_str(),
        ) {
            units.entry(id).or_insert((0, text)).0 += 1;
        }
    }
    let multi: Vec<_> = units.values().filter(|(count, _)| *count > 1).collect();
    assert!(multi.len() >= 2);
    for (_, text) in multi {
        assert_eq!(
            translated
                .matches(&tighten_inline_math(text.trim()))
                .count(),
            1,
            "unit duplicated: {text:.40}"
        );
    }
    // 所有已译条目的译文都在。
    let translated_items: Vec<_> = pages
        .iter()
        .flat_map(|(_, items)| items)
        .filter(|item| item["final_status"] == "translated")
        .collect();
    assert_eq!(translated_items.len(), 86);
    for item in translated_items {
        let text = item["translated_text"].as_str().unwrap_or("").trim();
        assert!(
            translated.contains(&tighten_inline_math(text)),
            "missing translation of {}",
            item["item_id"]
        );
    }
    // kept_origin 退回原文。
    assert!(translated.contains("400 MHz"));
    // 页眉/页脚与未翻译的元数据（网址、下载声明、版权）不进译文笔记；参考文献保留。
    assert!(!translated.contains("Chemistry—A European Journal"));
    assert!(!translated.contains("(1 of 10)"));
    assert!(!translated.contains("www.chemeurj.org"));
    assert!(!translated.contains("Downloaded from"));
    // 注：「© 2023 The Authors」仍会出现——p003-b0016 被 OCR 误判为正文并参与了翻译，
    // 导出忠实于上游分类，不在这里按文本猜测过滤。
    assert!(translated.contains("[2] L. C. Campeau, N. Hazari, Organometallics 2019"));
    // 表格 HTML 原样保留，标题用 #。
    assert!(translated.contains("<table>"));
    assert!(translated.contains("\n# "));

    assert!(translated.starts_with("---\ntitle: \"The Role of Conjugation\"\n"));
    assert!(translated.contains("authors: [\"Smith, John\"]\nyear: 2023\n"));
    assert!(translated.contains("paperloom_role: \"translation\""));
    assert!(translated.contains("source_note: \"[[Smith2023Role.en]]\""));
    assert!(translated.contains("translated_pdf: \"[[Smith2023Role.zh.pdf]]\""));
    assert!(translated.contains("![[Smith2023Role.zh.pdf]]"));
    assert!(translated.contains("%% paperloom:begin body %%"));
    assert!(translated.trim_end().ends_with("%% paperloom:end body %%"));

    // 无 full.md 时原文笔记由 document.v1 渲染，内容是原文。
    let source = notes.source.as_deref().expect("source note");
    assert!(source.contains("paperloom_role: \"source\""));
    assert!(source.contains("translation: \"[[Smith2023Role]]\""));
    assert!(source.contains("Abstract: The first case of successful"));
    assert!(
        source.contains("www.chemeurj.org"),
        "source note keeps metadata"
    );
    assert!(!source.contains(&translated_of(&pages, "p001-b008")));
    assert!(notes.images.is_empty(), "golden fixture has no image files");
}

#[test]
fn include_source_false_omits_source_note_and_its_links() {
    let normalized = load_json(&golden_root().join("ocr/normalized/document.v1.json"));
    let pages = golden_translation_pages();
    let meta = meta();
    let notes = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &pages,
            full_markdown: None,
            images_dir: None,
            meta: &meta,
            has_pdf: false,
            include_source: false,
            zotero_extras: None,
        },
        names_for(&meta),
    );
    assert!(notes.source.is_none());
    assert!(!notes.translated.contains("source_note"));
    assert!(!notes.translated.contains("translated_pdf"));
    // 链接区只剩回跳链接，没有原文笔记链接。
    assert!(!notes.translated.contains("原文：[["));
    assert!(notes.translated.contains(
        "%% paperloom:begin links %%\n[在 PaperLoom 中打开](paperloom://open?job=job-1&document=doc-1)\n%% paperloom:end links %%"
    ));
    assert!(notes
        .translated
        .contains("paperloom: \"paperloom://open?job=job-1&document=doc-1\""));
    assert!(!notes.translated.contains("paperloom:begin zotero"));
}

struct TempDir(PathBuf);

impl TempDir {
    fn new(label: &str) -> Self {
        let path = std::env::temp_dir().join(format!(
            "paperloom-md-export-{label}-{:016x}",
            fastrand::u64(..)
        ));
        std::fs::create_dir_all(&path).expect("create temp dir");
        Self(path)
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

fn write(path: &Path) {
    std::fs::create_dir_all(path.parent().expect("parent")).expect("mkdir");
    std::fs::write(path, b"img").expect("write image");
}

fn block(id: &str, order: i64, content: Value) -> Value {
    json!({ "block_id": id, "order": order, "reading_order": order, "content": content })
}

#[test]
fn images_are_numbered_by_first_appearance_and_shared_by_both_notes() {
    let tmp = TempDir::new("images");
    let images = tmp.0.join("images");
    write(&images.join("page-1/fig a.png"));
    write(&images.join("page-2/table.JPG"));
    write(&images.join("hash123.jpeg"));
    write(&images.join("only-in-full.png"));

    let normalized = json!({
        "assets": {
            "a1": { "uri": "md/images/page-1/fig a.png" },
            "t1": { "uri": "table.JPG" },
            "m1": { "uri": "images/hash123.jpeg" }
        },
        "pages": [
            { "page_index": 0, "blocks": [
                block("p001-b0001", 1, json!({ "kind": "text", "text": "Intro" })),
                block("p001-b0002", 2, json!({ "kind": "image", "asset_id": "a1" })),
            ]},
            { "page_index": 1, "blocks": [
                // 无 HTML 的表格只剩图片 → tab 前缀；uri 不带 page-N 时按页补全。
                block("p002-b0001", 1, json!({ "kind": "table", "asset_id": "t1" })),
                // MinerU 风格：图片在 images/ 根目录。
                block("p002-b0002", 2, json!({ "kind": "image", "asset_ids": ["m1", "a1"] })),
            ]}
        ]
    });
    let full_markdown = concat!(
        "Intro\n\n![x](images/page-1/fig%20a.png)\n\n",
        "<img src=\"images/only-in-full.png\">\n\n![t](images/page-2/table.JPG)\n",
    );
    let pages = vec![(
        0,
        vec![json!({ "item_id": "p001-b001", "translated_text": "引言" })],
    )];
    let mut meta = meta();
    meta.authors.clear();
    meta.title = "Deep (Learning) Notes".to_string();
    let notes = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &pages,
            full_markdown: Some(full_markdown),
            images_dir: Some(&images),
            meta: &meta,
            has_pdf: false,
            include_source: true,
            zotero_extras: None,
        },
        names_for(&meta),
    );

    let names: Vec<_> = notes
        .images
        .iter()
        .map(|image| (image.source_rel.as_str(), image.file_name.as_str()))
        .collect();
    assert_eq!(
        names,
        vec![
            ("page-1/fig a.png", "fig-001-p01.png"),
            ("page-2/table.JPG", "tab-001-p02.jpg"),
            ("hash123.jpeg", "fig-002-p02.jpeg"),
            ("only-in-full.png", "fig-003.png"),
        ]
    );
    let dir = "Deep%20%28Learning%29%20Notes.assets";
    assert!(notes.translated.contains("引言"));
    assert!(notes
        .translated
        .contains(&format!("![Image]({dir}/fig-001-p01.png)")));
    assert!(notes
        .translated
        .contains(&format!("![Image]({dir}/tab-001-p02.jpg)")));
    // 同一图片在 p002-b0002 再次引用，复用同一文件名。
    assert_eq!(notes.translated.matches("fig-001-p01.png").count(), 2);

    let source = notes.source.as_deref().expect("source note");
    assert!(source.contains(&format!("![x]({dir}/fig-001-p01.png)")));
    assert!(source.contains(&format!("<img src=\"{dir}/fig-003.png\">")));
    assert!(source.contains(&format!("![t]({dir}/tab-001-p02.jpg)")));
    assert!(!source.contains("images/"));
}

#[test]
fn image_block_uses_primary_asset_over_paddle_sub_crops() {
    let tmp = TempDir::new("primary-asset");
    let images = tmp.0.join("images");
    for name in [
        "page-3/imgs/whole.jpg",
        "page-3/imgs/panel-a.jpg",
        "page-3/imgs/chart.jpg",
        "page-3/imgs/logo.jpg",
    ] {
        write(&images.join(name));
    }
    // 页脚的期刊 logo：角色是 unknown，只有原始版面标签是 footer_image。
    let mut logo = block(
        "p003-b0003",
        3,
        json!({ "kind": "image", "asset_id": "page-3/imgs/logo.jpg" }),
    );
    logo["source"] = json!({ "provider": "paddle", "raw_type": "footer_image" });
    // PaddleOCR-VL：整图块的 asset_ids 里混有子图裁切和下一个块的主图。
    let normalized = json!({
        "assets": {},
        "pages": [{ "page_index": 2, "blocks": [
            block("p003-b0001", 1, json!({
                "kind": "image",
                "asset_id": "page-3/imgs/whole.jpg",
                "asset_ids": ["page-3/imgs/whole.jpg", "page-3/imgs/panel-a.jpg", "page-3/imgs/chart.jpg"],
            })),
            block("p003-b0002", 2, json!({
                "kind": "image",
                "asset_id": "page-3/imgs/chart.jpg",
                "asset_ids": ["page-3/imgs/chart.jpg"],
            })),
            logo,
        ]}]
    });
    let meta = self::meta();
    let notes = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &[],
            full_markdown: None,
            images_dir: Some(&images),
            meta: &meta,
            has_pdf: false,
            include_source: false,
            zotero_extras: None,
        },
        names_for(&meta),
    );

    let sources: Vec<_> = notes
        .images
        .iter()
        .map(|image| image.source_rel.as_str())
        .collect();
    assert_eq!(
        sources,
        vec!["page-3/imgs/whole.jpg", "page-3/imgs/chart.jpg"]
    );
    assert_eq!(notes.translated.matches("![").count(), 2);
}

#[test]
fn paddle_inline_math_padding_is_trimmed_for_obsidian() {
    // PaddleOCR-VL 的行内公式两侧带空格（`$ V_{Ni} $`），Obsidian 不认作公式。
    let normalized = json!({
        "assets": {},
        "pages": [{ "page_index": 0, "blocks": [
            block("p001-b0001", 1, json!({
                "kind": "text",
                "text": "Ni/NiO $ _x $@C 与 $ V_{\\mathrm{Ni}} $ 位点；$$ E = mc^2 $$",
            })),
            block("p001-b0002", 2, json!({
                "kind": "text",
                "text": "It costs $5 and $10, or \\$ 3 \\$; $x$ stays.",
            })),
            block("p001-b0003", 3, json!({
                "kind": "table",
                "table_html": "<table><tr><td>$ H_{{2}} $ evolution</td></tr></table>",
            })),
        ]}]
    });
    let meta = self::meta();
    let notes = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &[],
            // 原文笔记直接取 OCR 自带的 full.md，同样要收紧。
            full_markdown: Some("Ni/NiO $ _x $@C 原文"),
            images_dir: None,
            meta: &meta,
            has_pdf: false,
            include_source: true,
            zotero_extras: None,
        },
        names_for(&meta),
    );

    assert!(notes
        .source
        .as_deref()
        .expect("source note")
        .contains("Ni/NiO $_x$@C"));
    assert!(notes
        .translated
        .contains("Ni/NiO $_x$@C 与 $V_{\\mathrm{Ni}}$ 位点；$$ E = mc^2 $$"));
    assert!(notes
        .translated
        .contains("It costs $5 and $10, or \\$ 3 \\$; $x$ stays."));
    assert!(notes.translated.contains("<td>$H_{{2}}$ evolution</td>"));
}

#[test]
fn mineru_table_equation_tags_render_as_obsidian_math_without_changing_captions() {
    let table = "<table><tr><td rowspan=\"2\"><eq>CO_{2}</eq> reduction</td><td><eq>150.9 \\mu mol \\ g^{-1} \\ h^{-1}</eq></td></tr><tr><td colspan=\"2\"><eq> H_{2} </eq></td></tr></table>";
    let caption = "Fig. 8. <eq>caption-marker</eq> remains unchanged.";
    let normalized = json!({"assets":{},"pages":[{"page_index":0,"blocks":[
        block("p001-b0001",1,json!({"kind":"table","table_html":table})),
        block("p001-b0002",2,json!({"kind":"text","text":caption})),
    ]}]});
    let meta = self::meta();
    let source = format!("{table}\n\n{caption}");
    let notes = build_notes(&ExportInputs {
        normalized:&normalized, translation_pages:&[], full_markdown:Some(&source),
        images_dir:None, meta:&meta, has_pdf:false, include_source:true, zotero_extras:None,
    }, names_for(&meta));
    for note in [&notes.translated, notes.source.as_ref().unwrap()] {
        assert!(note.contains("<td rowspan=\"2\">$CO_{2}$ reduction</td>"));
        assert!(note.contains("$150.9 \\mu mol \\ g^{-1} \\ h^{-1}$"));
        assert!(note.contains("<td colspan=\"2\">$H_{2}$</td>"));
        assert!(note.contains(caption));
    }
}

#[test]
fn missing_image_links_are_left_untouched() {
    let mut plan = ImagePlan::default();
    let content = "![a](images/missing.png)";
    let out = super::images::rewrite_image_links(content, &mut plan, "N.assets", &|_| false);
    assert_eq!(out, content);
    assert!(plan.entries().is_empty());
    assert_eq!(
        plan.register("x/y.webp", ImageKind::Equation, Some(12)),
        "eq-001-p12.webp"
    );
}

#[test]
fn note_names_follow_fallback_chain_and_are_file_system_safe() {
    let mut meta = meta();
    meta.title = "On the Attention: A [Study]".to_string();
    meta.authors = vec!["Ashish Vaswani".to_string()];
    meta.year = Some(2017);
    assert_eq!(meta.note_name(), "Vaswani2017Attention");

    meta.year = None;
    assert_eq!(meta.note_name(), "On the Attention A Study");

    meta.title = "  注意力机制 #研究?  ".to_string();
    assert_eq!(meta.note_name(), "注意力机制 研究");

    meta.title = "???".to_string();
    assert_eq!(meta.note_name(), "job-1");

    assert_eq!(sanitize_file_name("con"), "con_");
    assert_eq!(sanitize_file_name("a/b\\c:d*e|f^g"), "a b c d e f g");
    assert_eq!(sanitize_file_name("...name..."), "name");
    assert_eq!(sanitize_file_name(&"x".repeat(300)).chars().count(), 120);
}

#[test]
fn source_language_suffix_is_normalized() {
    let suffix = |lang: &str| NoteMeta::from_document(None, "job", lang, None).source_lang;
    assert_eq!(suffix("en"), "en");
    assert_eq!(suffix("English"), "en");
    assert_eq!(suffix("ch"), "orig");
    assert_eq!(suffix(""), "orig");
    assert_eq!(suffix("japan"), "orig");
    assert_eq!(suffix("ja"), "ja");
}

#[test]
fn public_base_url_switches_open_link_to_web_reader() {
    let uri = |base: Option<&str>| NoteMeta::from_document(None, "job 1", "en", base).paperloom_uri;
    assert_eq!(uri(None), "paperloom://open?job=job+1");
    assert_eq!(
        uri(Some("http://localhost:45001")),
        "http://localhost:45001/reader.html?job_id=job+1"
    );
}

// ---- 写入 Obsidian 库 ----

use super::vault::{
    is_generated_asset, merge_note, normalize_vault_folder, write_to_vault, ConflictPolicy,
    VaultWriteStatus,
};
use super::ExportSource;

fn golden_source(document_id: Option<&str>, pdf: Option<PathBuf>) -> ExportSource {
    let mut input = crate::models::CreateJobInput::default();
    input.runtime.job_id = "job-1".to_string();
    let job = crate::models::JobSnapshot::new("job-1".to_string(), input, vec![]);
    let mut meta = meta();
    meta.document_id = document_id.map(str::to_string);
    ExportSource {
        job,
        normalized: load_json(&golden_root().join("ocr/normalized/document.v1.json")),
        translation_pages: golden_translation_pages(),
        full_markdown: Some("# Source\n\nOriginal body.\n".to_string()),
        images_dir: None,
        pdf,
        meta,
        zotero_extras: super::ZoteroExtrasState::NotLinked,
    }
}

fn vault(label: &str) -> TempDir {
    let tmp = TempDir::new(label);
    std::fs::create_dir_all(tmp.0.join(".obsidian")).expect("vault");
    tmp
}

fn read(path: &Path) -> String {
    std::fs::read_to_string(path).expect("read note")
}

#[test]
fn vault_export_creates_then_updates_preserving_user_content() {
    let vault = vault("update");
    let pdf = vault
        .0
        .join("..")
        .join(format!("pl-pdf-{:x}.pdf", fastrand::u64(..)));
    std::fs::write(&pdf, b"%PDF").expect("pdf");
    let source = golden_source(Some("doc-1"), Some(pdf.clone()));

    let first =
        write_to_vault(&source, &vault.0, "Lit/Chem", true, ConflictPolicy::Ask).expect("create");
    assert_eq!(first.status, VaultWriteStatus::Created);
    assert_eq!(first.note_path, "Lit/Chem/Smith2023Role.md");
    assert_eq!(
        first.source_note_path.as_deref(),
        Some("Lit/Chem/Smith2023Role.en.md")
    );
    let dir = vault.0.join("Lit/Chem");
    assert!(dir
        .join("Smith2023Role.assets/Smith2023Role.zh.pdf")
        .is_file());

    // 用户在受管区块外写笔记、加自己的 frontmatter 键与 tags。
    let note_path = dir.join("Smith2023Role.md");
    let edited = read(&note_path)
        .replace("tags: [literature, paperloom]", "tags: [mine]\nrating: 5")
        .replace(
            "%% paperloom:begin body %%",
            "## 我的笔记\n\n很重要。\n\n%% paperloom:begin body %%",
        )
        .replace("# 共轭在", "# 被改掉的标题 共轭在");
    std::fs::write(&note_path, edited).expect("edit");

    let second =
        write_to_vault(&source, &vault.0, "Lit/Chem", true, ConflictPolicy::Ask).expect("update");
    assert_eq!(second.status, VaultWriteStatus::Updated);
    let note = read(&note_path);
    assert!(
        note.contains("## 我的笔记\n\n很重要。"),
        "user text outside markers kept"
    );
    assert!(note.contains("rating: 5"));
    assert!(note.contains("tags: [mine]"));
    assert!(!note.contains("tags: [literature, paperloom]"));
    assert!(!note.contains("被改掉的标题"), "managed body replaced");
    assert_eq!(note.matches("paperloom_document: \"doc-1\"").count(), 1);
    assert_eq!(note.matches("%% paperloom:begin body %%").count(), 1);
    // 第二次资源未变，不重写。
    assert_eq!(second.files_written, 2);
    let _ = std::fs::remove_file(pdf);
}

#[test]
fn vault_export_handles_foreign_note_by_policy() {
    let vault = vault("conflict");
    let source = golden_source(Some("doc-1"), None);
    let foreign = vault.0.join("Smith2023Role.md");
    std::fs::write(&foreign, "---\ntitle: mine\n---\n\nhands off\n").expect("foreign");

    let ask = write_to_vault(&source, &vault.0, "", true, ConflictPolicy::Ask).expect("ask");
    assert_eq!(ask.status, VaultWriteStatus::Conflict);
    assert_eq!(ask.files_written, 0);
    assert_eq!(read(&foreign), "---\ntitle: mine\n---\n\nhands off\n");

    let skip = write_to_vault(&source, &vault.0, "", true, ConflictPolicy::Skip).expect("skip");
    assert_eq!(skip.status, VaultWriteStatus::Skipped);

    let renamed =
        write_to_vault(&source, &vault.0, "", true, ConflictPolicy::Rename).expect("rename");
    assert_eq!(renamed.status, VaultWriteStatus::Created);
    assert_eq!(renamed.note_path, "Smith2023Role-2.md");
    let note = read(&vault.0.join("Smith2023Role-2.md"));
    assert!(note.contains("source_note: \"[[Smith2023Role-2.en]]\""));
    assert_eq!(read(&foreign), "---\ntitle: mine\n---\n\nhands off\n");
    // 之后即使默认的 ask 也直接更新之前另存的 -2，不再重复询问。
    let again = write_to_vault(&source, &vault.0, "", true, ConflictPolicy::Ask).expect("again");
    assert_eq!(
        (again.status, again.note_path.as_str()),
        (VaultWriteStatus::Updated, "Smith2023Role-2.md")
    );

    let overwrite =
        write_to_vault(&source, &vault.0, "", true, ConflictPolicy::Overwrite).expect("overwrite");
    assert_eq!(overwrite.status, VaultWriteStatus::Created);
    assert!(read(&foreign).contains("paperloom_document: \"doc-1\""));
}

#[test]
fn vault_export_treats_note_without_markers_as_conflict() {
    let vault = vault("markers");
    let source = golden_source(None, None);
    write_to_vault(&source, &vault.0, "", false, ConflictPolicy::Ask).expect("create");
    let path = vault.0.join("Smith2023Role.md");
    let stripped = read(&path)
        .replace("%% paperloom:begin body %%", "")
        .replace("%% paperloom:end body %%", "");
    std::fs::write(&path, stripped).expect("strip");
    let outcome =
        write_to_vault(&source, &vault.0, "", false, ConflictPolicy::Ask).expect("export");
    assert_eq!(outcome.status, VaultWriteStatus::Conflict);
}

#[test]
fn vault_export_prunes_only_generated_assets() {
    let vault = vault("prune");
    let source = golden_source(Some("doc-1"), None);
    let assets = vault.0.join("Smith2023Role.assets");
    std::fs::create_dir_all(&assets).expect("assets");
    for name in [
        "fig-099-p01.png",
        "tab-001.jpg",
        "Smith2023Role.zh.pdf",
        "my-sketch.png",
    ] {
        std::fs::write(assets.join(name), b"x").expect("asset");
    }
    let outcome = write_to_vault(&source, &vault.0, "", true, ConflictPolicy::Ask).expect("export");
    assert_eq!(outcome.assets_removed, 3);
    assert!(assets.join("my-sketch.png").is_file());
    assert!(!assets.join("fig-099-p01.png").exists());
}

#[test]
fn vault_folder_is_validated() {
    assert_eq!(normalize_vault_folder("").expect("root"), "");
    assert_eq!(
        normalize_vault_folder(" Lit\\Chem/ ").expect("nested"),
        "Lit/Chem"
    );
    assert_eq!(
        normalize_vault_folder("文献/化学").expect("cjk"),
        "文献/化学"
    );
    for bad in ["../x", "a/../b", ".obsidian", "a/.hidden", "a:b", "x#y"] {
        assert!(
            normalize_vault_folder(bad).is_err(),
            "{bad} must be rejected"
        );
    }
}

#[test]
fn generated_asset_pattern() {
    for name in ["fig-001-p03.png", "tab-012.jpg", "eq-100-p120.webp"] {
        assert!(is_generated_asset(name), "{name}");
    }
    for name in [
        "fig-1.png",
        "figure-001.png",
        "fig-001-x3.png",
        "fig-001-p03-copy.png",
        "notes.md",
    ] {
        assert!(!is_generated_asset(name), "{name}");
    }
}

#[test]
fn merge_drops_sections_no_longer_exported() {
    // 旧笔记用的是 HTML 注释标记，合并后换成新标记。
    let old = "---\ntitle: \"a\"\nmine: 1\n---\n\n<!-- paperloom:begin links -->\n原文：[[x.en]]\n<!-- paperloom:end links -->\n\n<!-- paperloom:begin body -->\nold\n<!-- paperloom:end body -->\n\nafter\n";
    let new =
        "---\ntitle: \"b\"\n---\n\n%% paperloom:begin body %%\nnew\n%% paperloom:end body %%\n";
    let merged = merge_note(old, new, &[]).expect("merge");
    assert_eq!(
        merged,
        "---\ntitle: \"b\"\nmine: 1\n---\n\n%% paperloom:begin body %%\nnew\n%% paperloom:end body %%\n\nafter\n"
    );
    assert!(merge_note("no markers", new, &[]).is_none());
}

fn zotero_ref(citation_key: &str) -> crate::db::external_refs::ExternalRefRecord {
    crate::db::external_refs::ExternalRefRecord {
        source: "zotero".into(),
        library_id: "users/0".into(),
        item_key: "RUYDFIVJ".into(),
        attachment_key: "E2T3LH8Y".into(),
        document_id: "doc-1".into(),
        metadata_json: json!({
            "data": {
                "title": "Constructing redox-active sites",
                "itemType": "journalArticle",
                "DOI": "10.1016/j.jechem.2026.08.002",
                "publicationTitle": "Journal of Energy Chemistry",
                "citationKey": citation_key,
                "creators": [{"firstName": "Xingming", "lastName": "Chai", "creatorType": "author"}],
                "tags": [{"tag": "光催化"}]
            },
            "parsed_date": "2026-11"
        })
        .to_string(),
        collection_path: "能源/光催化".into(),
        created_at: String::new(),
        updated_at: String::new(),
    }
}

#[test]
fn zotero_metadata_overrides_bibliography_and_adds_links() {
    let meta = meta().with_zotero(&zotero_ref(""));
    assert_eq!(meta.title, "Constructing redox-active sites");
    assert_eq!(meta.year, Some(2026));
    assert_eq!(meta.note_name(), "Chai2026Constructing");
    let pages = golden_translation_pages();
    let normalized = load_json(&golden_root().join("ocr/normalized/document.v1.json"));
    let exported = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &pages,
            full_markdown: None,
            images_dir: None,
            meta: &meta,
            has_pdf: false,
            include_source: true,
            zotero_extras: None,
        },
        names_for(&meta),
    );
    for note in [&exported.translated, exported.source.as_ref().unwrap()] {
        assert!(note.contains("authors: [\"Chai, Xingming\"]"), "{note}");
        assert!(note.contains("doi: \"10.1016/j.jechem.2026.08.002\""));
        assert!(note.contains("publication: \"Journal of Energy Chemistry\""));
        assert!(note.contains("zotero: \"zotero://select/library/items/RUYDFIVJ\""));
        assert!(note.contains("zotero_pdf: \"zotero://open-pdf/library/items/E2T3LH8Y\""));
        assert!(note.contains("zotero_tags: [\"光催化\"]"));
        assert!(!note.contains("citekey:"));
    }

    let with_key = self::meta().with_zotero(&zotero_ref("chai2026constructing"));
    assert_eq!(with_key.note_name(), "chai2026constructing");
}

#[test]
fn zotero_annotations_go_to_the_end_of_the_translated_note_only() {
    use crate::services::integrations::zotero::{ZoteroAnnotation, ZoteroExtras};
    let meta = meta().with_zotero(&zotero_ref(""));
    let pages = golden_translation_pages();
    let normalized = load_json(&golden_root().join("ocr/normalized/document.v1.json"));
    let extras = ZoteroExtras {
        annotations: vec![ZoteroAnnotation {
            key: "ANNOT001".into(),
            kind: "highlight".into(),
            text: "key sentence".into(),
            page_index: Some(0),
            ..Default::default()
        }],
        notes: Vec::new(),
    };
    let exported = build_notes(
        &ExportInputs {
            normalized: &normalized,
            translation_pages: &pages,
            full_markdown: None,
            images_dir: None,
            meta: &meta,
            has_pdf: false,
            include_source: true,
            zotero_extras: Some(&extras),
        },
        names_for(&meta),
    );
    let translated = &exported.translated;
    let body_end = translated.find("%% paperloom:end body %%").unwrap();
    let section = translated
        .find("%% paperloom:begin zotero %%")
        .expect("zotero section");
    assert!(section > body_end);
    assert!(
        translated.contains("zotero://open-pdf/library/items/E2T3LH8Y?page=1&annotation=ANNOT001")
    );
    assert!(translated.contains("[在 Zotero 中查看](zotero://select/library/items/RUYDFIVJ)"));
    let source = exported.source.as_deref().unwrap();
    assert!(!source.contains("paperloom:begin zotero"));
    assert!(source.contains(
        "[在 PaperLoom 中打开](paperloom://open?job=job-1&document=doc-1) · [在 Zotero 中查看]"
    ));
}

#[test]
fn merge_places_new_zotero_section_after_body_and_keeps_it_when_unavailable() {
    let body = "%% paperloom:begin body %%
body
%% paperloom:end body %%";
    let zotero = |text: &str| {
        format!(
            "%% paperloom:begin zotero %%
{text}
%% paperloom:end zotero %%"
        )
    };
    let old = format!(
        "---
title: \"a\"
---

{body}

my notes
"
    );
    let new = format!(
        "---
title: \"a\"
---

{body}

{}
",
        zotero("hl 1")
    );
    let first = merge_note(&old, &new, &[]).expect("merge");
    assert!(
        first.contains(&format!(
            "{body}

{}

my notes",
            zotero("hl 1")
        )),
        "{first}"
    );

    let without = format!(
        "---
title: \"a\"
---

{body}
"
    );
    let kept = merge_note(&first, &without, &["zotero"]).expect("keep");
    assert!(kept.contains(&zotero("hl 1")));
    let dropped = merge_note(&first, &without, &[]).expect("drop");
    assert!(!dropped.contains("paperloom:begin zotero"));
    assert!(dropped.contains("my notes"));
}

#[test]
fn collection_subfolder_is_sanitized() {
    assert_eq!(
        super::folder_with_collection("PaperLoom", "能源/光催化"),
        "PaperLoom/能源/光催化"
    );
    assert_eq!(super::folder_with_collection("", "A: B/..//C?"), "A B/C");
    assert_eq!(super::folder_with_collection("Lit", ""), "Lit");
}
