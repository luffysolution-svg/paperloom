//! 原文 PDF 的 Info Title：只解析 trailer 指的那一个对象，不把整本 PDF 的对象都解析一遍。
//!
//! 以前用 `lopdf::Document::load` 整本加载（每个对象都解析一遍、各页内容和图片都留在内存里），只为取一个
//! 标题。现在先按字节找 trailer（或交叉引用流字典）里最后一个 `/Info N G R`，再找最后一个
//! `N G obj`（增量更新时新版本追加在后面），只把这一个对象交给 lopdf 的解析器。
//! 找不到（Info 放在对象流里压缩了、`/Info` 直接写成字典）才退回整本解析，而且不保留各页的流内容。
//! 加密的 PDF 字符串是密文，直接不取 Info Title。

use std::path::Path;

use lopdf::xref::{Xref, XrefEntry, XrefType};
use lopdf::{Dictionary, Document, Object, ObjectId, Reader};

/// 原文 PDF 的 Info Title 原始字节（还没解码、没整理空白）；没有、读不了都是 `None`。
pub(super) fn pdf_info_title_bytes(path: &Path) -> Option<Vec<u8>> {
    let bytes = std::fs::read(path).ok()?;
    match light_info_title(&bytes) {
        Lookup::Found(title) => title,
        Lookup::FullParse => full_parse_info_title(path),
    }
}

enum Lookup {
    /// 轻量路径给出了结论（可能是「没有标题」）。
    Found(Option<Vec<u8>>),
    /// 轻量路径找不到 Info 对象，要整本解析。
    FullParse,
}

fn light_info_title(bytes: &[u8]) -> Lookup {
    if find_last(bytes, b"/Encrypt").is_some() {
        return Lookup::Found(None);
    }
    let Some(info_at) = find_last(bytes, b"/Info") else {
        return Lookup::Found(None);
    };
    let Some(info_id) = parse_reference(&bytes[info_at + b"/Info".len()..]) else {
        return Lookup::FullParse;
    };
    let Some(info) = read_single_object(bytes, info_id) else {
        return Lookup::FullParse;
    };
    let Ok(dictionary) = info.as_dict() else {
        return Lookup::Found(None);
    };
    Lookup::Found(title_bytes(dictionary, |id| read_single_object(bytes, id)))
}

/// 退路：整本解析，但流对象（页面内容、图片……）不留在内存里，只留对象流（Info 可能压在里面）。
fn full_parse_info_title(path: &Path) -> Option<Vec<u8>> {
    // lopdf 对顶层对象只看返回的是不是 None、留下的是原对象；对对象流里拆出来的对象留下的是返回值。
    // 对象流里不会再有流，所以流只在顶层出现，返回占位就行。
    fn keep_dictionaries(id: ObjectId, object: &mut Object) -> Option<(ObjectId, Object)> {
        match object {
            Object::Stream(stream) if stream.dict.type_is(b"ObjStm") => Some((id, Object::Null)),
            Object::Stream(_) => None,
            _ => Some((id, object.clone())),
        }
    }
    let document = Document::load_filtered(path, keep_dictionaries).ok()?;
    if document.trailer.get(b"Encrypt").is_ok() {
        return None;
    }
    let dictionary = match document.trailer.get(b"Info").ok()? {
        Object::Reference(id) => document.get_object(*id).ok()?.as_dict().ok()?,
        Object::Dictionary(dictionary) => dictionary,
        _ => return None,
    };
    title_bytes(dictionary, |id| document.get_object(id).ok().cloned())
}

fn title_bytes(dictionary: &Dictionary, resolve: impl Fn(ObjectId) -> Option<Object>) -> Option<Vec<u8>> {
    match dictionary.get(b"Title").ok()? {
        Object::String(bytes, _) => Some(bytes.clone()),
        Object::Reference(id) => match resolve(*id)? {
            Object::String(bytes, _) => Some(bytes),
            _ => None,
        },
        _ => None,
    }
}

/// 只解析编号为 `id` 的那一个对象：找文件里最后一个 `N G obj`，交给 lopdf 的解析器。
fn read_single_object(bytes: &[u8], id: ObjectId) -> Option<Object> {
    let offset = find_object_header(bytes, id)?;
    let mut reader = Reader { buffer: bytes, document: Document::new() };
    let mut table = Xref::new(id.0 + 1, XrefType::CrossReferenceTable);
    table.insert(id.0, XrefEntry::Normal { offset: u32::try_from(offset).ok()?, generation: id.1 });
    reader.document.reference_table = table;
    reader.get_object(id).ok()
}

/// `N G obj` 最后一次出现的位置，前面必须是行首或空白（`112 0 obj` 不算 `12 0 obj`）。
fn find_object_header(bytes: &[u8], (number, generation): ObjectId) -> Option<usize> {
    let header = format!("{number} {generation} obj");
    let mut end = bytes.len();
    while let Some(at) = find_last(&bytes[..end], header.as_bytes()) {
        if at == 0 || bytes[at - 1].is_ascii_whitespace() {
            return Some(at);
        }
        end = at;
    }
    None
}

/// `/Info` 后面的 ` 12 0 R`。
fn parse_reference(rest: &[u8]) -> Option<ObjectId> {
    let head = String::from_utf8_lossy(&rest[..rest.len().min(48)]);
    let mut parts = head.split_ascii_whitespace();
    let number = parts.next()?.parse::<u32>().ok()?;
    let generation = parts.next()?.parse::<u16>().ok()?;
    let after = parts.next()?.strip_prefix('R')?;
    (!after.starts_with(|c: char| c.is_ascii_alphanumeric())).then_some((number, generation))
}

/// `needle` 最后一次出现的位置。先按首字节往回找再比整段，几百 MB 的 PDF 也只是线性扫一遍。
fn find_last(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    let (&first, _) = needle.split_first()?;
    let mut end = haystack.len().checked_sub(needle.len())? + 1;
    while let Some(at) = haystack[..end].iter().rposition(|&byte| byte == first) {
        if haystack[at..].starts_with(needle) {
            return Some(at);
        }
        end = at;
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    fn pdf(objects: &[&str], trailer: &str) -> Vec<u8> {
        let mut bytes = b"%PDF-1.4\n".to_vec();
        let mut offsets = Vec::new();
        for (index, object) in objects.iter().enumerate() {
            offsets.push(bytes.len());
            bytes.extend_from_slice(format!("{} 0 obj\n{object}\nendobj\n", index + 1).as_bytes());
        }
        let xref = bytes.len();
        bytes.extend_from_slice(format!("xref\n0 {}\n0000000000 65535 f \n", offsets.len() + 1).as_bytes());
        for offset in offsets {
            bytes.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
        }
        bytes.extend_from_slice(format!("trailer\n{trailer}\nstartxref\n{xref}\n%%EOF\n").as_bytes());
        bytes
    }

    fn title(bytes: &[u8]) -> Option<Vec<u8>> {
        let path = std::env::temp_dir().join(format!("pdf-info-{}.pdf", fastrand::u64(..)));
        std::fs::write(&path, bytes).unwrap();
        let title = pdf_info_title_bytes(&path);
        let _ = std::fs::remove_file(path);
        title
    }

    const CATALOG: &str = "<< /Type /Catalog /Pages 2 0 R >>";
    const PAGES: &str = "<< /Type /Pages /Kids [] /Count 0 >>";

    #[test]
    fn reads_the_title_through_the_trailer_reference() {
        let bytes = pdf(&[CATALOG, PAGES, "<< /Title (Plain Title) >>"], "<< /Size 4 /Root 1 0 R /Info 3 0 R >>");
        assert!(matches!(light_info_title(&bytes), Lookup::Found(Some(_))));
        assert_eq!(title(&bytes).as_deref(), Some(&b"Plain Title"[..]));
    }

    #[test]
    fn the_latest_incremental_update_wins() {
        let mut bytes = pdf(&[CATALOG, PAGES, "<< /Title (Old) >>"], "<< /Size 4 /Root 1 0 R /Info 3 0 R >>");
        let at = bytes.len();
        bytes.extend_from_slice(b"3 0 obj\n<< /Title (New) >>\nendobj\n");
        bytes.extend_from_slice(
            format!("xref\n3 1\n{at:010} 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R /Info 3 0 R >>\nstartxref\n0\n%%EOF\n").as_bytes(),
        );
        assert_eq!(title(&bytes).as_deref(), Some(&b"New"[..]));
    }

    #[test]
    fn a_longer_object_number_is_not_mistaken_for_the_info_object() {
        // 13 0 obj 里有 "3 0 obj" 子串，前面不是空白，不能当成 3 号对象。
        let mut objects = vec![CATALOG, PAGES, "<< /Title (Right) >>"];
        objects.extend(std::iter::repeat("<< >>").take(9));
        objects.push("<< /Title (Wrong) >>");
        let bytes = pdf(&objects, "<< /Size 14 /Root 1 0 R /Info 3 0 R >>");
        assert_eq!(title(&bytes).as_deref(), Some(&b"Right"[..]));
    }

    #[test]
    fn an_indirect_title_string_is_followed() {
        let bytes = pdf(&[CATALOG, PAGES, "<< /Title 4 0 R >>", "(Indirect)"], "<< /Size 5 /Root 1 0 R /Info 3 0 R >>");
        assert_eq!(title(&bytes).as_deref(), Some(&b"Indirect"[..]));
    }

    #[test]
    fn a_direct_info_dictionary_falls_back_to_the_full_parse() {
        let bytes = pdf(&[CATALOG, PAGES], "<< /Size 3 /Root 1 0 R /Info << /Title (Direct) >> >>");
        assert!(matches!(light_info_title(&bytes), Lookup::FullParse));
        assert_eq!(title(&bytes).as_deref(), Some(&b"Direct"[..]));
    }

    #[test]
    fn encrypted_and_info_less_pdfs_have_no_title() {
        let encrypted = pdf(
            &[CATALOG, PAGES, "<< /Title (Cipher) >>", "<< /Filter /Standard >>"],
            "<< /Size 5 /Root 1 0 R /Info 3 0 R /Encrypt 4 0 R >>",
        );
        assert_eq!(title(&encrypted), None);
        let bare = pdf(&[CATALOG, PAGES], "<< /Size 3 /Root 1 0 R >>");
        assert_eq!(title(&bare), None);
    }
}
