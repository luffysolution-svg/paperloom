//! 阅读入口和翻译覆盖要用的页数：原文 PDF 和每个任务的译文 PDF。
//!
//! 以前每次请求都把这几份 PDF 用 lopdf 整份载入（解出对象表和全部流）只为数页数；书籍详情的
//! 「进度」分区任务状态一变就重取，几百页带图的书每次几十 MB 内存、几百毫秒。现在按文件戳
//! （路径、大小、修改时间到纳秒、inode）缓存：文件没变就不再解析；原地重排版、换版本都会改戳。
//!
//! 一本书的页数，两个接口用同一个函数 [`book_page_count`]：原文 PDF 的实际页数为准，读不出来
//! （原文不在磁盘上、坏了）才退回 `documents.page_count`。

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, OnceLock};

/// 最多记多少个文件。满了整个清掉重来：页数重算一次不贵，不值得做 LRU。
const MAX_ENTRIES: usize = 4096;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct Stamp {
    len: u64,
    modified_nanos: u128,
    inode: u64,
}

impl Stamp {
    fn of(path: &Path) -> Option<Self> {
        let meta = std::fs::metadata(path).ok()?;
        let modified_nanos = meta
            .modified()
            .ok()?
            .duration_since(std::time::UNIX_EPOCH)
            .ok()?
            .as_nanos();
        Some(Self { len: meta.len(), modified_nanos, inode: inode(&meta) })
    }
}

#[cfg(unix)]
fn inode(meta: &std::fs::Metadata) -> u64 {
    std::os::unix::fs::MetadataExt::ino(meta)
}

#[cfg(not(unix))]
fn inode(_meta: &std::fs::Metadata) -> u64 {
    0
}

/// 读不出页数（不是 PDF、坏了）也记下来：同一个戳再读一次结果一样。
type Entry = (Stamp, Option<usize>);

fn cache() -> &'static Mutex<HashMap<PathBuf, Entry>> {
    static CACHE: OnceLock<Mutex<HashMap<PathBuf, Entry>>> = OnceLock::new();
    CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// PDF 的页数；文件不在或读不出来是 `None`。
pub(crate) fn pdf_page_count(path: &Path) -> Option<usize> {
    let stamp = Stamp::of(path)?;
    {
        let cache = cache().lock().unwrap_or_else(|e| e.into_inner());
        if let Some((cached, count)) = cache.get(path) {
            if *cached == stamp {
                return *count;
            }
        }
    }
    // 解析放在锁外面：大 PDF 要几百毫秒，不能挡住别的书。
    let count = lopdf::Document::load(path).ok().map(|document| document.get_pages().len());
    // 解析期间文件被换了：这次的结果按旧戳记，下一次戳对不上会重算。
    let mut cache = cache().lock().unwrap_or_else(|e| e.into_inner());
    if cache.len() >= MAX_ENTRIES {
        cache.clear();
    }
    cache.insert(path.to_path_buf(), (stamp, count));
    count
}

/// 一本书的页数：原文 PDF 的实际页数，读不出来退回数据库里记的 `recorded`（0 表示没记）。
pub(crate) fn book_page_count(source_pdf: Option<&Path>, recorded: u32) -> u32 {
    source_pdf
        .and_then(pdf_page_count)
        .map(|count| count as u32)
        .filter(|count| *count > 0)
        .unwrap_or(recorded)
}

#[cfg(test)]
mod tests {
    use super::*;
    use retainpdf_api_base::test_fixtures::minimal_pdf_bytes;

    #[test]
    fn the_book_page_count_prefers_the_source_pdf_and_falls_back_to_the_record() {
        let dir = std::env::temp_dir().join(format!("retain-page-count-{:016x}", fastrand::u64(..)));
        std::fs::create_dir_all(&dir).unwrap();
        let pdf = dir.join("book.pdf");
        std::fs::write(&pdf, minimal_pdf_bytes(200, 280)).unwrap();
        let broken = dir.join("broken.pdf");
        std::fs::write(&broken, b"nope").unwrap();
        assert_eq!(book_page_count(Some(&pdf), 12), 1, "原文 PDF 为准，不信数据库里记的");
        assert_eq!(book_page_count(Some(&broken), 12), 12);
        assert_eq!(book_page_count(Some(&dir.join("missing.pdf")), 7), 7);
        assert_eq!(book_page_count(None, 0), 0);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
