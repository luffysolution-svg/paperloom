use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

static ENTRY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(?:\[(\d+)\]|\((\d+)\)|(\d+)[.)、])\s*\S").unwrap());
static BARE_ENTRY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*([1-9][0-9]*)[ \t]+\p{L}").unwrap());
static HEADING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:\d+[.)]?\s*)?(?:references(?: and notes)?|bibliography|参考文献|参考资料)\s*[:：]?$").unwrap()
});
pub fn is_heading(text: &str) -> bool {
    HEADING.is_match(text.trim())
}
static CHAPTER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:第[一二三四五六七八九十百0-9]+章|chapter\s+[0-9ivx]+\b)").unwrap()
});
static YEAR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(?:19|20)\d{2}\b").unwrap());
const SUPERSCRIPT_DIGITS: [char; 10] = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
// Some OCR providers label bylines as body text, including a second-language byline at the end.
static BYLINE: LazyLock<Regex> = LazyLock::new(|| {
    let name =
        r"(?:(?:\p{Lu}[\p{L}\p{M}.'’‐-]*\s+){1,5}\p{Lu}[\p{L}\p{M}.'’‐-]*|(?:\p{Han}\s*){2,5})";
    let mark = r"(?:<sup>[\d,*#†‡\\\s]+</sup>|\$\s*\^\{[\d,*#†‡\\\s]+\}\s*\$|[⁰¹²³⁴⁵⁶⁷⁸⁹]+)";
    Regex::new(&format!(r"^\s*(?:{name}\s*[,，]?\s*{mark}\s*[,，、]?\s*(?:and\s+)?)+{name}\s*[,，]?\s*{mark}\s*[.,，]?\s*$")).unwrap()
});
static CITE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?ix)
    (?s:<math\b[^>]*>.*?</math\s*>|<pre\b[^>]*>.*?</pre\s*>|<code\b[^>]*>.*?</code\s*>|<a\b[^>]*>.*?</a\s*>) | !?\[\[ [^\n]*? \]\] | !?\[ [^\]\n]* \]\( [^\n)]* \) |
    <sup>\s*\[(?<split>[0-9,，;；\s–—−\x{f02d}-]+(?:</sup>\s*<sup>[0-9,，;；\s–—−\x{f02d}-]+)+)\]\s*</sup> |
    <sup>\s*\[?(?<html>[0-9][0-9,，;；\s–—−\x{f02d}-]*)\]?\s*</sup> |
    \$\s*\^\s*\{\s*\[?(?<tex>[0-9][0-9,，;；\s–—−\x{f02d}-]*)\]?\s*\}\s*\$ |
    \[(?<bracket>[0-9][0-9,，;；\s–—−\x{f02d}-]*)\] |
    (?<unicode>[⁰¹²³⁴⁵⁶⁷⁸⁹]+(?:[\x20\t]*[,，;；–—⁻−\x{f02d}-][\x20\t]*[⁰¹²³⁴⁵⁶⁷⁸⁹]+)*) |
    (?:[(（,，][\x20\t]*|[\x20\t]+in[\x20\t]+|[于在]\s*)(?<years>(?:19|20)[0-9]{2}[a-z]?(?:[\x20\t]*[,，][\x20\t]*(?:19|20)[0-9]{2}[a-z]?)*)(?-u:\b) | <[^>\n]+>
").unwrap()
});

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum SectionKind {
    Prose,
    Reference,
    Metadata,
}

impl SectionKind {
    pub fn from_roles(sub_type: Option<&str>, semantic: Option<&str>) -> Self {
        match (sub_type, semantic) {
            (Some("reference_entry"), _) | (_, Some("reference")) => Self::Reference,
            (Some("metadata" | "affiliation" | "footnote" | "page_footnote"), _)
            | (_, Some("affiliation"))
            | (None | Some("unknown"), Some("metadata")) => Self::Metadata,
            _ => Self::Prose,
        }
    }

    pub fn from_block(block: &serde_json::Value) -> Self {
        Self::from_roles(block["sub_type"].as_str(), block["semantic_role"].as_str())
    }
}

fn number(line: &str) -> Option<u32> {
    ENTRY
        .captures(line)?
        .iter()
        .skip(1)
        .flatten()
        .next()?
        .as_str()
        .parse()
        .ok()
}

pub(super) fn entry_number(line: &str) -> Option<u32> {
    // A DOI or publication year can begin a continuation line in a bibliography.
    static CONTINUATION: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?i)^\s*(?:10\.[0-9]{4,9}/|(?:19|20)[0-9]{2}\.\s*(?:arxiv:|https?://))")
            .unwrap()
    });
    if CONTINUATION.is_match(line) {
        return None;
    }
    number(line).or_else(|| BARE_ENTRY.captures(line)?[1].parse().ok())
}

pub(super) fn block_link(id: &str, label: &str, html: bool, table: bool) -> String {
    if html {
        format!(r##"<a class="internal-link" data-href="#^{id}" href="#^{id}">{label}</a>"##)
    } else {
        let pipe = if table { r"\|" } else { "|" };
        format!("[[#^{id}{pipe}{label}]]")
    }
}

/// Link only references with a unique, existing target in the same chapter.
/// Sections correspond to OCR blocks, or to a single provider Markdown file.
pub fn link_sections(sections: &mut [String], kinds: &[SectionKind]) {
    let all = sections.join("\n");
    let protected = super::math::protected_ranges(&all);
    static HTML_BLOCK: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"(?is)<table\b[^>]*>.*?</table\s*>|<div\b[^>]*>.*?</div\s*>").unwrap()
    });
    let html_blocks: Vec<_> = HTML_BLOCK.find_iter(&all).map(|m| m.range()).collect();
    let mut line_start = 0;
    let mut literal_lines = HashSet::new();
    let mut lines: Vec<(usize, usize, String)> = Vec::new();
    let mut scope = 0;
    let mut bibliography = false;
    let mut entries = HashMap::<usize, (usize, u32)>::new();
    let mut author_years = super::author_year::AuthorYears::default();
    let mut author_entries = HashMap::new();
    for (i, section) in sections.iter().enumerate() {
        for line in section.split('\n') {
            let literal = protected
                .iter()
                .any(|r| r.contains(&line_start) && matches!(all.as_bytes()[r.start], 96 | b'~'));
            line_start += line.len() + 1;
            if literal {
                literal_lines.insert(lines.len());
                lines.push((i, scope, line.to_owned()));
                continue;
            }
            let title = line.trim().trim_start_matches('#').trim().trim_matches('*');
            if CHAPTER.is_match(title) && (line.starts_with('#') || line.len() < 100) {
                scope += 1;
                bibliography = false;
            }
            if is_heading(title) || kinds.get(i) == Some(&SectionKind::Reference) {
                bibliography = true;
            } else if line.starts_with('#') {
                bibliography = false;
            }
            if bibliography {
                if let Some(n) = entry_number(line) {
                    entries.insert(lines.len(), (scope, n));
                } else {
                    let ordinal = author_entries.len() + 1;
                    if author_years.insert(scope, line, ordinal) {
                        author_entries.insert(lines.len(), ordinal);
                    }
                }
            }
            lines.push((i, scope, line.to_owned()));
        }
    }
    // Some providers omit the bibliography heading but preserve the numbered run.
    let mut run = Vec::new();
    for i in 0..=lines.len() {
        if i < lines.len() && lines[i].2.trim().is_empty() {
            continue;
        }
        let n = lines
            .get(i)
            .filter(|_| !literal_lines.contains(&i))
            .and_then(|l| number(&l.2));
        if n != Some(run.len() as u32 + 1) {
            if run.len() >= 3 && run.iter().any(|&j: &usize| YEAR.is_match(&lines[j].2)) {
                for &j in &run {
                    entries
                        .entry(j)
                        .or_insert((lines[j].1, number(&lines[j].2).unwrap()));
                }
            }
            run.clear();
        }
        if n == Some(run.len() as u32 + 1) {
            run.push(i);
        }
    }
    let mut targets = HashMap::new();
    for (&i, &key) in &entries {
        targets
            .entry(key)
            .and_modify(|v| *v = None)
            .or_insert(Some(i));
    }
    if targets.is_empty() && author_entries.is_empty() {
        return;
    }
    let mut offset = 0;
    for (i, (section, chapter, line)) in lines.iter_mut().enumerate() {
        let start = offset;
        offset += line.len() + 1;
        if entries.contains_key(&i)
            || author_entries.contains_key(&i)
            || kinds
                .get(*section)
                .is_some_and(|k| *k != SectionKind::Prose)
        {
            continue;
        }
        if BYLINE.is_match(line) {
            continue;
        }
        let in_table = line.trim_start().starts_with('|');
        *line = CITE
            .replace_all(line, |caps: &regex::Captures<'_>| {
                let whole = caps.get(0).unwrap();
                let Some(list) = caps.iter().skip(1).flatten().next() else {
                    return whole.as_str().to_owned();
                };
                let pos = start + whole.start();
                let literal = protected.iter().find(|r| r.contains(&pos));
                let standalone_tex =
                    caps.name("tex").is_some() && literal == Some(&(pos..start + whole.end()));
                if literal.is_some() && !standalone_tex {
                    return whole.as_str().to_owned();
                }
                let html_cell = html_blocks.iter().any(|r| r.contains(&pos));
                if let Some(years) = caps.name("years") {
                    let prefix = &line[whole.start()..years.start()];
                    return format!(
                        "{prefix}{}",
                        author_years.link(
                            *chapter,
                            &line[..whole.start()],
                            years.as_str(),
                            html_cell,
                            in_table
                        )
                    );
                }
                let raised = caps.name("bracket").is_none();
                if raised
                    && !whole.as_str().contains('[')
                    && !prose_superscript(&line[..whole.start()], &line[whole.end()..])
                {
                    return whole.as_str().to_owned();
                }
                let mut links = Vec::new();
                let mut linked = false;
                let label = |s: &str| {
                    s.chars()
                        .map(|c| {
                            if raised && c.is_ascii_digit() {
                                SUPERSCRIPT_DIGITS[(c as u8 - b'0') as usize]
                            } else {
                                c
                            }
                        })
                        .collect::<String>()
                };
                static SUP_BREAK: LazyLock<Regex> =
                    LazyLock::new(|| Regex::new(r"(?i)</sup>\s*<sup>").unwrap());
                let values = if caps.name("split").is_some() {
                    SUP_BREAK.replace_all(list.as_str(), "")
                } else {
                    std::borrow::Cow::Borrowed(list.as_str())
                };
                for part in values.split([',', '，', ';', '；']) {
                    let Some(numbers) = citation_range(part).filter(|range| {
                        range
                            .clone()
                            .all(|n| matches!(targets.get(&(*chapter, n)), Some(Some(_))))
                    }) else {
                        links.push(label(part.trim()));
                        continue;
                    };
                    linked = true;
                    for number in numbers {
                        let id = anchor(*chapter, number);
                        links.push(block_link(
                            &id,
                            &label(&number.to_string()),
                            html_cell,
                            in_table,
                        ));
                    }
                }
                if !linked {
                    return whole.as_str().to_owned();
                }
                let links = links.join(", ");
                if raised {
                    links
                } else {
                    format!("&#91;{links}&#93;")
                }
            })
            .into_owned();
    }
    for (i, ordinal) in author_entries {
        let tail = format!(" ^ref-author-{ordinal}");
        if !lines[i].2.trim_end().ends_with(&tail) {
            lines[i].2.push_str(&tail);
        }
    }
    for (&(chapter, n), target) in &targets {
        let Some(i) = *target else { continue };
        let tail = format!(" ^{}", anchor(chapter, n));
        if !lines[i].2.trim_end().ends_with(&tail) {
            lines[i].2.push_str(&tail);
        }
    }
    for s in sections.iter_mut() {
        s.clear();
    }
    let mut last = None;
    for (i, _, line) in lines {
        if last == Some(i) {
            sections[i].push('\n');
        }
        sections[i].push_str(&line);
        last = Some(i);
    }
}

// An unbracketed superscript can also be an exponent, charge or isotope.
// Match the complete preceding token so names like GDB-17 remain prose.
fn prose_superscript(before: &str, after: &str) -> bool {
    static SCIENTIFIC_BASE: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"^(?:[0-9]+|[A-Za-z\p{Greek}]|[A-Z][a-z]|[kcdmunμµp]?(?:m|s|g|L|mol|Hz|Pa|J|V|W|A|eV))$").unwrap()
    });
    let before = before.trim_end();
    let base = before
        .rsplit(|c: char| !(c.is_alphanumeric() || c == '-'))
        .next()
        .unwrap_or("");
    before.ends_with(|c: char| c.is_alphanumeric() || ".,;:!?)]，。、；：！？）】".contains(c))
        && !after.starts_with(|c: char| c.is_ascii_alphabetic() || "⁺⁻₊₋".contains(c))
        && !SCIENTIFIC_BASE.is_match(base)
}

fn citation_range(part: &str) -> Option<std::ops::RangeInclusive<u32>> {
    let digits: String = part
        .chars()
        .map(|c| {
            SUPERSCRIPT_DIGITS
                .iter()
                .position(|&digit| digit == c)
                .map_or(c, |i| char::from(b'0' + i as u8))
        })
        .collect();
    let mut parts = digits.trim().split(['-', '–', '—', '−', '⁻', '\u{f02d}']);
    let start = parts.next()?.trim().parse::<u32>().ok()?;
    let end = match parts.next() {
        Some(n) => n.trim().parse().ok()?,
        None => start,
    };
    (parts.next().is_none() && end >= start && end - start < 50).then_some(start..=end)
}

fn anchor(chapter: usize, n: u32) -> String {
    if chapter == 0 {
        format!("ref-{n}")
    } else {
        format!("ref-{chapter}-{n}")
    }
}

static SI: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(fig(?:ure)?\.?|图|table|表|scheme|图式)\s*S\s*(\d+[a-z]?)\b").unwrap()
});
fn si_key(c: &regex::Captures<'_>) -> String {
    let kind = match c[1].to_ascii_lowercase().as_str() {
        "table" | "表" => "table",
        "scheme" | "图式" => "scheme",
        _ => "figure",
    };
    format!("{kind}-{}", c[2].to_lowercase())
}
pub fn supplement_caption(text: &str) -> Option<String> {
    let caps = SI.captures(text.trim())?;
    (caps.get(0)?.start() == 0).then(|| si_key(&caps))
}
pub fn link_supplements(
    text: &str,
    files: &[(String, std::collections::BTreeMap<String, usize>)],
    folder: &str,
) -> String {
    if files.is_empty() {
        return text.to_owned();
    }
    static LINK: LazyLock<Regex> = LazyLock::new(|| {
        Regex::new(r"!?\[\[[^\n]*?\]\]|!?\[[^\]\n]*\]\([^\n)]*\)|<[^>\n]+>").unwrap()
    });
    let mut protected = super::math::protected_ranges(text);
    protected.extend(LINK.find_iter(text).map(|m| m.range()));
    SI.replace_all(text, |c: &regex::Captures<'_>| {
        let m = c.get(0).unwrap();
        if protected.iter().any(|r| r.contains(&m.start())) {
            return m.as_str().to_string();
        }
        let key = si_key(c);
        let mut found = files
            .iter()
            .filter_map(|(name, pages)| pages.get(&key).map(|p| (name, format!("#page={p}"))));
        let target = found.next();
        if found.next().is_some() {
            return m.as_str().to_string();
        }
        let Some((name, fragment)) =
            target.or_else(|| (files.len() == 1).then(|| (&files[0].0, String::new())))
        else {
            return m.as_str().to_string();
        };
        let table = text[..m.start()]
            .rsplit('\n')
            .next()
            .is_some_and(|s| s.trim_start().starts_with('|'));
        format!(
            "[[{folder}/{name}{fragment}{}{}]]",
            if table { r"\|" } else { "|" },
            m.as_str()
        )
    })
    .into_owned()
}
