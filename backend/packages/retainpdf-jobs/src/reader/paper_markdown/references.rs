use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

static ENTRY: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\s*(?:\[(\d+)\]|\((\d+)\)|(\d+)[.)、])\s*\S").unwrap());
static HEADING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:\d+[.)]?\s*)?(?:references(?: and notes)?|bibliography|参考文献|参考资料)\s*[:：]?$").unwrap()
});
static CHAPTER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:第[一二三四五六七八九十百0-9]+章|chapter\s+[0-9ivx]+\b)").unwrap()
});
static YEAR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(?:19|20)\d{2}\b").unwrap());
static CITE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?ix)
    (?s:<math\b[^>]*>.*?</math\s*>|<pre\b[^>]*>.*?</pre\s*>|<code\b[^>]*>.*?</code\s*>) | !?\[\[ [^\n]*? \]\] | !?\[ [^\]\n]* \]\( [^\n)]* \) |
    <sup>\s*\[?([0-9][0-9,，;；\s–—\x{f02d}-]*)\]?\s*</sup> |
    \$\s*\^\s*\{\s*\[?([0-9][0-9,，;；\s–—\x{f02d}-]*)\]?\s*\}\s*\$ |
    \[([0-9][0-9,，;；\s–—\x{f02d}-]*)\] | <[^>\n]+>
").unwrap()
});

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

/// Link only references with a unique, existing target in the same chapter.
/// Sections correspond to OCR blocks, or to a single provider Markdown file.
pub fn link_sections(sections: &mut [String], reference_blocks: &[bool]) {
    let all = sections.join("\n");
    let protected = super::math::protected_ranges(&all);
    static HTML_TABLE: LazyLock<Regex> =
        LazyLock::new(|| Regex::new(r"(?is)<table\b[^>]*>.*?</table\s*>").unwrap());
    let tables: Vec<_> = HTML_TABLE.find_iter(&all).map(|m| m.range()).collect();
    let mut line_start = 0;
    let mut literal_lines = HashSet::new();
    let mut lines: Vec<(usize, usize, String)> = Vec::new();
    let mut scope = 0;
    let mut bibliography = false;
    let mut entries = HashMap::<usize, (usize, u32)>::new();
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
            if HEADING.is_match(title) {
                bibliography = true;
            } else if line.starts_with('#') {
                bibliography = false;
            }
            if bibliography || reference_blocks.get(i) == Some(&true) {
                if let Some(n) = number(line) {
                    entries.insert(lines.len(), (scope, n));
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
    if targets.is_empty() {
        return;
    }
    let mut offset = 0;
    for (i, (_, chapter, line)) in lines.iter_mut().enumerate() {
        let start = offset;
        offset += line.len() + 1;
        if entries.contains_key(&i) {
            continue;
        }
        let in_table = line.trim_start().starts_with('|');
        *line = CITE.replace_all(line, |caps: &regex::Captures<'_>| {
            let whole = caps.get(0).unwrap();
            let Some(list) = caps.iter().skip(1).flatten().next() else {
                return whole.as_str().to_owned();
            };
            let pos = start + whole.start();
            let in_math = protected.iter().any(|r| r.contains(&pos));
            let math_cite = caps.get(2).is_some() && protected.iter().any(|r|r.start==pos);
            let raised = caps.get(3).is_none();
            if (in_math && !math_cite) || (raised && !whole.as_str().contains('[')
                && list.as_str().trim().parse::<u32>().is_ok()) {
                return whole.as_str().to_owned();
            }
            let html_cell = tables.iter().any(|r|r.contains(&pos));
            let mut links = Vec::new();
            for part in list.as_str().split([',','，',';','；']) {
                let Some(numbers) = citation_range(part) else {return whole.as_str().to_owned()};
                for number in numbers {
                    if !matches!(targets.get(&(*chapter,number)),Some(Some(_))) {
                        return whole.as_str().to_owned();
                    }
                    let id = anchor(*chapter,number);
                    let label = if raised {
                        number.to_string().bytes().map(|b|['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'][(b-b'0') as usize]).collect()
                    } else {number.to_string()};
                    let link = if html_cell {
                        format!(r##"<a class="internal-link" data-href="#^{id}" href="#^{id}">{label}</a>"##)
                    } else {
                        let pipe = if in_table {r"\|"} else {"|"};
                        format!("[[#^{id}{pipe}{label}]]")
                    };
                    links.push(link);
                }
            }
            let links = links.join(", ");
            if raised {links} else {format!("&#91;{links}&#93;")}
        }).into_owned();
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

fn citation_range(part: &str) -> Option<std::ops::RangeInclusive<u32>> {
    let mut parts = part.trim().split(['-', '–', '—', '\u{f02d}']);
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
