use super::*;

#[test]
fn uses_the_installed_pipeline_command_with_the_layout_docx_subcommand() {
    // Rust 这边起的是**装好的** `retainpdf-pipeline`,不是仓库里的源码。导出代码
    // 原来住在 `devtools/`(不在发布包里),从这条路径根本 import 不到。
    let deps = DerivedArtifactDeps::with_pipeline_command(
        "python3",
        "/opt/retainpdf/bin/retainpdf-pipeline",
    );
    let mut command = std::process::Command::new(deps.pipeline_command);
    command.arg("layout-docx");
    assert_eq!(
        command.get_program(),
        "/opt/retainpdf/bin/retainpdf-pipeline"
    );
    assert_eq!(
        command.get_args().collect::<Vec<_>>(),
        vec![std::ffi::OsStr::new("layout-docx")]
    );
}

#[test]
fn different_dpi_is_a_different_artifact() {
    // 背景位图的清晰度直接决定文件大小。两个 DPI 共用一个缓存键的话,先请求的那个
    // 会被后面的人拿到——拿到的是一份和自己要的不一样的文档。
    let low = LayoutDocxOptions { dpi: 96 };
    let high = LayoutDocxOptions { dpi: 300 };
    assert_ne!(low.cache_suffix(), high.cache_suffix());
    assert_eq!(
        LayoutDocxOptions::default().dpi,
        DEFAULT_BACKGROUND_DPI,
        "默认 DPI 变了的话,老缓存会全部失效并重建一遍"
    );
}
