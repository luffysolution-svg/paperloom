//! 规范化 OCR 文档（document.v1.json）：边读边算证据哈希，只留前几页。
//!
//! 以前整份读进内存（最多 256MB）再建成 `serde_json::Value`（内存是文件的数倍），而标题候选只看
//! 前 8 页。现在按流读：字节同时喂给 sha256（证据哈希和以前逐字节相同，已有建议照样能去重），
//! JSON 只把 `pages` 的前 [`TITLE_PAGES`] 页建成 `Value`，其余跳过。

use std::fmt;
use std::fs::File;
use std::io::{self, BufReader, Read};
use std::path::Path;

use serde::de::{self, DeserializeSeed, IgnoredAny, MapAccess, SeqAccess, Visitor};
use serde::Deserializer;
use serde_json::Value;
use sha2::{Digest, Sha256};

/// 标题候选只看前几页。
pub(super) const TITLE_PAGES: usize = 8;

pub(super) enum NormalizedReadError {
    /// 文件读不了。
    Io(io::Error),
    /// 不是合法 JSON。
    Invalid(serde_json::Error),
}

/// 读规范化文档：证据哈希接着 `hasher` 往下算（先写 `normalized_document\0` 再写全部字节），
/// 返回前 [`TITLE_PAGES`] 页（`pages` 不是数组时为空，和以前一样）。
pub(super) fn read_title_pages(path: &Path, hasher: &mut Sha256) -> Result<Vec<Value>, NormalizedReadError> {
    let file = File::open(path).map_err(NormalizedReadError::Io)?;
    hasher.update(b"normalized_document\0");
    let mut reader = HashingReader { inner: BufReader::new(file), hasher, error: None };
    let parsed = {
        let mut deserializer = serde_json::Deserializer::from_reader(&mut reader);
        // `end` 一直读到文件尾（确认后面只有空白），所以全部字节都进了哈希。
        TopLevel.deserialize(&mut deserializer).and_then(|pages| deserializer.end().map(|()| pages))
    };
    if let Some(error) = reader.error.take() {
        return Err(NormalizedReadError::Io(error));
    }
    parsed.map_err(NormalizedReadError::Invalid)
}

struct HashingReader<'a, R> {
    inner: R,
    hasher: &'a mut Sha256,
    error: Option<io::Error>,
}

impl<R: Read> Read for HashingReader<'_, R> {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        match self.inner.read(buf) {
            Ok(read) => {
                self.hasher.update(&buf[..read]);
                Ok(read)
            }
            Err(error) => {
                let kind = error.kind();
                self.error.get_or_insert(error);
                Err(io::Error::from(kind))
            }
        }
    }
}

/// 顶层：只要 `pages`，其余键跳过；顶层不是对象就当没有页。
struct TopLevel;

impl<'de> DeserializeSeed<'de> for TopLevel {
    type Value = Vec<Value>;

    fn deserialize<D: Deserializer<'de>>(self, deserializer: D) -> Result<Self::Value, D::Error> {
        deserializer.deserialize_any(self)
    }
}

impl<'de> Visitor<'de> for TopLevel {
    type Value = Vec<Value>;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("a normalized document")
    }

    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        let mut pages = Vec::new();
        while let Some(key) = map.next_key::<String>()? {
            if key == "pages" {
                pages = map.next_value_seed(FirstPages)?;
            } else {
                map.next_value::<IgnoredAny>()?;
            }
        }
        Ok(pages)
    }

    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        while seq.next_element::<IgnoredAny>()?.is_some() {}
        Ok(Vec::new())
    }

    fn visit_bool<E: de::Error>(self, _: bool) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_i64<E: de::Error>(self, _: i64) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_u64<E: de::Error>(self, _: u64) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_f64<E: de::Error>(self, _: f64) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_str<E: de::Error>(self, _: &str) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
}

/// `pages`：前 [`TITLE_PAGES`] 页建成 `Value`，其余跳过；不是数组就当没有页。
struct FirstPages;

impl<'de> DeserializeSeed<'de> for FirstPages {
    type Value = Vec<Value>;

    fn deserialize<D: Deserializer<'de>>(self, deserializer: D) -> Result<Self::Value, D::Error> {
        deserializer.deserialize_any(self)
    }
}

impl<'de> Visitor<'de> for FirstPages {
    type Value = Vec<Value>;

    fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
        formatter.write_str("normalized document pages")
    }

    fn visit_seq<A: SeqAccess<'de>>(self, mut seq: A) -> Result<Self::Value, A::Error> {
        let mut pages = Vec::new();
        while pages.len() < TITLE_PAGES {
            match seq.next_element::<Value>()? {
                Some(page) => pages.push(page),
                None => return Ok(pages),
            }
        }
        while seq.next_element::<IgnoredAny>()?.is_some() {}
        Ok(pages)
    }

    fn visit_map<A: MapAccess<'de>>(self, mut map: A) -> Result<Self::Value, A::Error> {
        while map.next_entry::<IgnoredAny, IgnoredAny>()?.is_some() {}
        Ok(Vec::new())
    }

    fn visit_bool<E: de::Error>(self, _: bool) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_i64<E: de::Error>(self, _: i64) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_u64<E: de::Error>(self, _: u64) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_f64<E: de::Error>(self, _: f64) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_str<E: de::Error>(self, _: &str) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
    fn visit_unit<E: de::Error>(self) -> Result<Self::Value, E> {
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn read(bytes: &[u8]) -> (Result<Vec<Value>, NormalizedReadError>, String) {
        let path = std::env::temp_dir().join(format!("normalized-{}.json", fastrand::u64(..)));
        std::fs::write(&path, bytes).unwrap();
        let mut hasher = Sha256::new();
        let pages = read_title_pages(&path, &mut hasher);
        let _ = std::fs::remove_file(path);
        (pages, hex(hasher.finalize()))
    }

    fn whole_file_hash(bytes: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(b"normalized_document\0");
        hasher.update(bytes);
        hex(hasher.finalize())
    }

    fn hex(digest: impl AsRef<[u8]>) -> String {
        digest.as_ref().iter().map(|byte| format!("{byte:02x}")).collect()
    }

    #[test]
    fn keeps_only_the_first_pages_and_hashes_every_byte() {
        let pages: Vec<Value> = (0..20).map(|index| serde_json::json!({ "page_index": index, "blocks": [] })).collect();
        let bytes = serde_json::to_vec_pretty(&serde_json::json!({
            "schema": "document.v1",
            "pages": pages,
            "trailing": { "nested": [1, 2, 3] }
        }))
        .unwrap();
        let (read_pages, hash) = read(&bytes);
        let read_pages = read_pages.ok().unwrap();
        assert_eq!(read_pages.len(), TITLE_PAGES);
        assert_eq!(read_pages[7]["page_index"], 7);
        assert_eq!(hash, whole_file_hash(&bytes));
    }

    #[test]
    fn non_array_pages_and_non_object_documents_have_no_pages() {
        for bytes in [&br#"{"pages": {"0": {}}}"#[..], br#"[1, 2]"#, br#""text""#, br#"{"other": 1}"#] {
            let (pages, hash) = read(bytes);
            assert!(pages.ok().unwrap().is_empty());
            assert_eq!(hash, whole_file_hash(bytes));
        }
    }

    #[test]
    fn invalid_json_is_reported_as_invalid() {
        for bytes in [&b"{ not json"[..], br#"{"pages": []} trailing"#] {
            let (pages, _) = read(bytes);
            assert!(matches!(pages, Err(NormalizedReadError::Invalid(_))));
        }
    }
}
