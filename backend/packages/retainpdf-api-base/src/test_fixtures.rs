//! 只给测试用的小工具：rust_api 和各领域包的测试都用，经 `test-fixtures` 特性打开，生产构建里没有。

use std::path::{Path, PathBuf};

/// 项目虚拟环境里的可执行文件（`python`、`retainpdf-pipeline`……）。
///
/// UV_PROJECT_ENVIRONMENT 优先 —— worktree 里环境不在 `<repo>/backend/.venv`
/// （那个带绝对路径的符号链接已撤出仓库，见 ops/development/dev_stack.py 的注释）。
/// 环境缺了就红，不静默跳过：这些测试守的正是 Rust 与 Python 的接缝。
pub fn project_venv_bin(name: &str) -> PathBuf {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
    let relative = if cfg!(windows) {
        PathBuf::from("Scripts").join(format!("{name}.exe"))
    } else {
        PathBuf::from("bin").join(name)
    };
    std::env::var_os("UV_PROJECT_ENVIRONMENT")
        .map(PathBuf::from)
        .into_iter()
        .chain([root.join("backend/.venv"), root.join(".venv")])
        .map(|venv| venv.join(&relative))
        .find(|path| path.is_file())
        .expect(
            "a project Python environment is required \
             (set UV_PROJECT_ENVIRONMENT or create <repo>/backend/.venv)",
        )
}

/// 一页、指定页面尺寸的最小 PDF（只有页面框，没有内容）。
pub fn minimal_pdf_bytes(width: i64, height: i64) -> Vec<u8> {
    let objects = [
        "<< /Type /Catalog /Pages 2 0 R >>".to_string(),
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_string(),
        format!("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] >>"),
    ];
    let mut bytes = b"%PDF-1.4\n".to_vec();
    let mut offsets = vec![0usize];
    for (idx, object) in objects.iter().enumerate() {
        offsets.push(bytes.len());
        bytes.extend_from_slice(format!("{} 0 obj\n{}\nendobj\n", idx + 1, object).as_bytes());
    }
    let xref_offset = bytes.len();
    bytes.extend_from_slice(format!("xref\n0 {}\n", offsets.len()).as_bytes());
    bytes.extend_from_slice(b"0000000000 65535 f \n");
    for offset in offsets.iter().skip(1) {
        bytes.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    bytes.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            offsets.len(),
            xref_offset
        )
        .as_bytes(),
    );
    bytes
}
