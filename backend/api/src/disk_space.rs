use crate::error::AppError;
use std::path::Path;

pub(crate) const INSUFFICIENT_STORAGE: &str = "insufficient_storage";

pub(crate) fn free_space_bytes(path: &Path) -> Option<u64> {
    let existing = path.ancestors().find(|candidate| candidate.is_dir())?;
    fs2::available_space(existing).ok()
}

pub(crate) fn ensure_free_space(path: &Path, floor: u64, what: &str) -> Result<(), AppError> {
    if floor == 0 {
        return Ok(());
    }
    if let Some(free) = free_space_bytes(path) {
        if free < floor {
            let message = format!(
                "not enough free disk space to {what}: {} MiB available, {} MiB required",
                free / (1024 * 1024),
                floor / (1024 * 1024)
            );
            tracing::warn!("{message}");
            return Err(AppError::service_unavailable_because(
                INSUFFICIENT_STORAGE,
                message,
            ));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn actual_volume_space_is_reported_on_supported_platforms() {
        assert!(free_space_bytes(&std::env::temp_dir().join("paperloom-missing/path")).is_some());
        assert!(ensure_free_space(&std::env::temp_dir(), u64::MAX, "upload").is_err());
        assert!(ensure_free_space(&std::env::temp_dir(), 0, "upload").is_ok());
    }
}
