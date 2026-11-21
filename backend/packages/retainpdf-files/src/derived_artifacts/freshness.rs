//! 派生产物（对照 PDF、Word、线性化 PDF、页预览）的缓存还新不新鲜。
//!
//! 以前只比修改时间：产物比每个输入都新（`>=`）就算新鲜。两个漏洞：
//!
//! 1. 生成要几十秒到十分钟，期间输入被替换（原地重渲染写完了新的 `translated.pdf`）。
//!    生成结束换名出来的产物比新输入还晚，内容却来自旧输入，从此一直被当成新鲜的。
//! 2. 修改时间精度粗的文件系统上（秒级；Linux 上即使是纳秒字段，实际也按时钟 tick 走），
//!    产物生成完、同一个 tick 里输入又被重写，两边相等，`>=` 也判成新鲜。
//!
//! 现在生成**开始前**取每个输入的戳（路径、大小、修改时间、inode），生成完写进产物旁边的
//! 记录文件 `.<产物名>.inputs.json`，里面还有产物自己的戳。判断时三样都要对得上：记录在，
//! 记录里的产物戳就是现在这份产物，每个输入的戳和现在一样。生成期间输入变了，记下的是变之前
//! 的戳，下一次请求对不上就重新生成；这一次请求拿到的是按它发出时的输入生成的结果。
//!
//! 没有记录文件的产物（这次改动之前生成的缓存、手放进去的文件）照旧按修改时间判断，
//! 不让所有旧缓存（整本书的 Word 要好几分钟）一起重建；它们下次重建以后就有记录了。
//! 记录在、但记的不是现在这份产物（多设备同步、手动拷贝换掉了产物，或者换名之后、写记录之前
//! 进程没了）也按修改时间判断：这份产物不是我们生成的，记录说明不了它。要是这时当作过期，两台
//! 同步的设备会轮流重建、再把自己的产物同步给对方，没完没了。
//! 记录读不出来、版本不对，当作过期。

use std::path::{Path, PathBuf};

use retainpdf_api_base::error::AppError;
use serde::{Deserialize, Serialize};

/// 记录文件的格式版本。戳的含义改了就加一，旧记录全部当作过期。
const RECORD_VERSION: u32 = 1;

/// 一个文件此刻的样子。原子替换（写临时文件再换名）会换 inode；原地重写多半会改大小；
/// 修改时间带纳秒，精度够的文件系统上同一秒内的重写也分得出来。
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub(crate) struct Stamp {
    len: u64,
    modified_secs: u64,
    modified_nanos: u32,
    inode: u64,
}

impl Stamp {
    pub(crate) fn of(path: &Path) -> Option<Self> {
        let meta = std::fs::metadata(path).ok()?;
        let modified = meta
            .modified()
            .ok()?
            .duration_since(std::time::UNIX_EPOCH)
            .ok()?;
        Some(Self {
            len: meta.len(),
            modified_secs: modified.as_secs(),
            modified_nanos: modified.subsec_nanos(),
            inode: inode(&meta),
        })
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

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
struct InputStamp {
    path: PathBuf,
    /// 输入不在时为 null：和以前一样，不在的输入不让产物过期，但它冒出来就过期了。
    stamp: Option<Stamp>,
}

/// 生成开始前取的输入戳。
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct InputStamps(Vec<InputStamp>);

impl InputStamps {
    pub(crate) fn capture(inputs: &[&Path]) -> Self {
        Self(
            inputs
                .iter()
                .map(|path| InputStamp {
                    path: path.to_path_buf(),
                    stamp: Stamp::of(path),
                })
                .collect(),
        )
    }

    pub(crate) fn is_empty(&self) -> bool {
        self.0.is_empty()
    }
}

#[derive(Debug, Serialize, Deserialize)]
struct Record {
    version: u32,
    output: Stamp,
    inputs: Vec<InputStamp>,
}

/// 产物旁边的记录文件：`artifacts/x.pdf` → `artifacts/.x.pdf.inputs.json`。
fn record_path(output_path: &Path) -> Option<PathBuf> {
    let name = output_path.file_name()?.to_str()?;
    Some(output_path.with_file_name(format!(".{name}.inputs.json")))
}

pub(crate) fn cached_output_is_fresh(
    output_path: &Path,
    inputs: &[&Path],
) -> Result<bool, AppError> {
    if !output_path.is_file() {
        return Ok(false);
    }
    let Some(record_path) = record_path(output_path) else {
        return Ok(false);
    };
    let bytes = match std::fs::read(&record_path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return legacy_mtime_is_fresh(output_path, inputs);
        }
        Err(error) => return Err(error.into()),
    };
    let Ok(record) = serde_json::from_slice::<Record>(&bytes) else {
        return Ok(false);
    };
    if record.version != RECORD_VERSION {
        return Ok(false);
    }
    if Stamp::of(output_path).as_ref() != Some(&record.output) {
        return legacy_mtime_is_fresh(output_path, inputs);
    }
    Ok(InputStamps::capture(inputs).0 == record.inputs)
}

/// 没有记录文件时的老规则：产物的修改时间不早于每个输入。
fn legacy_mtime_is_fresh(output_path: &Path, inputs: &[&Path]) -> Result<bool, AppError> {
    let output_modified = std::fs::metadata(output_path)?.modified().ok();
    Ok(inputs.iter().all(|input| {
        let input_modified = std::fs::metadata(input)
            .and_then(|meta| meta.modified())
            .ok();
        output_modified >= input_modified
    }))
}

/// 产物换名到位以后，记下它是按哪些输入生成的。`output` 是换名前在临时文件上取的戳
/// （换名不改 inode 和修改时间）。
///
/// 写记录失败不影响这一次请求：产物本身是好的，只是下一次判断时记录对不上、重新生成一遍。
pub(crate) fn remember_inputs(output_path: &Path, output: Stamp, inputs: InputStamps) {
    let Some(record_path) = record_path(output_path) else {
        return;
    };
    let record = Record {
        version: RECORD_VERSION,
        output,
        inputs: inputs.0,
    };
    let Ok(bytes) = serde_json::to_vec(&record) else {
        return;
    };
    let temporary = record_path.with_extension(format!("{:016x}.tmp", fastrand::u64(..)));
    if std::fs::write(&temporary, bytes).is_err() || std::fs::rename(&temporary, &record_path).is_err() {
        let _ = std::fs::remove_file(&temporary);
    }
}
