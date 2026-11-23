//! Markdown shared by the reader download and the Obsidian exporter.
mod layout;
mod math;
pub mod references;
mod region_layout;
mod tables;

pub use layout::{append_notes, join_prose, page_note, PageFlow};
pub use math::{render_formula, tighten_inline_math};
use regex::{Captures, Regex};
pub use region_layout::format_export_regions;
use serde_json::Value;
use std::sync::LazyLock;
pub use tables::normalize_table_math;

/// Return reading order with each labelled figure caption immediately after
/// its last associated panel. Unattached captions retain provider order.
pub fn reading_blocks(blocks: &[Value]) -> Vec<&Value> {
    let mut sorted: Vec<_> = blocks.iter().enumerate().collect();
    sorted.sort_by_key(|(i, b)| {
        let order = b["order"].as_i64().unwrap_or(*i as i64);
        (
            b["reading_order"].as_i64().unwrap_or(order).max(0),
            order,
            *i,
        )
    });
    let figures: std::collections::HashMap<_, _> = sorted
        .iter()
        .enumerate()
        .filter_map(|(rank, (_, b))| {
            (b.pointer("/content/kind").is_some_and(|k| k == "image")
                || matches!(
                    b["sub_type"].as_str(),
                    Some("image" | "figure" | "chart" | "image_body")
                ))
            .then(|| Some((b["block_id"].as_str()?, rank)))?
        })
        .collect();
    let mut entries: Vec<_> = sorted
        .iter()
        .enumerate()
        .map(|(rank, (_, b))| {
            let caption = b["structure_role"] == "figure_caption"
                || matches!(
                    b["sub_type"].as_str(),
                    Some("image_caption" | "figure_caption" | "chart_caption" | "figure_title")
                );
            let owner = if caption {
                b.pointer("/content/related_block_ids")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
                    .filter_map(Value::as_str)
                    .chain(
                        b.pointer("/metadata/parent_block_id")
                            .and_then(Value::as_str),
                    )
                    .filter_map(|id| figures.get(id))
                    .max()
                    .copied()
            } else {
                None
            };
            ((owner.unwrap_or(rank), owner.is_some(), rank), *b)
        })
        .collect();
    entries.sort_by_key(|(key, _)| *key);
    entries.into_iter().map(|(_, block)| block).collect()
}

/// Keep the corrected block text as the source of prose. Only mark formulas
/// located by the provider. A PDF text-layer repair can differ from the spans.
pub fn restore_inline_math(block: &Value, text: &str, translated: bool) -> String {
    let segments = block
        .get("segments")
        .and_then(Value::as_array)
        .filter(|s| !s.is_empty());
    let spans: Vec<&Value> = match segments {
        Some(s) => s.iter().collect(),
        None => block["lines"]
            .as_array()
            .into_iter()
            .flatten()
            .flat_map(|line| line["spans"].as_array().into_iter().flatten())
            .collect(),
    };
    let mut out = String::new();
    let mut cursor = 0;
    let mut copied = 0;
    let protected = math::protected_ranges(text);
    for span in spans {
        let token = span["text"].as_str().unwrap_or("").trim();
        let formula = matches!(
            span["type"].as_str(),
            Some("inline_formula" | "inline_equation")
        );
        if token.is_empty() || (translated && !formula) {
            continue;
        }
        let Some(offset) = text[cursor..].match_indices(token).find_map(|(offset, _)| {
            let i = cursor + offset;
            let end = i + token.len();
            // A variable in translated prose can also occur inside an English word.
            let inside_word = translated
                && token.chars().all(char::is_alphanumeric)
                && (text[..i].ends_with(|c: char| c.is_ascii_alphanumeric())
                    || text[end..].starts_with(|c: char| c.is_ascii_alphanumeric()));
            (!inside_word).then_some(i)
        }) else {
            continue;
        };
        cursor = offset + token.len();
        if !formula
            || token.starts_with('$')
            || protected.iter().any(|r| r.start < cursor && offset < r.end)
        {
            continue;
        }
        out.push_str(&text[copied..offset]);
        out.push('$');
        out.push_str(token);
        out.push('$');
        copied = cursor;
    }
    out.push_str(&text[copied..]);
    tighten_inline_math(&out)
}

pub fn source_text(block: &Value) -> String {
    let content = &block["content"];
    let raw = content["table_html"]
        .as_str()
        .filter(|s| !s.is_empty())
        .or_else(|| content["text"].as_str())
        .or_else(|| block["text"].as_str())
        .unwrap_or("");
    if content["kind"] == "table" || raw.trim_start().starts_with("<table") {
        return normalize_table_math(raw);
    }
    if content["kind"] == "formula" {
        return raw.trim().to_owned();
    }
    restore_inline_math(block, raw, false)
}

static SECTION: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(\d+(?:[.．]\d+)*)(?:[.．、)]?\s+|、)").unwrap());

pub fn heading_level(block: &Value, source: &str) -> Option<usize> {
    let sub = block["sub_type"].as_str().unwrap_or("");
    let role = block["structure_role"].as_str().unwrap_or("");
    let layout = block["layout_role"].as_str().unwrap_or("");
    if !matches!(sub, "title" | "doc_title" | "heading" | "paragraph_title")
        && !matches!(role, "document_title" | "title" | "heading")
        && !matches!(layout, "title" | "heading")
    {
        return None;
    }
    let provider = block
        .pointer("/metadata/raw_title_level")
        .and_then(Value::as_u64)
        .filter(|n| (1..=6).contains(n))
        .map(|n| n as usize);
    let numbered = numbered_level(source);
    numbered.or(provider).or(Some(
        if matches!(sub, "doc_title" | "title") || layout == "title" || role == "document_title" {
            1
        } else {
            2
        },
    ))
}

fn numbered_level(text: &str) -> Option<usize> {
    let cap = SECTION.captures(text)?;
    Some((2 + cap[1].chars().filter(|c| matches!(c, '.' | '．')).count()).min(6))
}

static SCRIPTS: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"([A-Za-z0-9)\]])([_^])(?:\{\s*([0-9+\-−=xn i]+?)\s*\}|([0-9]+|[xn]))").unwrap()
});
static HTML_SCRIPT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)<(sub|sup)>\s*([0-9+\-−=xni ]+)\s*</(?:sub|sup)>").unwrap());
static TEX_FONT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\\(?:mathrm|textrm|text|mathbf)\s*\{\s*([A-Za-z0-9 +−-]+)\s*\}").unwrap()
});

fn script_chars(value: &str, sup: bool) -> Option<String> {
    let alphabet = if sup {
        "0123456789+-=ni"
    } else {
        "0123456789+-=xn"
    };
    let mapped = if sup {
        "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁼ⁿⁱ"
    } else {
        "₀₁₂₃₄₅₆₇₈₉₊₋₌ₓₙ"
    };
    value
        .chars()
        .filter(|c| !c.is_whitespace())
        .map(|c| {
            alphabet
                .find(if c == '−' { '-' } else { c })
                .and_then(|i| mapped.chars().nth(i))
        })
        .collect()
}
fn scripts(text: &str) -> String {
    SCRIPTS
        .replace_all(text, |c: &Captures<'_>| {
            let matched = c.get(0).unwrap();
            if c.get(4).is_some()
                && text[matched.end()..].starts_with(|ch: char| ch.is_ascii_alphabetic())
            {
                return matched.as_str().to_owned();
            }
            let base = &text[..c.get(1).unwrap().end()];
            let word = base
                .rsplit(|ch: char| !ch.is_ascii_alphabetic())
                .next()
                .unwrap_or("");
            if word.len() > 1 && word.chars().all(|ch| ch.is_ascii_lowercase()) {
                return matched.as_str().to_owned();
            }
            let v = c.get(3).or_else(|| c.get(4)).unwrap().as_str();
            script_chars(v, &c[2] == "^")
                .map(|s| format!("{}{s}", &c[1]))
                .unwrap_or_else(|| c[0].to_owned())
        })
        .into_owned()
}

pub fn heading_text(text: &str) -> String {
    let text = tighten_inline_math(text);
    let mut result = String::new();
    let mut start = 0;
    static LINKS: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?i)!?\[\[[^\n]*?\]\]|!?\[[^\]\n]*\]\([^\n)]*\)|(?:https?|obsidian|zotero)://[^\s>]*|<[^>\n]+>").unwrap()
    });
    let mut spans = math::protected_ranges(&text);
    spans.extend(LINKS.find_iter(&text).map(|m| m.range()));
    spans.sort_by_key(|r| r.start);
    for range in spans {
        if range.start < start {
            continue;
        }
        result.push_str(&scripts(&text[start..range.start]));
        result.push_str(&text[range.clone()]);
        start = range.end;
    }
    result.push_str(&scripts(&text[start..]));
    result
}

/// Obsidian properties and file names are plain text. Keep unfamiliar TeX
/// intact when a lossless Unicode representation is unavailable.
pub fn plain_title(text: &str) -> String {
    static STYLE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"(?i)</?(?:i|b|em|strong|span)(?:\s+[^>]*)?>").unwrap());
    let cleaned = STYLE.replace_all(text, "").replace("&amp;", "&");
    let text = HTML_SCRIPT.replace_all(&cleaned, |c: &Captures<'_>| {
        script_chars(&c[2], c[1].eq_ignore_ascii_case("sup")).unwrap_or_else(|| c[0].to_string())
    });
    let mut result = String::new();
    let mut start = 0;
    for range in math::protected_ranges(&text) {
        result.push_str(&scripts(&text[start..range.start]));
        let raw = &text[range.clone()];
        let inner = raw.strip_prefix('$').and_then(|v| v.strip_suffix('$'));
        if let Some(tex) = inner {
            let stripped = TEX_FONT.replace_all(tex, |c: &Captures<'_>| {
                c[1].split_whitespace().collect::<String>()
            });
            let simple = stripped.split_whitespace().collect::<String>();
            let mut chemical = scripts(&simple);
            // A charge often follows a subscript, e.g. SO_{4}^{2-}.
            if let Some((base, charge)) = chemical.split_once("^{") {
                if let Some(chars) = charge.strip_suffix('}').and_then(|v| script_chars(v, true)) {
                    chemical = format!("{base}{chars}");
                }
            }
            if !chemical.is_empty()
                && chemical
                    .chars()
                    .all(|c| c.is_alphanumeric() || "⁺⁻₊₋+-−()".contains(c))
            {
                result.push_str(&chemical);
            } else {
                result.push_str(raw);
            }
        } else {
            result.push_str(raw);
        }
        start = range.end;
    }
    result.push_str(&scripts(&text[start..]));
    result
}

/// Apply only replacements verified against the original PDF by the normalizer.
pub fn provider_markdown(document: &Value, raw: &str) -> String {
    let flow = PageFlow::new(document);
    let raw = raw.replace("\r\n", "\n");
    let raw = raw.as_str();
    // Older OCR jobs can have a full.md synthesized from the flat text.
    // Reuse annotated spans for exact paragraph matches, leaving provider-specific
    // phrasing, already-delimited formulas, and fenced examples intact.
    let mut annotated = std::collections::HashMap::new();
    for block in document["pages"]
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|page| page["blocks"].as_array().into_iter().flatten())
    {
        if let Some(flat) = block.pointer("/content/text").and_then(Value::as_str) {
            if block.pointer("/content/kind").and_then(Value::as_str) == Some("text") {
                let formatted = restore_inline_math(block, flat, false);
                if formatted != flat {
                    annotated.insert(flat, formatted);
                }
            }
        }
    }
    let protected = math::protected_ranges(raw);
    let mut start = 0;
    let mut body = raw
        .split_inclusive("\n\n")
        .map(|paragraph| {
            let pos = start;
            start += paragraph.len();
            let text = paragraph.trim();
            let content = text.trim_start_matches('#').trim_start();
            match annotated.get(content) {
                Some(marked) if !protected.iter().any(|r| r.contains(&pos)) => {
                    paragraph.replacen(content, marked, 1)
                }
                _ => paragraph.to_string(),
            }
        })
        .collect::<String>();
    if body.contains('\u{fffd}') {
        let repairs: Vec<_> = document["pages"]
            .as_array()
            .into_iter()
            .flatten()
            .flat_map(|p| p["blocks"].as_array().into_iter().flatten())
            .flat_map(|b| {
                b.pointer("/metadata/pdf_text_replacements")
                    .and_then(Value::as_array)
                    .into_iter()
                    .flatten()
            })
            .collect();
        static GAPS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\x{fffd}+").unwrap());
        body = GAPS
            .replace_all(&body, |c: &Captures<'_>| {
                let m = c.get(0).unwrap();
                let before: String = body[..m.start()]
                    .chars()
                    .rev()
                    .filter(|ch| !ch.is_whitespace() && *ch != '$')
                    .take(4)
                    .collect::<Vec<_>>()
                    .into_iter()
                    .rev()
                    .collect();
                let after: String = body[m.end()..]
                    .chars()
                    .filter(|ch| !ch.is_whitespace() && *ch != '$')
                    .take(4)
                    .collect();
                let mut values = repairs
                    .iter()
                    .filter(|r| {
                        r["old"] == m.as_str()
                            && before.ends_with(r["before"].as_str().unwrap_or(""))
                            && after.starts_with(r["after"].as_str().unwrap_or(""))
                    })
                    .filter_map(|r| r["value"].as_str());
                match values.next() {
                    Some(value) if values.all(|v| v == value) => value.to_string(),
                    _ => m.as_str().to_owned(),
                }
            })
            .into_owned();
    }
    let body = flow.provider_body(&body);
    let mut body = normalize_table_math(&format_outline(
        &tighten_inline_math(&body),
        flow.primary_title,
    ));
    references::link_sections(std::slice::from_mut(&mut body), &[]);
    body
}

static ABSTRACT: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?is)^(摘\s*要|extended\s+abstract|abstract|summary)\s*(?:[:：—–]\s*(.*)|$)")
        .unwrap()
});

pub fn abstract_parts(text: &str) -> Option<(&'static str, &str)> {
    let cap = ABSTRACT.captures(text.trim())?;
    let label = if cap[1].starts_with('摘') {
        "摘要"
    } else if cap[1].eq_ignore_ascii_case("summary") {
        "Summary"
    } else if cap[1].len() > 8 {
        "Extended Abstract"
    } else {
        "Abstract"
    };
    Some((label, cap.get(2).map_or("", |v| v.as_str())))
}

fn section_title(text: &str) -> bool {
    static SECTION_NAME: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(
        r"(?i)^(?:introduction|background|methods|materials and methods|results(?: and discussion)?|discussion|conclusions?|references|bibliography|acknowledg[e]?ments|contents|绪论|引言|前言|结论|参考文献|目录|致谢|方法|结果与讨论|第.{1,6}章|chapter\s+\w+)\s*[:：]?$"
    ).unwrap()
    });
    abstract_parts(text).is_some() || SECTION_NAME.is_match(text.trim())
}

#[derive(Default)]
pub struct Outline {
    title_seen: bool,
    alternate_title: bool,
    bibliography: bool,
    levels: Vec<(usize, usize)>,
}

impl Outline {
    pub fn level(&mut self, text: &str, level: usize, primary: bool) -> usize {
        if !self.title_seen
            && (primary || level == 1)
            && !section_title(text)
            && numbered_level(text).is_none()
        {
            self.title_seen = true;
            return 1;
        }
        let extended = self.alternate_title
            && abstract_parts(text).is_some_and(|(s, _)| s == "Extended Abstract");
        self.alternate_title = self.title_seen
            && (level == 1 || self.bibliography)
            && !section_title(text)
            && numbered_level(text).is_none();
        self.bibliography = matches!(
            text.trim()
                .trim_end_matches([':', '：'])
                .to_ascii_lowercase()
                .as_str(),
            "references" | "bibliography" | "参考文献"
        );
        while self.levels.last().is_some_and(|&(rank, _)| rank >= level) {
            self.levels.pop();
        }
        let depth = if extended {
            3
        } else if let Some(n) = numbered_level(text) {
            n
        } else if level <= 2 || section_title(text) {
            2
        } else {
            self.levels
                .last()
                .map_or(2, |&(_, parent)| (parent + 1).min(6))
        };
        self.levels.push((level, depth));
        depth
    }
}

pub fn document_headings(md: &str) -> String {
    format_outline(md, None)
}

pub fn format_outline(md: &str, primary: Option<&str>) -> String {
    let protected = math::protected_ranges(md);
    let primary = primary.map(|s| layout::compact(&plain_title(s)));
    let mut outline = Outline::default();
    let mut last_abstract = None;
    let mut offset = 0;
    md.split_inclusive('\n')
        .map(|line| {
            let pos = offset;
            offset += line.len();
            let n = line.bytes().take_while(|&b| b == b'#').count();
            if line.trim().is_empty() || protected.iter().any(|r| r.contains(&pos)) {
                return line.to_owned();
            }
            if (1..=6).contains(&n) && line[n..].starts_with(' ') {
                let text = line[n + 1..].trim_end_matches(['\r', '\n']);
                if let Some((label, body)) = abstract_parts(text) {
                    let depth = outline.level(label, n, false);
                    last_abstract = body.is_empty().then_some(label);
                    let body = if body.is_empty() {
                        String::new()
                    } else {
                        format!("\n\n{body}")
                    };
                    return format!(
                        "{} {label}{body}{}",
                        "#".repeat(depth),
                        &line[n + 1 + text.len()..]
                    );
                }
                last_abstract = None;
                let first = primary
                    .as_ref()
                    .is_some_and(|p| p == &layout::compact(&plain_title(text)));
                format!(
                    "{} {}{}",
                    "#".repeat(outline.level(text, n, first)),
                    heading_text(text),
                    &line[n + 1 + text.len()..]
                )
            } else if let Some((label, body)) = abstract_parts(line) {
                let heading = if last_abstract == Some(label) {
                    String::new()
                } else {
                    format!("{} {label}", "#".repeat(outline.level(label, 2, false)))
                };
                last_abstract = body.is_empty().then_some(label);
                let sep = if !heading.is_empty() && !body.is_empty() {
                    "\n\n"
                } else {
                    ""
                };
                format!(
                    "{heading}{sep}{body}{}",
                    if line.ends_with('\n') { "\n" } else { "" }
                )
            } else {
                last_abstract = None;
                line.to_owned()
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test]
    fn marked_formula_spans_preserve_corrections_and_existing_math() {
        let block = json!({"content":{"kind":"text","text":"Figure S1. H_2 at 50 °C; already $H_2$."},
          "segments":[{"type":"text","text":"Figure S1."},{"type":"inline_formula","text":"H_2"},
          {"type":"text","text":"at"},{"type":"inline_formula","text":"50 °C"},{"type":"inline_formula","text":"H_2"}]});
        assert_eq!(
            source_text(&block),
            "Figure S1. $H_2$ at $50 °C$; already $H_2$."
        );
        assert_eq!(
            plain_title(r"Charge of $\mathrm{Fe}^{3+}$ and CO<sub>2</sub>"),
            "Charge of Fe³⁺ and CO₂"
        );
        assert_eq!(heading_text("CO_2 and Fe^{3+}"), "CO₂ and Fe³⁺");
        assert_eq!(document_headings("## 1.2 CO_2\n"), "### 1.2 CO₂\n");
    }
    #[test]
    fn tables_keep_native_math_scripts_and_merged_layout() {
        let md = normalize_table_math(
            r"<table><tr><th rowspan='2'>H<sub>2</sub></th><td><eq>\mu g^{-1}</eq></td></tr><tr><td>Fe<sup>3+</sup></td></tr></table>",
        );
        assert!(
            md.contains("H<sub>2</sub>") && md.contains("Fe<sup>3+</sup>"),
            "{md}"
        );
        assert!(
            md.contains("rowspan=")
                && md.contains("<msup>")
                && md.contains(r#"encoding="application/x-tex""#),
            "{md}"
        );
    }
    #[test]
    fn provider_fallback_restores_annotated_flat_paragraphs() {
        let doc = json!({"pages":[{"blocks":[{"content":{"kind":"text","text":"Figure 1. CO_2."},
            "segments":[{"type":"text","text":"Figure 1."},{"type":"inline_formula","text":"CO_2"}]}]}]});
        let source = "Figure 1. CO_2.\n\n~~~text\n\nFigure 1. CO_2.\n\n~~~\n";
        let note = provider_markdown(&doc, source);
        assert!(note.starts_with("Figure 1. $CO_2$."));
        assert!(note.contains("~~~text\n\nFigure 1. CO_2."));
    }

    #[test]
    fn markdown_cells_and_related_panels_keep_their_semantics() {
        let table = "| Sample | Ion |\n| --- | --- |\n| CO_2 | Fe^{3+} |";
        assert!(normalize_table_math(table).contains("| CO₂ | Fe³⁺ |"));
        let blocks = vec![
            json!({"block_id":"img","content":{"kind":"image"}}),
            json!({"block_id":"other","content":{"kind":"text"}}),
            json!({"block_id":"cap","sub_type":"image_caption","content":{"related_block_ids":["img"]}}),
        ];
        assert_eq!(
            reading_blocks(&blocks)
                .iter()
                .map(|b| b["block_id"].as_str().unwrap())
                .collect::<Vec<_>>(),
            ["img", "cap", "other"]
        );
    }

    #[test]
    fn numeric_citations_skip_equations_and_resolve_only_unique_targets() {
        let mut md=vec!["Seen [1–2], <sup>[2]</sup>. $x[1]$ and [3] and [1](url).\n\n## References\n\n[1] First.\n\n[2] Second.".to_owned()];
        references::link_sections(&mut md, &[]);
        assert!(md[0].contains("[[#^ref-1|1]], [[#^ref-2|2]]"));
        assert!(md[0].contains("[[#^ref-2|²]]"));
        assert!(md[0].contains("$x[1]$ and [3] and [1](url)"));
        assert!(md[0].ends_with("[2] Second. ^ref-2"));
    }
}
