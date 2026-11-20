use super::UploadError;
use lopdf::{Document, Object, ObjectId};
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

const REPAIR_TIMEOUT: Duration = Duration::from_secs(60);

pub(super) fn load_pdf_page_count(path: &Path) -> Result<u32, lopdf::Error> {
    load_page_tree(path).map(|doc| doc.get_pages().len() as u32)
}

/// 数页数只要页面树。`Document::load` 除了整份文件读进来的那一份，还把每个流（图片、页面内容、字体）
/// 各复制一份留着，峰值是文件大小的两倍多；这里流读到就扔，峰值是文件大小加上正在读的那一个流。
fn load_page_tree(path: &Path) -> Result<Document, lopdf::Error> {
    Document::load_filtered(path, keep_page_tree_objects)
}

/// `load_filtered` 的过滤函数（lopdf 0.32）：返回 `None` 的对象不留。最外层的对象留下的是传进来的那个（返回值只看
/// 是不是 `None`），对象流里的对象留下的是返回值。对象流（`ObjStm`）要留着拆开，页面树的字典可能在里面；
/// 流不会装在对象流里，所以它只在最外层出现，返回值用不上。
fn keep_page_tree_objects(id: ObjectId, object: &mut Object) -> Option<(ObjectId, Object)> {
    match object {
        Object::Stream(stream) if stream.dict.type_is(b"ObjStm") => Some((id, Object::Null)),
        Object::Stream(_) => None,
        other => Some((id, other.clone())),
    }
}

pub(super) fn repair_pdf_with_pymupdf(path: &Path, python_bin: &str) -> Result<(), UploadError> {
    let repaired_path = path.with_extension("repairing.pdf");
    let script = r#"
import pathlib
import sys

import fitz

source = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
doc = fitz.open(source)
doc.save(target, garbage=4, deflate=True)
doc.close()
"#;
    let mut command = Command::new(python_bin);
    command.arg("-c").arg(script).arg(path).arg(&repaired_path);
    run_repair_command(&mut command, REPAIR_TIMEOUT)?;
    std::fs::rename(&repaired_path, path)
        .map_err(|_| UploadError::internal("Failed to install repaired PDF"))
}

pub(super) fn run_repair_command(
    command: &mut Command,
    timeout: Duration,
) -> Result<(), UploadError> {
    // Neither buffer unbounded output nor expose Python stderr/paths to clients.
    let child = command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|_| UploadError::RepairUnavailable)?;
    struct RepairChild(std::process::Child);
    impl Drop for RepairChild {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
    let mut child = RepairChild(child);
    let started = Instant::now();
    loop {
        if let Some(status) = child
            .0
            .try_wait()
            .map_err(|_| UploadError::internal("PDF repair process failed"))?
        {
            return if status.success() {
                Ok(())
            } else {
                Err(UploadError::bad_request("invalid PDF: repair failed"))
            };
        }
        if started.elapsed() >= timeout {
            return Err(UploadError::RepairTimeout);
        }
        std::thread::sleep(Duration::from_millis(10));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn page_counts_match_a_full_load_without_keeping_the_streams() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tests/fixtures/pdfs");
        let mut checked = 0;
        for entry in std::fs::read_dir(dir).unwrap() {
            let path = entry.unwrap().path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("pdf") {
                continue;
            }
            let full = Document::load(&path).unwrap();
            let tree = load_page_tree(&path).unwrap();
            assert_eq!(
                tree.get_pages().len(),
                full.get_pages().len(),
                "{}",
                path.display()
            );
            assert!(
                tree.objects
                    .values()
                    .filter_map(|object| object.as_stream().ok())
                    .all(|stream| stream.dict.type_is(b"ObjStm")),
                "{}",
                path.display()
            );
            checked += 1;
        }
        assert!(checked > 0);
    }
}
