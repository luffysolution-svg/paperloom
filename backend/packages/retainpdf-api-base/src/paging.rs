//! 列表分页的共用校验（规矩见 `docs/api/00-约定/03-分页.md`）。任务、书库各列表都用这一份，
//! 越界的提示文案因此只有一种写法。

use crate::error::AppError;

/// 列表的 `limit` 校验：1..=`max`，越界返回 400，不静默夹。
pub fn checked_limit(limit: u32, max: u32) -> Result<u32, AppError> {
    if limit == 0 || limit > max {
        return Err(AppError::bad_request(format!("limit must be 1..={max}")));
    }
    Ok(limit)
}

#[cfg(test)]
mod tests {
    use super::checked_limit;

    #[test]
    fn limit_must_be_within_one_and_max() {
        assert_eq!(checked_limit(1, 100).unwrap(), 1);
        assert_eq!(checked_limit(100, 100).unwrap(), 100);
        for bad in [0, 101] {
            assert!(checked_limit(bad, 100).unwrap_err().to_string().contains("limit must be 1..=100"));
        }
    }
}
