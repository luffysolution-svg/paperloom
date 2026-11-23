use regex::Regex;
use std::collections::HashMap;
use std::sync::LazyLock;

static ENTRY: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^([\p{L}][^()\n]+?)\s*[（(]((?:19|20)[0-9]{2}[a-z]?)[)）]\s*\.?\s+\S").unwrap()
});
static INITIALS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?:^|\s)[\p{Lu}](?:[.-]?[\p{Lu}])*\.?$").unwrap());
static YEAR: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?:19|20)[0-9]{2}[a-z]?").unwrap());

fn normalized(text: &str) -> String {
    static MARKS: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\p{M}+").unwrap());
    let decomposed = icu_normalizer::DecomposingNormalizer::new_nfd().normalize(text);
    MARKS
        .replace_all(&decomposed, "")
        .replace('’', "'")
        .replace(['‐', '‑'], "-")
        .replace("等人", " et al")
        .replace('等', " et al")
        .replace(['&', '和', '与'], " and ")
        .replace("et al.", "et al")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}

#[derive(Default)]
pub(super) struct AuthorYears {
    // Within a chapter, several works can have the same author label and year.
    by_year: HashMap<(usize, String), Vec<(String, usize)>>,
}

impl AuthorYears {
    pub fn insert(&mut self, scope: usize, text: &str, ordinal: usize) -> bool {
        let Some(entry) = ENTRY.captures(text.trim()) else {
            return false;
        };
        let authors = entry[1].trim_end_matches(['.', ' ']);
        let names: Vec<_> = authors
            .split(',')
            .map(|name| {
                name.trim()
                    .trim_start_matches('&')
                    .trim()
                    .trim_end_matches(" et al")
            })
            .map(|name| INITIALS.replace(name, ""))
            .filter(|name| !name.is_empty())
            .collect();
        let Some(first) = names.first() else {
            return false;
        };
        let targets = self
            .by_year
            .entry((scope, entry[2].to_owned()))
            .or_default();
        let label = match names.as_slice() {
            [name] if !authors.ends_with("et al") => name.to_string(),
            [a, b] if !authors.ends_with("et al") => format!("{a} and {b}"),
            _ => format!("{first} et al"),
        };
        targets.push((normalized(&label), ordinal));
        // Corporate authors can end in an uppercase abbreviation (State Council PRC).
        if names.len() == 1 && label != authors {
            targets.push((normalized(authors), ordinal));
        }
        true
    }

    pub fn link(&self, scope: usize, before: &str, years: &str, html: bool, table: bool) -> String {
        if self.by_year.is_empty() {
            return years.to_owned();
        }
        let author = normalized(before.trim_end_matches([' ', '\t', ',', '，']));
        YEAR.replace_all(years, |capture: &regex::Captures<'_>| {
            let year = &capture[0];
            let mut matches = self
                .by_year
                .get(&(scope, year.to_owned()))
                .into_iter()
                .flatten()
                .filter_map(|(name, id)| {
                    let prefix = author.strip_suffix(name)?;
                    // A suffix inside a surname or after an unknown co-author is not a match.
                    let following_coauthor = !name.contains(" and ")
                        && !name.ends_with(" et al")
                        && prefix
                            .trim_end()
                            .strip_suffix(" and")
                            .is_some_and(|p| p.ends_with(char::is_alphabetic));
                    (!prefix
                        .ends_with(|c: char| c.is_ascii_alphabetic() || matches!(c, '-' | '\''))
                        && !following_coauthor)
                        .then_some(*id)
                });
            match matches.next() {
                Some(id) if matches.all(|other| other == id) => {
                    super::references::block_link(&format!("ref-author-{id}"), year, html, table)
                }
                _ => year.to_owned(),
            }
        })
        .into_owned()
    }
}
