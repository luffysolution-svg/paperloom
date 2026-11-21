#[path = "view/common.rs"]
mod common;
#[path = "view/job.rs"]
mod job;
#[path = "view/live_translation.rs"]
mod live_translation;
#[cfg(test)]
#[path = "view/test_support.rs"]
mod test_support;
#[cfg(test)]
#[path = "view/tests.rs"]
mod tests;
#[path = "view/translation.rs"]
mod translation;

pub use common::*;
pub use job::*;
pub use live_translation::*;
pub use translation::*;

pub fn to_absolute_url(base_url: &str, path: &str) -> String {
    format!("{}{}", base_url.trim_end_matches('/'), path)
}
