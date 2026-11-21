//! 邀请码（多用户模式）：管理员生成，拿到的人凭它自己注册账号。邀请码的生成和格式在 API 层
//! （账号包 retainpdf-accounts 的 invites.rs），这里只管存取；注册时「查邀请码、建账号、记用量、送页数」
//! 在同一个写事务里做，并发注册不会把一次性的邀请码用两次。

use anyhow::Result;
use rusqlite::{params, OptionalExtension, Row, TransactionBehavior};

use super::accounts::username_key;
use super::{Db, UserRecord, UsernameTaken};

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InviteRecord {
    pub invite_id: String,
    /// 形如 `ABCD-EFGH-JKMN`。
    pub code: String,
    pub max_uses: i64,
    pub used_count: i64,
    /// 用它注册的账号送多少页。
    pub initial_pages: i64,
    pub note: String,
    /// 过期时间（RFC 3339）；空 = 不过期。
    pub expires_at: String,
    /// 作废时间（RFC 3339）；空 = 没作废。
    pub revoked_at: String,
    pub created_by: String,
    pub created_at: String,
}

/// 用某个邀请码注册的账号。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InviteUser {
    pub user_id: String,
    pub username: String,
    pub created_at: String,
    pub deleted_at: String,
}

/// 注册时邀请码不能用。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InviteUnavailable {
    NotFound,
    Revoked,
    Expired,
    UsedUp,
}

impl std::fmt::Display for InviteUnavailable {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let reason = match self {
            Self::NotFound => "not found",
            Self::Revoked => "revoked",
            Self::Expired => "expired",
            Self::UsedUp => "used up",
        };
        write!(f, "invite code unavailable: {reason}")
    }
}

impl std::error::Error for InviteUnavailable {}

const INVITE_COLUMNS: &str = "invite_id, code, max_uses, used_count, initial_pages, note, expires_at, \
                              revoked_at, created_by, created_at";

fn row_to_invite(row: &Row<'_>) -> rusqlite::Result<InviteRecord> {
    Ok(InviteRecord {
        invite_id: row.get(0)?,
        code: row.get(1)?,
        max_uses: row.get(2)?,
        used_count: row.get(3)?,
        initial_pages: row.get(4)?,
        note: row.get(5)?,
        expires_at: row.get(6)?,
        revoked_at: row.get(7)?,
        created_by: row.get(8)?,
        created_at: row.get(9)?,
    })
}

impl Db {
    /// 新建邀请码。邀请码撞上已有的（随机生成，极少见）返回 false，由调用方换一个再试。
    pub fn create_invite(&self, invite: &InviteRecord) -> Result<bool> {
        let conn = self.connect()?;
        let inserted = conn.execute(
            &format!(
                "INSERT INTO invite_codes ({INVITE_COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10) \
                 ON CONFLICT(code) DO NOTHING"
            ),
            params![
                invite.invite_id,
                invite.code,
                invite.max_uses,
                invite.used_count,
                invite.initial_pages,
                invite.note,
                invite.expires_at,
                invite.revoked_at,
                invite.created_by,
                invite.created_at,
            ],
        )?;
        Ok(inserted == 1)
    }

    /// 全部邀请码，新的在前。
    pub fn list_invites(&self) -> Result<Vec<InviteRecord>> {
        let conn = self.connect()?;
        let mut stmt =
            conn.prepare(&format!("SELECT {INVITE_COLUMNS} FROM invite_codes ORDER BY created_at DESC, rowid DESC"))?;
        let rows = stmt.query_map([], row_to_invite)?.collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(rows)
    }

    pub fn get_invite(&self, invite_id: &str) -> Result<Option<InviteRecord>> {
        let conn = self.connect()?;
        Ok(conn
            .query_row(
                &format!("SELECT {INVITE_COLUMNS} FROM invite_codes WHERE invite_id = ?1"),
                params![invite_id],
                row_to_invite,
            )
            .optional()?)
    }

    /// 作废。已经作废的不改作废时间；返回邀请码是否存在。
    pub fn revoke_invite(&self, invite_id: &str, now: &str) -> Result<bool> {
        let conn = self.connect()?;
        conn.execute(
            "UPDATE invite_codes SET revoked_at = ?2 WHERE invite_id = ?1 AND revoked_at = ''",
            params![invite_id, now],
        )?;
        Ok(self.get_invite(invite_id)?.is_some())
    }

    /// 用这个邀请码注册的账号（删了的也列出来），先注册的在前。
    pub fn invite_users(&self, invite_id: &str) -> Result<Vec<InviteUser>> {
        let conn = self.connect()?;
        let mut stmt = conn.prepare(
            "SELECT user_id, username, created_at, deleted_at FROM users \
             WHERE invite_id = ?1 ORDER BY created_at, rowid",
        )?;
        let rows = stmt
            .query_map(params![invite_id], |row| {
                Ok(InviteUser {
                    user_id: row.get(0)?,
                    username: row.get(1)?,
                    created_at: row.get(2)?,
                    deleted_at: row.get(3)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        Ok(rows)
    }

    /// 凭邀请码注册普通账号：查邀请码、建账号、用量加一、记一笔赠送页数，在同一个写事务里。
    /// 邀请码不能用返回 [`InviteUnavailable`]，用户名被占用返回 [`UsernameTaken`]——这两种情况
    /// 什么都不写，邀请码也不算用掉。
    pub fn register_with_invite(
        &self,
        code: &str,
        user_id: &str,
        username: &str,
        password_hash: &str,
        now: &str,
    ) -> Result<UserRecord> {
        let mut conn = self.connect()?;
        // IMMEDIATE：先读用量再写，两个人同时用一次性的邀请码时，后一个会看到已经用完。
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        let invite = tx
            .query_row(
                &format!("SELECT {INVITE_COLUMNS} FROM invite_codes WHERE code = ?1"),
                params![code],
                row_to_invite,
            )
            .optional()?
            .ok_or(InviteUnavailable::NotFound)?;
        if !invite.revoked_at.is_empty() {
            return Err(InviteUnavailable::Revoked.into());
        }
        if !invite.expires_at.is_empty() && invite.expires_at.as_str() <= now {
            return Err(InviteUnavailable::Expired.into());
        }
        if invite.used_count >= invite.max_uses {
            return Err(InviteUnavailable::UsedUp.into());
        }
        let inserted = tx.execute(
            "INSERT INTO users (user_id, username, username_key, password_hash, role, status, \
             must_change_password, created_at, updated_at, invite_id) \
             VALUES (?1, ?2, ?3, ?4, 'user', 'active', 0, ?5, ?5, ?6) \
             ON CONFLICT(username_key) DO NOTHING",
            params![user_id, username.trim(), username_key(username), password_hash, now, invite.invite_id],
        )?;
        if inserted == 0 {
            return Err(UsernameTaken(username.trim().to_string()).into());
        }
        tx.execute(
            "UPDATE invite_codes SET used_count = used_count + 1 WHERE invite_id = ?1",
            params![invite.invite_id],
        )?;
        if invite.initial_pages > 0 {
            tx.execute(
                "INSERT INTO page_ledger (user_id, delta, kind, note, actor_user_id, created_at) \
                 VALUES (?1, ?2, 'grant', ?3, ?4, ?5)",
                params![user_id, invite.initial_pages, format!("邀请码 {} 注册赠送", invite.code), invite.created_by, now],
            )?;
        }
        tx.commit()?;
        self.get_user(user_id)?.ok_or_else(|| anyhow::anyhow!("user vanished after insert: {user_id}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: &str = "2026-10-12T00:00:00Z";

    fn db(name: &str) -> Db {
        let root = std::env::temp_dir().join(format!("retain-invites-{name}-{}", fastrand::u64(..)));
        std::fs::create_dir_all(&root).unwrap();
        let db = Db::new(root.join("jobs.db"), root.clone());
        db.init().unwrap();
        db
    }

    fn invite(code: &str, max_uses: i64, initial_pages: i64) -> InviteRecord {
        InviteRecord {
            invite_id: format!("inv-{code}"),
            code: code.into(),
            max_uses,
            used_count: 0,
            initial_pages,
            note: String::new(),
            expires_at: String::new(),
            revoked_at: String::new(),
            created_by: "admin-1".into(),
            created_at: NOW.into(),
        }
    }

    fn unavailable(error: anyhow::Error) -> InviteUnavailable {
        *error.downcast_ref::<InviteUnavailable>().unwrap_or_else(|| panic!("unexpected error: {error}"))
    }

    #[test]
    fn registering_consumes_the_invite_and_grants_its_pages() {
        let db = db("consume");
        assert!(db.create_invite(&invite("AAAA-BBBB-CCCC", 2, 30)).unwrap());
        let user = db.register_with_invite("AAAA-BBBB-CCCC", "u1", "Alice", "hash", NOW).unwrap();
        assert_eq!((user.role.as_str(), user.status.as_str(), user.must_change_password), ("user", "active", false));
        assert_eq!(db.page_balance("u1").unwrap(), 30);
        let ledger = db.list_page_ledger("u1", 10).unwrap();
        assert_eq!(ledger.len(), 1);
        assert_eq!(ledger[0].kind, "grant");
        assert!(ledger[0].note.contains("AAAA-BBBB-CCCC"), "{}", ledger[0].note);

        db.register_with_invite("AAAA-BBBB-CCCC", "u2", "bob", "hash", NOW).unwrap();
        let error = db.register_with_invite("AAAA-BBBB-CCCC", "u3", "carol", "hash", NOW).unwrap_err();
        assert_eq!(unavailable(error), InviteUnavailable::UsedUp);
        assert!(db.get_user("u3").unwrap().is_none());
        assert_eq!(db.get_invite("inv-AAAA-BBBB-CCCC").unwrap().unwrap().used_count, 2);
        let users = db.invite_users("inv-AAAA-BBBB-CCCC").unwrap();
        assert_eq!(users.iter().map(|u| u.username.as_str()).collect::<Vec<_>>(), ["Alice", "bob"]);
    }

    #[test]
    fn a_taken_username_does_not_use_up_the_invite() {
        let db = db("taken");
        db.create_invite(&invite("AAAA-BBBB-CCCC", 1, 10)).unwrap();
        db.create_user("u0", "alice", "hash", "user", false, NOW).unwrap();
        let error = db.register_with_invite("AAAA-BBBB-CCCC", "u1", "ALICE", "hash", NOW).unwrap_err();
        assert!(error.downcast_ref::<UsernameTaken>().is_some(), "{error}");
        let stored = db.get_invite("inv-AAAA-BBBB-CCCC").unwrap().unwrap();
        assert_eq!(stored.used_count, 0);
        assert_eq!(db.page_balance("u1").unwrap(), 0);
        db.register_with_invite("AAAA-BBBB-CCCC", "u1", "alice2", "hash", NOW).unwrap();
    }

    #[test]
    fn revoked_expired_and_unknown_invites_are_rejected() {
        let db = db("rejected");
        db.create_invite(&invite("AAAA-AAAA-AAAA", 5, 0)).unwrap();
        assert!(db.revoke_invite("inv-AAAA-AAAA-AAAA", NOW).unwrap());
        assert!(!db.revoke_invite("missing", NOW).unwrap());
        let error = db.register_with_invite("AAAA-AAAA-AAAA", "u1", "a", "hash", NOW).unwrap_err();
        assert_eq!(unavailable(error), InviteUnavailable::Revoked);

        let mut expiring = invite("BBBB-BBBB-BBBB", 5, 0);
        expiring.expires_at = "2026-10-12T00:00:00Z".into();
        db.create_invite(&expiring).unwrap();
        let error = db.register_with_invite("BBBB-BBBB-BBBB", "u1", "a", "hash", NOW).unwrap_err();
        assert_eq!(unavailable(error), InviteUnavailable::Expired);
        db.register_with_invite("BBBB-BBBB-BBBB", "u1", "a", "hash", "2026-10-11T23:59:59Z").unwrap();

        let error = db.register_with_invite("ZZZZ-ZZZZ-ZZZZ", "u2", "b", "hash", NOW).unwrap_err();
        assert_eq!(unavailable(error), InviteUnavailable::NotFound);
    }

    #[test]
    fn a_duplicate_code_is_reported_instead_of_overwritten() {
        let db = db("duplicate");
        assert!(db.create_invite(&invite("AAAA-BBBB-CCCC", 1, 0)).unwrap());
        let mut again = invite("AAAA-BBBB-CCCC", 9, 99);
        again.invite_id = "other".into();
        assert!(!db.create_invite(&again).unwrap());
        assert_eq!(db.list_invites().unwrap().len(), 1);
    }

    #[test]
    fn concurrent_registrations_cannot_share_a_single_use_invite() {
        let db = db("race");
        db.create_invite(&invite("AAAA-BBBB-CCCC", 1, 5)).unwrap();
        let handles: Vec<_> = (0..8)
            .map(|i| {
                let db = db.clone();
                std::thread::spawn(move || {
                    db.register_with_invite("AAAA-BBBB-CCCC", &format!("u{i}"), &format!("user{i}"), "hash", NOW).is_ok()
                })
            })
            .collect();
        let winners = handles.into_iter().map(|h| h.join().unwrap()).filter(|ok| *ok).count();
        assert_eq!(winners, 1);
        assert_eq!(db.get_invite("inv-AAAA-BBBB-CCCC").unwrap().unwrap().used_count, 1);
    }
}
