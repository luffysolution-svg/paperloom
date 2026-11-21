//! Credential HTTP entry points and shared managed-credential capabilities.

pub mod api;
mod service;

pub use service::{
    acquire_credential_usage_lock, delete_unreferenced_managed_credential,
    get_or_create_managed_credential, CredentialUsageLock,
};
