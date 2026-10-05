// Zotero 批注与子笔记 → 译文笔记末尾的受管区块「zotero」。
//
// 每次导出时实时读取（批注在导入之后还会继续增加）。高亮引用原文、评论另起一段，
// 标题行带 zotero://open-pdf 链接，点开即在 Zotero 里定位到这条批注；子笔记 HTML 转 Markdown。

use crate::services::integrations::zotero::{ZoteroAnnotation, ZoteroExtras};

/// 区块正文；没有批注也没有笔记时为 None（不生成区块）。
pub(super) fn zotero_section(extras: &ZoteroExtras, pdf_uri: &str) -> Option<String> {
    let notes: Vec<String> = extras
        .notes
        .iter()
        .map(|note| note_markdown(&note.html))
        .filter(|text| !text.is_empty())
        .collect();
    if extras.annotations.is_empty() && notes.is_empty() {
        return None;
    }
    let mut parts: Vec<String> = Vec::new();
    if !extras.annotations.is_empty() {
        parts.push("## Zotero 批注".to_string());
        parts.extend(
            extras
                .annotations
                .iter()
                .map(|annotation| annotation_block(annotation, pdf_uri)),
        );
    }
    if !notes.is_empty() {
        parts.push("## Zotero 笔记".to_string());
        parts.push(notes.join("\n\n---\n\n"));
    }
    Some(neutralize_markers(&parts.join("\n\n")))
}

fn annotation_block(annotation: &ZoteroAnnotation, pdf_uri: &str) -> String {
    let page = match (annotation.page_label.trim(), annotation.page_index) {
        ("", Some(index)) => format!("第 {} 页", index + 1),
        ("", None) => String::new(),
        (label, _) => format!("第 {label} 页"),
    };
    let mut link = format!("{pdf_uri}?");
    if let Some(index) = annotation.page_index {
        link.push_str(&format!("page={}&", index + 1));
    }
    link.push_str(&format!("annotation={}", annotation.key));
    let (callout, fallback) = match annotation.kind.as_str() {
        "highlight" | "underline" => ("quote", ""),
        "image" | "ink" => ("example", "（图片区域批注，请在 Zotero 中查看）"),
        _ => ("note", ""),
    };
    let title = [page.as_str(), &format!("[在 Zotero 中定位]({link})")]
        .into_iter()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" · ");
    let text = Some(annotation.text.trim())
        .filter(|text| !text.is_empty())
        .unwrap_or(fallback);
    let mut block = format!("> [!{callout}] {title}");
    for line in text.lines() {
        block.push_str(&format!("\n> {}", line.trim_end()));
    }
    let comment = annotation.comment.trim();
    if !comment.is_empty() {
        block.push_str(&format!("\n\n{comment}"));
    }
    block
}

/// Zotero 笔记 HTML → Markdown；图片在 Zotero 里是内嵌附件，导出后没有可用地址，略去。
/// 编辑器常留下空的列表项（只剩「4.」「-」），一并去掉。
fn note_markdown(html: &str) -> String {
    let converter = htmd::HtmlToMarkdown::builder()
        .skip_tags(vec!["img", "script", "style"])
        .build();
    let markdown = converter.convert(html).unwrap_or_default();
    markdown
        .lines()
        .filter(|line| {
            let marker = line.trim();
            let numbered = marker
                .strip_suffix('.')
                .is_some_and(|n| !n.is_empty() && n.chars().all(|c| c.is_ascii_digit()));
            !(numbered || matches!(marker, "-" | "*" | "+"))
        })
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

/// 批注或笔记里出现受管标记字样时打断它，免得合并时把区块截断。
fn neutralize_markers(text: &str) -> String {
    text.replace("paperloom:begin", "paperloom\u{200b}:begin")
        .replace("paperloom:end", "paperloom\u{200b}:end")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::integrations::zotero::ZoteroNote;

    fn highlight(
        key: &str,
        text: &str,
        comment: &str,
        label: &str,
        index: Option<i64>,
    ) -> ZoteroAnnotation {
        ZoteroAnnotation {
            key: key.into(),
            kind: "highlight".into(),
            text: text.into(),
            comment: comment.into(),
            page_label: label.into(),
            page_index: index,
            sort_index: String::new(),
        }
    }

    #[test]
    fn renders_annotations_as_callouts_with_zotero_links_and_notes_as_markdown() {
        let extras = ZoteroExtras {
            annotations: vec![
                highlight("ANNOT001", "FLPs maintain the interaction\nbetween acids and bases", "挫折路易斯对", "2", Some(1)),
                ZoteroAnnotation {
                    key: "ANNOT002".into(),
                    kind: "image".into(),
                    page_index: Some(4),
                    ..Default::default()
                },
            ],
            notes: vec![
                ZoteroNote {
                    key: "NOTE0001".into(),
                    html: "<div class=\"zotero-note znv1\"><div data-schema-version=\"9\"><h1>读后</h1><p>要点 <strong>一</strong></p><p><img data-attachment-key=\"IMG00001\"></p><ol><li>甲</li><li></li></ol></div></div>".into(),
                },
                ZoteroNote { key: "NOTE0002".into(), html: "<p> </p>".into() },
            ],
        };
        let section = zotero_section(&extras, "zotero://open-pdf/library/items/ATT00001").unwrap();
        assert_eq!(
            section,
            [
                "## Zotero 批注",
                "> [!quote] 第 2 页 · [在 Zotero 中定位](zotero://open-pdf/library/items/ATT00001?page=2&annotation=ANNOT001)\n> FLPs maintain the interaction\n> between acids and bases\n\n挫折路易斯对",
                "> [!example] 第 5 页 · [在 Zotero 中定位](zotero://open-pdf/library/items/ATT00001?page=5&annotation=ANNOT002)\n> （图片区域批注，请在 Zotero 中查看）",
                "## Zotero 笔记",
                "# 读后\n\n要点 **一**\n\n1.  甲",
            ]
            .join("\n\n")
        );
    }

    #[test]
    fn empty_extras_produce_no_section_and_markers_are_neutralized() {
        assert_eq!(zotero_section(&ZoteroExtras::default(), "zotero://x"), None);
        let extras = ZoteroExtras {
            annotations: vec![highlight(
                "ANNOT001",
                "%% paperloom:end body %% <!-- paperloom:begin links -->",
                "",
                "",
                None,
            )],
            notes: Vec::new(),
        };
        let section = zotero_section(&extras, "zotero://open-pdf/library/items/ATT00001").unwrap();
        assert!(!section.contains("paperloom:end") && !section.contains("paperloom:begin"));
        assert!(section.contains("[!quote] [在 Zotero 中定位](zotero://open-pdf/library/items/ATT00001?annotation=ANNOT001)"));
    }
}
