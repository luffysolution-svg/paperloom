// 笔记命名、frontmatter 与正文组装。命名规则见
// docs/ops/planning/zotero-obsidian-integration.md「F4 导出到 Obsidian」。

use crate::db::external_refs::ExternalRefRecord;
use crate::models::api::DocumentRecord;
use crate::services::integrations::zotero::{self, ZoteroBibliography};

pub(super) const TRANSLATED_LANG: &str = "zh";

/// Windows 文件名非法字符 + Obsidian 链接敏感字符。
const FORBIDDEN: &[char] = &[
    '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '^', '[', ']',
];
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
    "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];
const MAX_NAME_CHARS: usize = 120;
const TITLE_STOPWORDS: &[&str] = &[
    "a", "an", "the", "on", "of", "in", "for", "to", "and", "with", "from", "by", "at", "via",
];

pub(super) struct NoteMeta {
    pub(super) title: String,
    pub(super) authors: Vec<String>,
    pub(super) year: Option<i64>,
    pub(super) doi: String,
    pub(super) document_id: Option<String>,
    pub(super) job_id: String,
    pub(super) source_lang: String,
    /// 回到 PaperLoom 阅读器的链接（见 paperloom_uri）。
    pub(super) paperloom_uri: String,
    pub(super) zotero: Option<ZoteroNoteMeta>,
}

/// 从 Zotero 导入的文档额外带的 frontmatter 字段。
pub(super) struct ZoteroNoteMeta {
    pub(super) item_key: String,
    pub(super) select_uri: String,
    pub(super) pdf_uri: String,
    pub(super) item_type: String,
    pub(super) publication: String,
    pub(super) url: String,
    pub(super) citekey: String,
    pub(super) tags: Vec<String>,
    /// 导入时所在分类「父/子」，不进 frontmatter，仅用于「按分类建子目录」。
    pub(super) collection_path: String,
}

impl NoteMeta {
    pub(super) fn from_document(
        document: Option<&DocumentRecord>,
        job_id: &str,
        ocr_language: &str,
        public_base_url: Option<&str>,
    ) -> Self {
        let title = document
            .map(|doc| doc.title.trim().to_string())
            .filter(|title| !title.is_empty())
            .or_else(|| document.map(|doc| file_stem(&doc.source_filename)))
            .filter(|title| !title.is_empty())
            .unwrap_or_else(|| job_id.to_string());
        Self {
            title,
            authors: document
                .map(|doc| parse_authors(&doc.authors_json))
                .unwrap_or_default(),
            year: document.and_then(|doc| doc.year),
            doi: document
                .map(|doc| doc.doi.trim().to_string())
                .unwrap_or_default(),
            document_id: document.map(|doc| doc.document_id.clone()),
            job_id: job_id.to_string(),
            source_lang: source_lang_suffix(ocr_language),
            paperloom_uri: paperloom_uri(
                public_base_url,
                job_id,
                document.map(|doc| doc.document_id.as_str()),
            ),
            zotero: None,
        }
    }

    /// 用 Zotero 条目覆盖书目信息（Zotero 里的元数据比 PDF 解析出来的可靠）。
    pub(super) fn with_zotero(mut self, external: &ExternalRefRecord) -> Self {
        let snapshot: serde_json::Value =
            serde_json::from_str(&external.metadata_json).unwrap_or_default();
        let bib = ZoteroBibliography::from_snapshot(&snapshot);
        if !bib.title.is_empty() {
            self.title = bib.title;
        }
        if !bib.authors.is_empty() {
            self.authors = bib.authors;
        }
        self.year = bib.year.or(self.year);
        if !bib.doi.is_empty() {
            self.doi = bib.doi;
        }
        self.zotero = Some(ZoteroNoteMeta {
            item_key: external.item_key.clone(),
            select_uri: zotero::select_uri(&external.library_id, &external.item_key),
            pdf_uri: zotero::open_pdf_uri(&external.library_id, &external.attachment_key),
            item_type: bib.item_type,
            publication: bib.publication,
            url: bib.url,
            citekey: bib.citekey,
            tags: bib.tags,
            collection_path: external.collection_path.clone(),
        });
        self
    }

    /// citekey → 作者姓+年份+标题首词 → 标题 → job id。
    pub(super) fn note_name(&self) -> String {
        if let Some(citekey) = self.zotero.as_ref().map(|z| sanitize_file_name(&z.citekey)) {
            if !citekey.is_empty() {
                return citekey;
            }
        }
        if let (Some(author), Some(year)) = (self.authors.first(), self.year) {
            let family = family_name(author);
            if !family.is_empty() {
                let word = first_title_word(&self.title);
                let name = sanitize_file_name(&format!("{family}{year}{word}"));
                if !name.is_empty() {
                    return name;
                }
            }
        }
        let name = sanitize_file_name(&self.title);
        if name.is_empty() {
            sanitize_file_name(&self.job_id)
        } else {
            name
        }
    }
}

/// Docker 部署配置了浏览器访问 PaperLoom 的地址（PAPERLOOM_PUBLIC_BASE_URL，如
/// http://localhost:45001）时回跳 Web 阅读器；否则用桌面端注册的 paperloom:// 协议。
fn paperloom_uri(public_base_url: Option<&str>, job_id: &str, document_id: Option<&str>) -> String {
    let encode =
        |value: &str| url::form_urlencoded::byte_serialize(value.as_bytes()).collect::<String>();
    match public_base_url {
        Some(base) => format!("{base}/reader.html?job_id={}", encode(job_id)),
        None => {
            let mut uri = format!("paperloom://open?job={}", encode(job_id));
            if let Some(document_id) = document_id {
                uri.push_str(&format!("&document={}", encode(document_id)));
            }
            uri
        }
    }
}

fn file_stem(file_name: &str) -> String {
    let name = file_name.trim();
    match name.rsplit_once('.') {
        Some((stem, ext)) if ext.eq_ignore_ascii_case("pdf") => stem.trim().to_string(),
        _ => name.to_string(),
    }
}

fn parse_authors(raw: &str) -> Vec<String> {
    let parsed: Vec<String> = serde_json::from_str::<Vec<serde_json::Value>>(raw)
        .map(|values| {
            values
                .iter()
                .filter_map(|value| value.as_str().map(str::trim).map(str::to_string))
                .filter(|value| !value.is_empty())
                .collect()
        })
        .unwrap_or_default();
    parsed
}

/// 「Smith, John」取逗号前；「John Smith」取最后一个词；中文名整体保留。
fn family_name(author: &str) -> String {
    let author = author.trim();
    let family = match author.split_once(',') {
        Some((family, _)) => family.trim(),
        None => author.split_whitespace().last().unwrap_or(author),
    };
    family.chars().filter(|c| c.is_alphanumeric()).collect()
}

fn first_title_word(title: &str) -> String {
    title
        .split(|c: char| !c.is_ascii_alphanumeric())
        .find(|word| {
            word.len() >= 3
                && word.chars().any(|c| c.is_ascii_alphabetic())
                && !TITLE_STOPWORDS.contains(&word.to_ascii_lowercase().as_str())
        })
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                Some(first) => {
                    first.to_ascii_uppercase().to_string() + &chars.as_str().to_ascii_lowercase()
                }
                None => String::new(),
            }
        })
        .unwrap_or_default()
}

pub(super) fn sanitize_file_name(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if FORBIDDEN.contains(&c) || c.is_control() {
                ' '
            } else {
                c
            }
        })
        .collect();
    let collapsed = cleaned.split_whitespace().collect::<Vec<_>>().join(" ");
    let truncated: String = collapsed.chars().take(MAX_NAME_CHARS).collect();
    let trimmed = truncated
        .trim_matches(|c: char| c == '.' || c.is_whitespace())
        .to_string();
    if RESERVED.contains(&trimmed.to_ascii_uppercase().as_str()) {
        format!("{trimmed}_")
    } else {
        trimmed
    }
}

/// OCR 语言码 → 原文笔记后缀；无法识别时用 orig。
fn source_lang_suffix(language: &str) -> String {
    let lang = language.trim().to_ascii_lowercase();
    let lang = match lang.as_str() {
        "ch" | "chinese" | "zh-cn" | "zh_cn" => "zh".to_string(),
        "english" => "en".to_string(),
        other => other.to_string(),
    };
    let valid = (2..=3).contains(&lang.len()) && lang.chars().all(|c| c.is_ascii_lowercase());
    if valid && lang != TRANSLATED_LANG {
        lang
    } else {
        "orig".to_string()
    }
}

pub(super) struct NoteNames {
    pub(super) base: String,
    pub(super) source_note: String,
    pub(super) assets_dir: String,
    pub(super) translated_pdf: String,
}

impl NoteNames {
    pub(super) fn new(base: String, source_lang: &str) -> Self {
        Self {
            source_note: format!("{base}.{source_lang}"),
            assets_dir: format!("{base}.assets"),
            translated_pdf: format!("{base}.{TRANSLATED_LANG}.pdf"),
            base,
        }
    }
}

fn yaml_str(value: &str) -> String {
    let escaped = value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', " ")
        .replace('\r', " ")
        .replace('\t', " ");
    format!("\"{escaped}\"")
}

fn yaml_list(values: &[String]) -> String {
    format!(
        "[{}]",
        values
            .iter()
            .map(|v| yaml_str(v))
            .collect::<Vec<_>>()
            .join(", ")
    )
}

fn common_frontmatter(meta: &NoteMeta, lines: &mut Vec<String>) {
    lines.push(format!("title: {}", yaml_str(&meta.title)));
    if !meta.authors.is_empty() {
        lines.push(format!("authors: {}", yaml_list(&meta.authors)));
    }
    if let Some(year) = meta.year {
        lines.push(format!("year: {year}"));
    }
    if !meta.doi.is_empty() {
        lines.push(format!("doi: {}", yaml_str(&meta.doi)));
    }
    if let Some(z) = &meta.zotero {
        let optional = [
            ("citekey", &z.citekey),
            ("item_type", &z.item_type),
            ("publication", &z.publication),
            ("url", &z.url),
        ];
        for (key, value) in optional {
            if !value.is_empty() {
                lines.push(format!("{key}: {}", yaml_str(value)));
            }
        }
        lines.push(format!("zotero_key: {}", yaml_str(&z.item_key)));
        lines.push(format!("zotero: {}", yaml_str(&z.select_uri)));
        lines.push(format!("zotero_pdf: {}", yaml_str(&z.pdf_uri)));
        if !z.tags.is_empty() {
            lines.push(format!("zotero_tags: {}", yaml_list(&z.tags)));
        }
    }
    if let Some(document_id) = &meta.document_id {
        lines.push(format!("paperloom_document: {}", yaml_str(document_id)));
    }
    lines.push(format!("paperloom_job: {}", yaml_str(&meta.job_id)));
    lines.push(format!("paperloom: {}", yaml_str(&meta.paperloom_uri)));
}

/// 正文里的跳转链接：属性面板里的 URI 不一定可点，正文链接在 Obsidian 里总能点开。
fn open_links(meta: &NoteMeta) -> String {
    let mut links = vec![format!("[在 PaperLoom 中打开]({})", meta.paperloom_uri)];
    if let Some(z) = &meta.zotero {
        links.push(format!("[在 Zotero 中查看]({})", z.select_uri));
    }
    links.join(" · ")
}

/// 受管区块：重新导出时只替换标记之间的内容，标记外的手写内容保留（M2）。
/// 标记用 Obsidian 注释 `%% … %%`，实时预览里也不显示（HTML 注释会显示）。
fn managed(section: &str, body: &str) -> String {
    format!(
        "%% paperloom:begin {section} %%\n{}\n%% paperloom:end {section} %%\n",
        body.trim_end()
    )
}

pub(super) fn translated_note(
    meta: &NoteMeta,
    names: &NoteNames,
    body: &str,
    has_source_note: bool,
    has_pdf: bool,
    zotero_section: Option<&str>,
) -> String {
    let mut fm = Vec::new();
    common_frontmatter(meta, &mut fm);
    fm.push(format!("language: {}", yaml_str(TRANSLATED_LANG)));
    fm.push(format!("paperloom_role: {}", yaml_str("translation")));
    if has_source_note {
        fm.push(format!(
            "source_note: {}",
            yaml_str(&format!("[[{}]]", names.source_note))
        ));
    }
    if has_pdf {
        fm.push(format!(
            "translated_pdf: {}",
            yaml_str(&format!("[[{}]]", names.translated_pdf))
        ));
    }
    fm.push("tags: [literature, paperloom]".to_string());

    let mut header = Vec::new();
    if has_source_note {
        header.push(format!("原文：[[{}]]", names.source_note));
    }
    header.push(open_links(meta));
    if has_pdf {
        header.push(format!("![[{}]]", names.translated_pdf));
    }
    let mut note = format!("---\n{}\n---\n\n", fm.join("\n"));
    note.push_str(&managed("links", &header.join("\n\n")));
    note.push('\n');
    note.push_str(&managed("body", body));
    if let Some(section) = zotero_section {
        note.push('\n');
        note.push_str(&managed("zotero", section));
    }
    note
}

pub(super) fn source_note(meta: &NoteMeta, names: &NoteNames, body: &str) -> String {
    let mut fm = Vec::new();
    common_frontmatter(meta, &mut fm);
    fm.push(format!("language: {}", yaml_str(&meta.source_lang)));
    fm.push(format!("paperloom_role: {}", yaml_str("source")));
    fm.push(format!(
        "translation: {}",
        yaml_str(&format!("[[{}]]", names.base))
    ));
    fm.push("tags: [paperloom]".to_string());
    let mut note = format!("---\n{}\n---\n\n", fm.join("\n"));
    note.push_str(&managed(
        "links",
        &format!("译文：[[{}]]\n\n{}", names.base, open_links(meta)),
    ));
    note.push('\n');
    note.push_str(&managed("body", body));
    note
}
