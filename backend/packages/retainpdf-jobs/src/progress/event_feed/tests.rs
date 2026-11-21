use super::*;

#[test]
fn cursor_rejects_foreign_scope_and_unbounded_values() {
    let token = cursor::Cursor::new("a", "epoch".into(), 3, 5)
        .encode()
        .unwrap();
    assert!(cursor::Cursor::decode(&token, "a").is_ok());
    assert!(cursor::Cursor::decode(&token, "b").is_err());
    assert!(cursor::Cursor::decode(&"a".repeat(4097), "a").is_err());
    let invalid = cursor::Cursor::new("a", "epoch".into(), 6, 5)
        .encode()
        .unwrap();
    assert!(cursor::Cursor::decode(&invalid, "a").is_err());
}

/// 客户端手里的游标是去掉 `ocr_only` 参数以前发的，编码要一个字节都不变。
#[test]
fn cursor_encoding_is_unchanged_after_ocr_only_scope_removal() {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    let issued = |ocr_only: bool| {
        URL_SAFE_NO_PAD.encode(format!(
            r#"{{"version":2,"owner":"a","ocr_only":{ocr_only},"epoch":"epoch","position":3,"upper":5}}"#
        ))
    };
    let token = cursor::Cursor::new("a", "epoch".into(), 3, 5).encode().unwrap();
    assert_eq!(token, issued(false));
    assert!(cursor::Cursor::decode(&issued(false), "a").is_ok());
    // 只有删掉的 `/ocr/jobs/:id/events` 发过 true 的游标。
    assert!(cursor::Cursor::decode(&issued(true), "a").is_err());
}

#[test]
fn checkpoint_reads_only_new_complete_lines() {
    let path = std::env::temp_dir().join(format!("feed-lines-{:016x}.jsonl", fastrand::u64(..)));
    std::fs::write(&path, "{\"event\":\"first\"}\n{\"event\":").unwrap();
    let source = files::inspect(path.clone()).unwrap().unwrap();
    let mut checkpoint = files::Checkpoint::default();
    let (lines, more) = files::read_batch(&source, &mut checkpoint, 10).unwrap();
    assert_eq!(lines.len(), 1);
    assert!(!more);
    let offset = checkpoint.offset;
    assert!(offset < source.size);
    let bytes = files::read_bytes();
    assert!(files::read_batch(&source, &mut checkpoint, 10)
        .unwrap()
        .0
        .is_empty());
    assert_eq!(
        files::read_bytes(),
        bytes,
        "warm unchanged file does not read historical bytes"
    );
    use std::io::Write;
    std::fs::OpenOptions::new()
        .append(true)
        .open(&path)
        .unwrap()
        .write_all(b"\"second\"}\n")
        .unwrap();
    let source = files::inspect(path.clone()).unwrap().unwrap();
    assert!(!files::changed(&source, &checkpoint).unwrap());
    let lines = files::read_batch(&source, &mut checkpoint, 10).unwrap().0;
    assert_eq!(lines.len(), 1);
    assert_eq!(lines[0].0, offset);
    assert_eq!(checkpoint.offset, source.size);
    assert!(
        files::read_bytes() - bytes < 2048,
        "incremental read is bounded by delta and fingerprints"
    );
    std::fs::remove_file(&path).unwrap();
}

#[test]
fn checkpoint_limits_batch_bytes_even_for_large_complete_lines() {
    let path = std::env::temp_dir().join(format!("feed-batch-{:016x}.jsonl", fastrand::u64(..)));
    let line = format!("{}\n", "x".repeat(128 * 1024 - 1));
    std::fs::write(&path, line.repeat(20)).unwrap();
    let source = files::inspect(path.clone()).unwrap().unwrap();
    let mut checkpoint = files::Checkpoint::default();
    let (lines, more) = files::read_batch(&source, &mut checkpoint, 1024).unwrap();
    assert_eq!(lines.len(), 8);
    assert_eq!(checkpoint.offset, 1024 * 1024);
    assert!(more);
    let (lines, more) = files::read_batch(&source, &mut checkpoint, 1024).unwrap();
    assert_eq!(lines.len(), 8);
    assert!(more);
    let (lines, more) = files::read_batch(&source, &mut checkpoint, 1024).unwrap();
    assert_eq!(lines.len(), 4);
    assert!(!more);
    assert_eq!(checkpoint.offset, source.size);
    std::fs::remove_file(&path).unwrap();
}
