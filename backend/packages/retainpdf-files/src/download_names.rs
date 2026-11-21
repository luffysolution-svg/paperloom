//! 用户下载的文件名：`类型前缀_书名_后缀.扩展名`，所有入口一个规则。
//!
//! 以前同一本书的几个文件分别叫 `McQuarrie…-translated.pdf`、`zh_McQuarrie….pdf`、
//! `20261006023250-703433-side-by-side.pdf`、`full.md` —— 原文件名、任务号、固定名三种依据，
//! 同一个译文 PDF 从不同按钮点还有两个名字，下载几份之后在文件夹里对不上是哪本书。
//!
//! - 书名用详情页显示的那个（文档标题，会被自动整理 / 手改），没有就退回上传文件名、任务号；
//! - 前缀表示内容：`orig_` 原文、`zh_` 译文、`dual_` 对照，完整包两者都有、不加前缀。
//!   不写源语言代码（`en_`）：任务里没有记录源语言，库里也可能有日文、德文的书；
//!   译文固定是简体中文（提示词里写死），`zh_` 是真的；
//! - 排查用的文件（events.jsonl、paddle_result.json 等）不走这里，保持原名。

use retainpdf_data::db::Db;
use retainpdf_core::models::domain::JobSnapshot;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DownloadKind {
    Source,
    Translated,
    SideBySide,
    Layout,
    OcrMarkdown,
    MarkdownBundle,
    Bundle,
}

impl DownloadKind {
    fn prefix(self) -> Option<&'static str> {
        match self {
            Self::Source | Self::OcrMarkdown | Self::MarkdownBundle => Some("orig"),
            Self::Translated | Self::Layout => Some("zh"),
            Self::SideBySide => Some("dual"),
            Self::Bundle => None,
        }
    }

    fn suffix(self) -> &'static str {
        match self {
            Self::Source => "source",
            Self::Translated => "translated",
            Self::SideBySide => "side-by-side",
            Self::Layout => "layout",
            Self::OcrMarkdown => "ocr",
            Self::MarkdownBundle => "markdown",
            Self::Bundle => "bundle",
        }
    }

    fn extension(self) -> &'static str {
        match self {
            Self::Source | Self::Translated | Self::SideBySide => "pdf",
            Self::Layout => "docx",
            Self::OcrMarkdown => "md",
            Self::MarkdownBundle | Self::Bundle => "zip",
        }
    }
}

/// 书名部分最多这么多 UTF-8 字节：加上前后缀（最长的 `dual_…_side-by-side.pdf` 多 23 字节）
/// 也在 ext4 等文件系统 255 字节的文件名上限以内。按字节截、不切断字符。
const MAX_TITLE_BYTES: usize = 180;

pub fn download_file_name(title: &str, kind: DownloadKind) -> String {
    let title = clean_title(title);
    match kind.prefix() {
        Some(prefix) => format!("{prefix}_{title}_{}.{}", kind.suffix(), kind.extension()),
        None => format!("{title}_{}.{}", kind.suffix(), kind.extension()),
    }
}

/// 去掉文件系统不认的字符和控制字符、去掉 `.pdf` 扩展名（不分大小写）、压缩空白、截断；
/// 空了就是 `document`。和前端 download-names.ts 逐字符一致（两边测试用同一组例子）：
/// BOM（U+FEFF）在 JS 里算空白、Rust 的 split_whitespace 不算，所以这里先换成空格。
fn clean_title(title: &str) -> String {
    let unbommed = title.replace('\u{FEFF}', " ");
    let trimmed = unbommed.trim();
    let without_ext = if trimmed.to_ascii_lowercase().ends_with(".pdf") {
        &trimmed[..trimmed.len() - 4]
    } else {
        trimmed
    };
    let replaced: String = without_ext
        .chars()
        .map(|ch| match ch {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => ' ',
            ch if ch.is_control() => ' ',
            ch => ch,
        })
        .collect();
    let collapsed = replaced.split_whitespace().collect::<Vec<_>>().join(" ");
    let mut truncated = String::new();
    for ch in collapsed.chars() {
        if truncated.len() + ch.len_utf8() > MAX_TITLE_BYTES {
            break;
        }
        truncated.push(ch);
    }
    let cleaned = truncated.trim().trim_matches('.').trim().to_string();
    if cleaned.is_empty() {
        "document".to_string()
    } else {
        cleaned
    }
}

/// 任务所属那本书的名字 —— 和书籍详情 / 书架卡片同一个规则（services::files::artifacts 的书名）。
pub(crate) fn job_title(db: &Db, job: &JobSnapshot) -> String {
    crate::artifacts::job_display_title(db, job)
}

pub fn job_download_file_name(db: &Db, job: &JobSnapshot, kind: DownloadKind) -> String {
    download_file_name(&job_title(db, job), kind)
}

#[cfg(test)]
mod tests {
    use super::*;

    const TITLE: &str = "The Harmonic Oscillator and Vibrational Spectroscopy";

    #[test]
    fn every_kind_follows_prefix_title_suffix() {
        let names: Vec<_> = [
            DownloadKind::Source,
            DownloadKind::Translated,
            DownloadKind::SideBySide,
            DownloadKind::Layout,
            DownloadKind::OcrMarkdown,
            DownloadKind::MarkdownBundle,
            DownloadKind::Bundle,
        ]
        .into_iter()
        .map(|kind| download_file_name(TITLE, kind))
        .collect();
        assert_eq!(
            names,
            vec![
                format!("orig_{TITLE}_source.pdf"),
                format!("zh_{TITLE}_translated.pdf"),
                format!("dual_{TITLE}_side-by-side.pdf"),
                format!("zh_{TITLE}_layout.docx"),
                format!("orig_{TITLE}_ocr.md"),
                format!("orig_{TITLE}_markdown.zip"),
                format!("{TITLE}_bundle.zip"),
            ]
        );
    }

    #[test]
    fn title_is_cleaned_for_file_systems() {
        assert_eq!(
            download_file_name("a/b: c?  \"d\"\n.pdf", DownloadKind::Source),
            "orig_a b c d_source.pdf"
        );
        assert_eq!(download_file_name("   ", DownloadKind::Bundle), "document_bundle.zip");
        assert_eq!(download_file_name("共轭在卤素.pdf", DownloadKind::Translated), "zh_共轭在卤素_translated.pdf");
        // 「长」3 字节：180 字节恰好 60 个字。
        let long = "长".repeat(300);
        let name = download_file_name(&long, DownloadKind::Translated);
        assert_eq!(name, format!("zh_{}_translated.pdf", "长".repeat(60)));
        assert!(download_file_name(&long, DownloadKind::SideBySide).len() <= 255);
    }

    #[test]
    fn edge_inputs_match_the_frontend_mirror() {
        // 和 frontend/web/tests/book-detail/download-names.test.mjs 同一组例子。
        assert_eq!(download_file_name("x.Pdf", DownloadKind::Source), "orig_x_source.pdf");
        assert_eq!(download_file_name("\u{FEFF}title", DownloadKind::Source), "orig_title_source.pdf");
        assert_eq!(download_file_name("a\u{FEFF}b", DownloadKind::Source), "orig_a b_source.pdf");
        assert_eq!(download_file_name("ab".repeat(100).as_str(), DownloadKind::Bundle), format!("{}_bundle.zip", "ab".repeat(90)));
    }
}
