//! 邀请码注册（多用户模式）：管理员生成邀请码，发给要请的人；对方在登录页凭它自己设用户名和密码
//! 注册，注册完直接登录。邀请码能用几次、注册送几页、多久过期由管理员定，可以随时作废——作废和过期
//! 只是不能再用来注册，已经注册的账号不受影响。
//!
//! 存取和「同一个写事务里查码、建号、记用量、送页数」在 db/invites.rs。

use axum::http::StatusCode;
use chrono::{Duration, SecondsFormat, Utc};
use serde::Serialize;
use serde_json::json;

use super::{
    db_error, hash_password, new_user_id, now, random_bytes, validate_new_password, validate_username,
    AccountsService, LoginOutcome,
};
use retainpdf_data::db::{InviteRecord, InviteUnavailable, InviteUser, UsernameTaken};
use retainpdf_api_base::error::AppError;

/// 邀请码的字符：大写字母和数字，去掉容易看错的 0/O、1/I/L。
const CODE_ALPHABET: &[u8] = b"ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/// 三组、每组四位：`ABCD-EFGH-JKMN`，约 59 位随机，猜不中。
const CODE_GROUPS: usize = 3;
const CODE_GROUP_LEN: usize = 4;
pub const MAX_INVITE_USES: i64 = 1000;
pub const MAX_INVITE_PAGES: i64 = 100_000;
pub const MAX_INVITE_DAYS: i64 = 365;
const MAX_NOTE_CHARS: usize = 200;

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct InviteView {
    pub invite_id: String,
    pub code: String,
    /// active（还能用）/ used_up（用完了）/ expired（过期了）/ revoked（作废了）。
    pub status: &'static str,
    pub max_uses: i64,
    pub used_count: i64,
    pub remaining_uses: i64,
    pub initial_pages: i64,
    pub note: String,
    /// 空 = 不过期。
    pub expires_at: String,
    /// 空 = 没作废。
    pub revoked_at: String,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct InviteUserView {
    pub user_id: String,
    pub username: String,
    /// 注册时间。
    pub created_at: String,
    /// 账号被删了为 true。
    pub deleted: bool,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
pub struct InviteDetailView {
    pub invite: InviteView,
    /// 用这个邀请码注册的账号，先注册的在前。
    pub users: Vec<InviteUserView>,
}

/// 管理员新建邀请码时填的。
#[derive(Clone, Debug, Default)]
pub struct NewInvite {
    pub max_uses: Option<i64>,
    pub initial_pages: Option<i64>,
    pub expires_in_days: Option<i64>,
    pub note: String,
}

fn invite_status(invite: &InviteRecord, now_at: &str) -> &'static str {
    if !invite.revoked_at.is_empty() {
        "revoked"
    } else if !invite.expires_at.is_empty() && invite.expires_at.as_str() <= now_at {
        "expired"
    } else if invite.used_count >= invite.max_uses {
        "used_up"
    } else {
        "active"
    }
}

fn invite_view(invite: InviteRecord, now_at: &str) -> InviteView {
    InviteView {
        status: invite_status(&invite, now_at),
        remaining_uses: (invite.max_uses - invite.used_count).max(0),
        invite_id: invite.invite_id,
        code: invite.code,
        max_uses: invite.max_uses,
        used_count: invite.used_count,
        initial_pages: invite.initial_pages,
        note: invite.note,
        expires_at: invite.expires_at,
        revoked_at: invite.revoked_at,
        created_by: invite.created_by,
        created_at: invite.created_at,
    }
}

fn invite_user_view(user: InviteUser) -> InviteUserView {
    InviteUserView {
        deleted: !user.deleted_at.is_empty(),
        user_id: user.user_id,
        username: user.username,
        created_at: user.created_at,
    }
}

fn generate_invite_code() -> String {
    let bytes = random_bytes::<{ CODE_GROUPS * CODE_GROUP_LEN }>();
    bytes
        .chunks(CODE_GROUP_LEN)
        .map(|group| {
            group
                .iter()
                .map(|byte| CODE_ALPHABET[*byte as usize % CODE_ALPHABET.len()] as char)
                .collect::<String>()
        })
        .collect::<Vec<_>>()
        .join("-")
}

/// 用户输入的邀请码：不管大小写、空格和连字符，规范成 `ABCD-EFGH-JKMN`；位数不对返回 None。
pub fn normalize_invite_code(input: &str) -> Option<String> {
    let compact: String = input
        .chars()
        .filter(|ch| !ch.is_whitespace() && *ch != '-')
        .map(|ch| ch.to_ascii_uppercase())
        .collect();
    if compact.chars().count() != CODE_GROUPS * CODE_GROUP_LEN || !compact.chars().all(|ch| ch.is_ascii_alphanumeric()) {
        return None;
    }
    Some(
        compact
            .as_bytes()
            .chunks(CODE_GROUP_LEN)
            .map(|group| String::from_utf8_lossy(group).into_owned())
            .collect::<Vec<_>>()
            .join("-"),
    )
}

fn invalid_invite_input(field: &str, message: String) -> AppError {
    AppError::account(StatusCode::BAD_REQUEST, "INVALID_INVITE_INPUT", message, json!({ "field": field }))
}

fn invite_not_found(invite_id: &str) -> AppError {
    AppError::account(StatusCode::NOT_FOUND, "INVITE_NOT_FOUND", "邀请码不存在", json!({ "invite_id": invite_id }))
}

fn invite_unavailable(reason: InviteUnavailable) -> AppError {
    let (code, message) = match reason {
        InviteUnavailable::NotFound => ("INVITE_INVALID", "邀请码不对，请检查后重新输入"),
        InviteUnavailable::Revoked => ("INVITE_REVOKED", "这个邀请码已经作废了"),
        InviteUnavailable::Expired => ("INVITE_EXPIRED", "这个邀请码已经过期了"),
        InviteUnavailable::UsedUp => ("INVITE_USED_UP", "这个邀请码已经用完了"),
    };
    AppError::account(StatusCode::BAD_REQUEST, code, message, json!({}))
}

impl AccountsService {
    pub fn create_invite(&self, acting_admin_id: &str, input: NewInvite) -> Result<InviteView, AppError> {
        let max_uses = input.max_uses.unwrap_or(1);
        if !(1..=MAX_INVITE_USES).contains(&max_uses) {
            return Err(invalid_invite_input("max_uses", format!("可用次数要在 1～{MAX_INVITE_USES} 之间")));
        }
        let initial_pages = input.initial_pages.unwrap_or(0);
        if !(0..=MAX_INVITE_PAGES).contains(&initial_pages) {
            return Err(invalid_invite_input("initial_pages", format!("赠送页数要在 0～{MAX_INVITE_PAGES} 之间")));
        }
        let expires_at = match input.expires_in_days {
            None => String::new(),
            Some(days) if (1..=MAX_INVITE_DAYS).contains(&days) => {
                (Utc::now() + Duration::days(days)).to_rfc3339_opts(SecondsFormat::Secs, true)
            }
            Some(_) => {
                return Err(invalid_invite_input("expires_in_days", format!("有效天数要在 1～{MAX_INVITE_DAYS} 之间")))
            }
        };
        let note = input.note.trim().to_string();
        if note.chars().count() > MAX_NOTE_CHARS {
            return Err(invalid_invite_input("note", format!("备注最多 {MAX_NOTE_CHARS} 个字")));
        }
        let now_at = now();
        // 邀请码随机生成，撞上已有的概率可以忽略；真撞上就换一个。
        for _ in 0..5 {
            let invite = InviteRecord {
                invite_id: format!("inv_{}", &new_user_id()[2..]),
                code: generate_invite_code(),
                max_uses,
                used_count: 0,
                initial_pages,
                note: note.clone(),
                expires_at: expires_at.clone(),
                revoked_at: String::new(),
                created_by: acting_admin_id.to_string(),
                created_at: now_at.clone(),
            };
            if self.db.create_invite(&invite).map_err(db_error)? {
                return Ok(invite_view(invite, &now_at));
            }
        }
        Err(AppError::internal("could not generate a unique invite code"))
    }

    pub fn list_invites(&self) -> Result<Vec<InviteView>, AppError> {
        let now_at = now();
        Ok(self.db.list_invites().map_err(db_error)?.into_iter().map(|invite| invite_view(invite, &now_at)).collect())
    }

    pub fn invite_detail(&self, invite_id: &str) -> Result<InviteDetailView, AppError> {
        let invite = self.db.get_invite(invite_id).map_err(db_error)?.ok_or_else(|| invite_not_found(invite_id))?;
        let users = self.db.invite_users(invite_id).map_err(db_error)?;
        Ok(InviteDetailView {
            invite: invite_view(invite, &now()),
            users: users.into_iter().map(invite_user_view).collect(),
        })
    }

    /// 作废：不能再用来注册，已经注册的账号不受影响。重复作废不报错。
    pub fn revoke_invite(&self, invite_id: &str) -> Result<InviteView, AppError> {
        let now_at = now();
        if !self.db.revoke_invite(invite_id, &now_at).map_err(db_error)? {
            return Err(invite_not_found(invite_id));
        }
        let invite = self.db.get_invite(invite_id).map_err(db_error)?.ok_or_else(|| invite_not_found(invite_id))?;
        Ok(invite_view(invite, &now_at))
    }

    /// 凭邀请码注册普通账号，成功后直接登录。用户名被占用、邀请码不能用时什么都不写，邀请码也不算用掉。
    pub fn register(&self, invite_code: &str, username: &str, password: &str) -> Result<LoginOutcome, AppError> {
        validate_username(username)?;
        validate_new_password(password)?;
        let code = normalize_invite_code(invite_code).ok_or_else(|| invite_unavailable(InviteUnavailable::NotFound))?;
        let password_hash = hash_password(password)?;
        let user = match self.db.register_with_invite(&code, &new_user_id(), username, &password_hash, &now()) {
            Ok(user) => user,
            Err(error) => {
                if let Some(reason) = error.downcast_ref::<InviteUnavailable>() {
                    return Err(invite_unavailable(*reason));
                }
                if error.downcast_ref::<UsernameTaken>().is_some() {
                    return Err(AppError::account(
                        StatusCode::CONFLICT,
                        "USERNAME_TAKEN",
                        "这个用户名已经有人用了",
                        json!({}),
                    ));
                }
                return Err(db_error(error));
            }
        };
        self.start_session(user)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_codes_are_readable_and_normalize_to_themselves() {
        for _ in 0..200 {
            let code = generate_invite_code();
            assert_eq!(code.len(), 14, "{code}");
            assert!(code.chars().all(|ch| ch == '-' || CODE_ALPHABET.contains(&(ch as u8))), "{code}");
            assert_eq!(normalize_invite_code(&code).as_deref(), Some(code.as_str()));
        }
    }

    #[test]
    fn user_typed_codes_are_normalized() {
        assert_eq!(normalize_invite_code(" abcd efgh-jkmn ").as_deref(), Some("ABCD-EFGH-JKMN"));
        assert_eq!(normalize_invite_code("ABCDEFGHJKMN").as_deref(), Some("ABCD-EFGH-JKMN"));
        assert_eq!(normalize_invite_code("ABCD-EFGH-JKM"), None);
        assert_eq!(normalize_invite_code("ABCD-EFGH-JKMNP"), None);
        assert_eq!(normalize_invite_code("ABCD-EFGH-JKM!"), None);
        assert_eq!(normalize_invite_code("ＡBCD-EFGH-JKMN"), None);
    }
}
