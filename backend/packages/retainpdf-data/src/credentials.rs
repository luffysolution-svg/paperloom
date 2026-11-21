use std::collections::BTreeMap;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};

use serde::Deserialize;

// 凭据库的文件格式只在这里定义一次：这里只读（任务运行时取密钥），写在 API 的凭据服务里，
// 两边共用下面这些常量和检查，免得改了一边、另一边按旧格式读写把库读错或写坏。

pub const VAULT_SCHEMA: &str = "retainpdf_credential_vault_v1";
pub const MAX_VAULT_BYTES: u64 = 256 * 1024;
pub const MAX_SECRET_BYTES: usize = 8192;

pub fn vault_path(data_root: &Path) -> PathBuf {
    data_root.join("secrets").join("credentials.json")
}

/// 读凭据库文件之前的安全检查失败。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VaultReadError {
    Unreadable,
    /// 是符号链接、不是普通文件，或者太大。
    Unsafe,
    /// 别人能读（权限不是 0600）。
    Exposed,
}

/// 读出凭据库文件的原始内容；文件不存在时是 `None`。不解析内容（读写两边的结构不一样）。
pub fn read_vault_bytes(data_root: &Path) -> Result<Option<Vec<u8>>, VaultReadError> {
    let path = vault_path(data_root);
    let metadata = match fs::symlink_metadata(&path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(_) => return Err(VaultReadError::Unreadable),
    };
    if metadata.file_type().is_symlink() || !metadata.is_file() || metadata.len() > MAX_VAULT_BYTES
    {
        return Err(VaultReadError::Unsafe);
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if metadata.permissions().mode() & 0o077 != 0 {
            return Err(VaultReadError::Exposed);
        }
    }
    fs::read(path).map(Some).map_err(|_| VaultReadError::Unreadable)
}

/// 凭据编号：`cred_` 开头，其余同 [`is_valid_name`]。
pub fn is_valid_credential_ref(value: &str) -> bool {
    value.starts_with("cred_") && is_valid_name(value)
}

/// 编号、种类这类名字：1–64 个小写字母、数字、`_`、`-`。
pub fn is_valid_name(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'_' || byte == b'-'
        })
}

/// 存进库里的密钥：非空，不超过上限。
pub fn is_valid_stored_secret(value: &str) -> bool {
    !value.is_empty() && value.len() <= MAX_SECRET_BYTES
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedCredential {
    pub kind: String,
    pub provider: String,
    pub secret: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CredentialResolveError {
    InvalidReference,
    NotFound,
    VaultUnreadable,
    VaultUnsafe,
    VaultInvalid,
    KindMismatch { expected: String, actual: String },
}

impl fmt::Display for CredentialResolveError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidReference => formatter.write_str("credential_ref is invalid"),
            Self::NotFound => formatter.write_str("credential reference not found"),
            Self::VaultUnreadable => formatter.write_str("credential vault is unreadable"),
            Self::VaultUnsafe => formatter.write_str("credential vault path is unsafe"),
            Self::VaultInvalid => formatter.write_str("credential vault is invalid"),
            Self::KindMismatch { expected, actual } => write!(
                formatter,
                "credential kind mismatch: expected {expected}, got {actual}"
            ),
        }
    }
}

impl std::error::Error for CredentialResolveError {}

#[derive(Debug, Deserialize)]
struct StoredCredential {
    kind: String,
    #[serde(default)]
    provider: String,
    secret: String,
}

#[derive(Debug, Deserialize)]
struct CredentialVault {
    schema: String,
    credentials: BTreeMap<String, StoredCredential>,
}

pub fn resolve_credential(
    data_root: &Path,
    credential_ref: &str,
    expected_kind: &str,
) -> Result<ResolvedCredential, CredentialResolveError> {
    validate_credential_ref(credential_ref)?;
    let vault = load_vault(data_root)?;
    let stored = vault
        .credentials
        .get(credential_ref)
        .ok_or(CredentialResolveError::NotFound)?;
    if stored.kind != expected_kind {
        return Err(CredentialResolveError::KindMismatch {
            expected: expected_kind.to_string(),
            actual: stored.kind.clone(),
        });
    }
    Ok(ResolvedCredential {
        kind: stored.kind.clone(),
        provider: stored.provider.clone(),
        secret: stored.secret.clone(),
    })
}

fn load_vault(data_root: &Path) -> Result<CredentialVault, CredentialResolveError> {
    let bytes = read_vault_bytes(data_root)
        .map_err(|error| match error {
            VaultReadError::Unreadable => CredentialResolveError::VaultUnreadable,
            VaultReadError::Unsafe | VaultReadError::Exposed => CredentialResolveError::VaultUnsafe,
        })?
        .ok_or(CredentialResolveError::NotFound)?;
    let vault: CredentialVault =
        serde_json::from_slice(&bytes).map_err(|_| CredentialResolveError::VaultInvalid)?;
    if vault.schema != VAULT_SCHEMA
        || vault.credentials.iter().any(|(reference, item)| {
            !is_valid_credential_ref(reference)
                || !is_valid_name(&item.kind)
                || !is_valid_stored_secret(&item.secret)
        })
    {
        return Err(CredentialResolveError::VaultInvalid);
    }
    Ok(vault)
}

fn validate_credential_ref(value: &str) -> Result<(), CredentialResolveError> {
    if !is_valid_credential_ref(value) {
        return Err(CredentialResolveError::InvalidReference);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_root(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "retain-data-credential-{name}-{}-{:016x}",
            std::process::id(),
            fastrand::u64(..)
        ))
    }

    fn write_vault(root: &Path, kind: &str, secret: &str) {
        let directory = root.join("secrets");
        fs::create_dir_all(&directory).expect("create secret directory");
        let path = directory.join("credentials.json");
        fs::write(
            &path,
            format!(
                r#"{{"schema":"{VAULT_SCHEMA}","revision":1,"credentials":{{"cred_test":{{"kind":"{kind}","provider":"openai","label":"test","secret":"{secret}","created_at":"now","updated_at":"now"}}}}}}"#
            ),
        )
        .expect("write vault");
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(path, fs::Permissions::from_mode(0o600)).expect("secure vault");
        }
    }

    #[test]
    fn resolves_expected_credential_kind() {
        let root = test_root("resolve");
        write_vault(&root, "translation_api_key", "sk-test");
        let resolved = resolve_credential(&root, "cred_test", "translation_api_key")
            .expect("resolve credential");
        assert_eq!(resolved.provider, "openai");
        assert_eq!(resolved.secret, "sk-test");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn rejects_wrong_kind_and_unsafe_permissions() {
        let root = test_root("wrong-kind");
        write_vault(&root, "ocr_token", "token");
        assert!(matches!(
            resolve_credential(&root, "cred_test", "translation_api_key"),
            Err(CredentialResolveError::KindMismatch { .. })
        ));
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(
                root.join("secrets").join("credentials.json"),
                fs::Permissions::from_mode(0o644),
            )
            .expect("make vault unsafe");
            assert_eq!(
                resolve_credential(&root, "cred_test", "translation_api_key"),
                Err(CredentialResolveError::VaultUnsafe)
            );
        }
        let _ = fs::remove_dir_all(root);
    }
}
