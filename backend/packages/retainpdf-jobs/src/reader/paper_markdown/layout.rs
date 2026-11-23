use super::{math, reading_blocks, source_text};
use regex::Regex;
use serde_json::Value;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::LazyLock;

static PANEL: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^(?:[（(][A-Za-z][)）]|[A-Za-z])$").unwrap());

fn text(b: &Value) -> &str {
    b.pointer("/content/text")
        .or_else(|| b.get("text"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .trim()
}

pub fn page_note(b: &Value) -> bool {
    matches!(b["sub_type"].as_str(), Some("page_footnote" | "footnote"))
        || (b["layout_role"] == "footnote"
            && !matches!(
                b["sub_type"].as_str(),
                Some("table_footnote" | "image_footnote" | "chart_footnote")
            ))
}

fn rect(b: &Value) -> Option<[f64; 4]> {
    let v = b
        .get("bbox")
        .or_else(|| b.pointer("/geometry/bbox"))?
        .as_array()?;
    let [x, y, r, d] = v.as_slice() else {
        return None;
    };
    let bounds = [x.as_f64()?, y.as_f64()?, r.as_f64()?, d.as_f64()?];
    (bounds[2] > bounds[0] && bounds[3] > bounds[1]).then_some(bounds)
}

fn is_prose(b: &Value) -> bool {
    matches!(b["sub_type"].as_str(), Some("body" | "text" | "paragraph"))
        || (b["semantic_role"] == "body" && b["layout_role"] == "paragraph")
}

fn cjk(c: char) -> bool {
    matches!(c, '\u{3400}'..='\u{9fff}' | '\u{f900}'..='\u{faff}')
}

/// The pages and reading order must already be adjacent. Use provider links
/// first. Older PDFs need matching column widths and prose at both page edges.
fn continues(left: &Value, prev: &Value, right: &Value, page: &Value) -> bool {
    if !is_prose(left) || !is_prose(right) {
        return false;
    }
    let group = |b: &Value| {
        b.pointer("/continuation_hint/group_id")
            .and_then(Value::as_str)
            .unwrap_or("")
            .to_owned()
    };
    let (a, b) = (group(left), group(right));
    if !a.is_empty() || !b.is_empty() {
        return !a.is_empty() && a == b;
    }
    let (Some(l), Some(r), Some(ph), Some(h), Some(pw), Some(w)) = (
        rect(left),
        rect(right),
        prev["height"].as_f64(),
        page["height"].as_f64(),
        prev["width"].as_f64(),
        page["width"].as_f64(),
    ) else {
        return false;
    };
    let before = text(left);
    let after = text(right);
    let end = before
        .trim_end_matches(['"', '\'', '”', '’', '」', ')', '）'])
        .chars()
        .last();
    l[3] >= ph * 0.68
        && r[1] <= h * 0.25
        && ((l[2] - l[0]) / pw - (r[2] - r[0]) / w).abs() <= 0.09
        && before.chars().count() >= 12
        && after.chars().count() >= 8
        && end.is_some_and(|c| c.is_alphanumeric() || ",，、-‐\u{ad}".contains(c))
        && after.starts_with(|c: char| cjk(c) || c.is_lowercase())
        && super::abstract_parts(after).is_none()
        && !after.starts_with("关键词")
        && !after.starts_with("关键字")
}

pub fn join_prose(left: &mut String, right: &str) {
    let end = left.trim_end().len();
    left.truncate(end);
    let right = right.trim_start();
    if left.ends_with('\u{ad}') {
        left.pop();
    } else if !left.ends_with(['-', '‐'])
        && !left.ends_with(cjk)
        && !right.starts_with(cjk)
        && !right.starts_with(|c| ",.;:!?，。；：！？)]）".contains(c))
    {
        left.push(' ');
    }
    left.push_str(right);
}

/// Evidence from physical PDF blocks, also available in pre-existing jobs.
pub struct PageFlow<'a> {
    pub panels: HashSet<&'a str>,
    pub furniture: HashSet<&'a str>,
    pub joins: HashMap<&'a str, &'a str>, // tail id → previous page's final block
    notes: Vec<(i64, &'a Value)>,
    label_occurrences: HashMap<&'a str, Vec<bool>>,
    boundaries: HashSet<(String, String)>,
    pub primary_title: Option<&'a str>,
    pub abstracts: HashMap<&'a str, (&'a Value, &'static str)>,
}

impl<'a> PageFlow<'a> {
    pub fn new(document: &'a Value) -> Self {
        let mut flow = Self {
            panels: HashSet::new(),
            furniture: HashSet::new(),
            joins: HashMap::new(),
            notes: Vec::new(),
            label_occurrences: HashMap::new(),
            boundaries: HashSet::new(),
            primary_title: None,
            abstracts: HashMap::new(),
        };
        let mut pages: Vec<_> = document["pages"]
            .as_array()
            .into_iter()
            .flatten()
            .enumerate()
            .map(|(i, p)| {
                (
                    p["page_index"]
                        .as_i64()
                        .or_else(|| p["page"].as_i64().map(|v| v - 1))
                        .unwrap_or(i as i64),
                    p,
                )
            })
            .collect();
        pages.sort_by_key(|(n, _)| *n);
        let first_page = pages.first().map(|(n, _)| *n);
        let mut previous: Option<(i64, &Value, &Value)> = None;
        let mut previous_reference: Option<&Value> = None;
        let mut in_abstract = false;
        for (index, page) in pages {
            let Some(blocks) = page["blocks"].as_array() else {
                previous = None;
                continue;
            };
            let figures: Vec<_> = blocks
                .iter()
                .filter(|b| {
                    b.pointer("/content/kind").is_some_and(|v| v == "image")
                        || matches!(
                            b["sub_type"].as_str(),
                            Some("figure" | "image" | "image_body" | "chart")
                        )
                })
                .filter_map(rect)
                .collect();
            let mut visible = Vec::new();
            for block in reading_blocks(blocks) {
                let id = block["block_id"].as_str().unwrap_or("");
                let value = text(block);
                if page_note(block) {
                    if !value.is_empty() {
                        flow.notes.push((index + 1, block));
                    }
                    continue;
                }
                if matches!(
                    block["layout_role"].as_str(),
                    Some("header" | "footer" | "page_number")
                ) || matches!(
                    block["source"]["raw_type"].as_str(),
                    Some("header_image" | "footer_image")
                ) {
                    flow.furniture.insert(id);
                    continue;
                }
                if PANEL.is_match(value) {
                    let figure_text = is_prose(block)
                        || matches!(
                            block["sub_type"].as_str(),
                            Some(
                                "image_caption"
                                    | "figure_caption"
                                    | "chart_caption"
                                    | "figure_title"
                            )
                        );
                    let inside = figure_text
                        && rect(block).is_some_and(|r| {
                            let x = (r[0] + r[2]) / 2.;
                            let y = (r[1] + r[3]) / 2.;
                            figures.iter().any(|f| {
                                x >= f[0]
                                    && x <= f[2]
                                    && y >= f[1] - (r[3] - r[1])
                                    && y <= f[3] + (r[3] - r[1])
                            })
                        });
                    flow.label_occurrences
                        .entry(value)
                        .or_default()
                        .push(inside);
                    if inside && !id.is_empty() {
                        flow.panels.insert(id);
                        continue;
                    }
                }
                // OCR can split one numbered reference between columns or pages.
                if !value.is_empty() {
                    let previous = previous_reference.take();
                    if super::references::SectionKind::from_block(block)
                        == super::references::SectionKind::Reference
                    {
                        if super::references::entry_number(value).is_some() {
                            previous_reference = Some(block);
                        } else if let Some(left) = previous.filter(|left| {
                            text(left).ends_with(|c: char| c.is_alphanumeric() || c == '-')
                                && value.starts_with(|c: char| c.is_lowercase() || cjk(c))
                        }) {
                            flow.join_blocks(left, block);
                            previous_reference = Some(block);
                        }
                    }
                }
                let heading = super::heading_level(block, value);
                if first_page == Some(index)
                    && flow.primary_title.is_none()
                    && heading.is_some()
                    && !value.is_empty()
                    && !super::section_title(value)
                    && super::numbered_level(value).is_none()
                    && (block["structure_role"] == "document_title"
                        || matches!(block["sub_type"].as_str(), Some("title" | "doc_title"))
                        || matches!(
                            block["source"]["raw_type"].as_str(),
                            Some("doc_title" | "title")
                        )
                        || heading == Some(1))
                {
                    flow.primary_title = Some(value);
                }
                let labelled = super::abstract_parts(value);
                let semantic =
                    block["semantic_role"] == "abstract" || block["sub_type"] == "abstract";
                if semantic && !in_abstract && labelled.is_none() && !value.is_empty() {
                    flow.abstracts.insert(
                        id,
                        (
                            block,
                            if value.chars().take(25).any(cjk) {
                                "摘要"
                            } else {
                                "Abstract"
                            },
                        ),
                    );
                }
                in_abstract = semantic || labelled.is_some();
                visible.push(block);
            }
            // Physics papers may typeset an unlabelled abstract between the
            // affiliations and the two columns starting below it.
            if first_page == Some(index)
                && flow.primary_title.is_some()
                && flow.abstracts.is_empty()
                && !visible
                    .iter()
                    .any(|b| super::abstract_parts(text(b)).is_some())
            {
                let width = page["width"].as_f64().unwrap_or(0.);
                for (i, pair) in visible.windows(2).enumerate() {
                    let (candidate, next) = (pair[0], pair[1]);
                    let (Some(a), Some(n)) = (rect(candidate), rect(next)) else {
                        continue;
                    };
                    if !is_prose(candidate)
                        || !is_prose(next)
                        || text(candidate).chars().count() < 160
                        || a[2] - a[0] < 0.60 * width
                        || (a[0] + a[2] - width).abs() > 0.08 * width
                        || n[2] > 0.54 * width
                        || n[1] < a[3] - 2.
                        || a[3] > page["height"].as_f64().unwrap_or(0.) * 0.58
                    {
                        continue;
                    }
                    let affiliation = visible[..i].iter().rev().take(3).any(|b| {
                        let s = text(b).to_ascii_lowercase();
                        ["university", "department", "institute", "大学", "研究所"]
                            .iter()
                            .any(|term| s.contains(term))
                    });
                    let second_column = visible[i + 2..].iter().any(|b| {
                        is_prose(b)
                            && rect(b)
                                .is_some_and(|r| r[0] > 0.48 * width && (r[1] - n[1]).abs() < 18.)
                    });
                    if affiliation && second_column {
                        if let Some(id) = candidate["block_id"].as_str() {
                            flow.abstracts.insert(
                                id,
                                (
                                    candidate,
                                    if text(candidate).chars().take(25).any(cjk) {
                                        "摘要"
                                    } else {
                                        "Abstract"
                                    },
                                ),
                            );
                        }
                        break;
                    }
                }
            }
            if let (Some((prev_idx, prev_page, left)), Some(&right)) = (previous, visible.first()) {
                if prev_idx + 1 == index && continues(left, prev_page, right, page) {
                    flow.join_blocks(left, right);
                }
            }
            previous = visible.last().map(|&b| (index, page, b));
        }
        flow
    }

    fn join_blocks(&mut self, left: &'a Value, right: &'a Value) {
        if let (Some(l), Some(r)) = (left["block_id"].as_str(), right["block_id"].as_str()) {
            self.joins.insert(r, l);
            self.boundaries.insert((
                edge(&compact(text(left)), false),
                edge(&compact(text(right)), true),
            ));
        }
    }

    pub fn provider_body(&self, raw: &str) -> String {
        let raw = raw.replace("\r\n", "\n");
        let protected = math::protected_ranges(&raw);
        let literal_at = |offset| {
            protected.iter().any(|r| {
                r.contains(&offset)
                    && (matches!(raw.as_bytes()[r.start], 96 | b'~')
                        || raw[r.start..].starts_with("$$"))
            })
        };
        let mut hits = HashMap::<&str, Vec<(usize, std::ops::Range<usize>)>>::new();
        let mut pos = 0;
        let mut paragraphs: Vec<_> = raw
            .split("\n\n")
            .enumerate()
            .map(|(index, p)| {
                let start = pos + p.len() - p.trim_start().len();
                let mut offset = 0;
                for line in p.split_inclusive('\n') {
                    let label = line.trim();
                    if self.label_occurrences.contains_key(label)
                        && !literal_at(pos + offset + line.len() - line.trim_start().len())
                    {
                        hits.entry(label)
                            .or_default()
                            .push((index, offset..offset + line.len()));
                    }
                    offset += line.len();
                }
                pos += p.len() + 2;
                (p.to_string(), literal_at(start), false)
            })
            .collect();
        let mut removals = Vec::new();
        for (label, flags) in &self.label_occurrences {
            let Some(hits) = hits.remove(label) else {
                continue;
            };
            let uniform = flags.iter().all(|v| *v);
            if hits.len() == flags.len() || (uniform && hits.len() < flags.len()) {
                removals.extend(
                    hits.into_iter()
                        .enumerate()
                        .filter_map(|(i, hit)| (uniform || flags[i]).then_some(hit)),
                );
            }
        }
        removals.sort_unstable_by_key(|(p, r)| (*p, r.start));
        for (index, range) in removals.into_iter().rev() {
            let p = &mut paragraphs[index];
            p.0.replace_range(range, "");
            p.2 = p.0.trim().is_empty();
        }
        let mut note_positions = HashMap::<String, Vec<usize>>::new();
        let mut native = HashSet::new();
        for (i, (p, _, _)) in paragraphs
            .iter()
            .enumerate()
            .filter(|(_, (_, lit, _))| !lit)
        {
            if !self.notes.is_empty() || !self.abstracts.is_empty() {
                note_positions.entry(compact(p)).or_default().push(i);
                if let Some((_, tail)) =
                    p.trim().strip_prefix("[^").and_then(|s| s.split_once("]:"))
                {
                    native.insert(compact(tail));
                }
            }
        }
        for &(block, label) in self.abstracts.values() {
            if let Some([i]) = note_positions.get(&compact(text(block))).map(Vec::as_slice) {
                let p = &mut paragraphs[*i].0;
                *p = format!("{label}: {p}");
            }
        }
        let mut notes = BTreeMap::<i64, Vec<String>>::new();
        for &(page, b) in &self.notes {
            let key = compact(text(b));
            if native.contains(&key) {
                continue;
            }
            let existing = note_positions.get_mut(&key).and_then(Vec::pop);
            let entry = if let Some(i) = existing {
                paragraphs[i].2 = true;
                paragraphs[i].0.trim().to_owned()
            } else {
                source_text(b)
            };
            notes.entry(page).or_default().push(entry);
        }
        let mut output: Vec<String> = Vec::new();
        let mut last = String::new();
        for (p, literal, omit) in paragraphs {
            if omit {
                continue;
            }
            let key = compact(&p);
            if !literal
                && !last.is_empty()
                && self
                    .boundaries
                    .contains(&(edge(&last, false), edge(&key, true)))
            {
                join_prose(output.last_mut().unwrap(), &p);
            } else {
                output.push(p);
            }
            last = if literal { String::new() } else { key };
        }
        append_notes(&mut output, notes);
        output.join("\n\n")
    }
}

pub fn append_notes(parts: &mut Vec<String>, notes: BTreeMap<i64, Vec<String>>) {
    if !notes.is_empty() {
        parts.push("## 页下注".to_owned());
    }
    for (page, entries) in notes {
        parts.push(format!("**第 {page} 页**"));
        parts.extend(entries);
    }
}

pub(super) fn compact(s: &str) -> String {
    // MinerU's flat Markdown dehyphenates line wraps that its layout retains,
    // e.g. "net- works". This key identifies a paragraph without editing it.
    static LINE_WRAP: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"([A-Za-z])[-\x{00ad}]\s+([a-z])").unwrap());
    LINE_WRAP
        .replace_all(s, "$1$2")
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '$')
        .collect()
}

fn edge(s: &str, prefix: bool) -> String {
    if prefix {
        s.chars().take(18).collect()
    } else {
        s.chars()
            .rev()
            .take(18)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn block(id: &str, kind: &str, value: &str, bbox: [i32; 4]) -> Value {
        json!({"block_id":id,"sub_type":kind,"bbox":bbox,"content":{"text":value,"kind":if kind=="figure" {"image"} else {"text"}}})
    }

    #[test]
    fn page_evidence_joins_prose_and_relocates_notes_without_eating_list_labels() {
        let head = "这些探索催生了多个具有很大潜力的";
        let tail = "晶体生成模型，其中包括晶体图网络。";
        let doc = json!({"pages":[{"width":600,"height":800,"blocks":[
            block("list","body","(b)",[10,400,20,410]),
            block("first","body",head,[310,600,550,742]),
            block("note","page_footnote","经费来源：基金 A。",[20,751,270,774])
        ]},{"width":600,"height":800,"blocks":[
            block("panel","body","(b)",[180,315,192,328]),
            block("second","body",tail,[46,62,285,182]),
            block("figure","figure","",[50,323,540,581])
        ]}]});
        let flow = PageFlow::new(&doc);
        assert_eq!(flow.joins.get("second"), Some(&"first"));
        for preexisting in ["", "经费来源：基金 A。\n\n"] {
            let raw =
                format!("(b)\n\n{head}\n\n{preexisting}(b)\n\n{tail}\n\n~~~text\n\n(b)\n\n~~~");
            let md = flow.provider_body(&raw);
            assert!(md.contains(&format!("{head}{tail}")));
            assert!(md.starts_with("(b)\n\n") && md.contains("~~~text\n\n(b)\n\n~~~"));
            assert_eq!(md.matches("经费来源").count(), 1);
            assert!(md.contains("## 页下注\n\n**第 1 页**"));
        }
    }

    #[test]
    fn panel_label_on_the_image_line_break_preserves_the_full_caption() {
        let doc = json!({"pages":[{"blocks":[
            block("img","figure","",[10,20,280,170]),
            block("label","chart_caption","(a)",[110,165,122,178])
        ]}]});
        let md = PageFlow::new(&doc)
            .provider_body("![](images/sample.jpg)  \n(a)  \nFigure 1. (a) left panel.");
        assert_eq!(md, "![](images/sample.jpg)  \nFigure 1. (a) left panel.");
    }

    #[test]
    fn boundary_needs_layout_and_a_continuing_sentence() {
        let page = json!({"height":800,"width":600});
        let mut l = block(
            "a",
            "body",
            "A paragraph with a broken soft\u{ad}",
            [50, 560, 550, 740],
        );
        let mut r = block("b", "body", "ware example in the text.", [50, 70, 550, 170]);
        assert!(continues(&l, &page, &r, &page));
        let mut joined = text(&l).to_owned();
        join_prose(&mut joined, text(&r));
        assert!(joined.contains("software example"));
        r["sub_type"] = json!("heading");
        assert!(!continues(&l, &page, &r, &page));
        r["sub_type"] = json!("body");
        l["content"]["text"] = json!("This paragraph is complete.");
        assert!(!continues(&l, &page, &r, &page));
        l["content"]["text"] = json!("A paragraph without punctuation");
        r["bbox"] = json!([50, 470, 240, 560]);
        assert!(!continues(&l, &page, &r, &page));
    }

    #[test]
    fn abstracts_keep_their_text_and_one_title_anchors_the_outline() {
        let md="# Main paper\n\n摘 要：材料 $E_1$ 的结果。\n\n## 1 Introduction\n\n##### Experiment\n\n## 参考文献\n\n# Alternate title\n\n## Extended Abstract\n\nExtended Abstract: First paragraph.\n\nSecond paragraph.\n\n~~~md\n# Literal heading\nAbstract: example\n~~~";
        let out = super::super::document_headings(md);
        assert!(out.contains("## 摘要\n\n材料 $E_1$ 的结果。") && out.contains("### Experiment"));
        assert!(out.contains(
            "## Alternate title\n\n### Extended Abstract\n\nFirst paragraph.\n\nSecond paragraph."
        ));
        assert!(out.contains("~~~md\n# Literal heading\nAbstract: example\n~~~"));
    }
}
