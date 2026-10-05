use once_cell::sync::Lazy;
use regex::{Captures, Regex};

static HTML_TABLE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<table\b[^>]*>.*?</table\s*>").unwrap());
static MINERU_EQUATION: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"(?is)<eq\b[^>]*>(.*?)</eq\s*>").unwrap());

/// MinerU marks formulas in HTML cells with <eq>; Obsidian's optional
/// HTML Table Math plugin consumes dollar-delimited math. Keep the table
/// structure and text outside tables unchanged.
pub(super) fn normalize_table_math(markdown: &str) -> String {
    HTML_TABLE
        .replace_all(markdown, |table: &Captures<'_>| {
            MINERU_EQUATION
                .replace_all(&table[0], |equation: &Captures<'_>| {
                    let body = equation[1].trim();
                    if body.is_empty() || body.starts_with('$') && body.ends_with('$') {
                        body.to_string()
                    } else {
                        format!("${body}$")
                    }
                })
                .into_owned()
        })
        .into_owned()
}
