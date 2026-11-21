-- 多用户：邀请码注册。管理员生成邀请码（可用几次、注册送几页、什么时候过期），拿到的人自己设用户名和
-- 密码注册。used_count 只增不减：作废（revoked_at 非空）或过期后已经注册的账号不受影响。
-- users.invite_id 记账号是用哪个邀请码注册的（管理员建的号为空），邀请码详情据此列出注册的人。
CREATE TABLE IF NOT EXISTS invite_codes (
    invite_id     TEXT PRIMARY KEY,
    code          TEXT NOT NULL UNIQUE,
    max_uses      INTEGER NOT NULL CHECK (max_uses > 0),
    used_count    INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    initial_pages INTEGER NOT NULL DEFAULT 0 CHECK (initial_pages >= 0),
    note          TEXT NOT NULL DEFAULT '',
    expires_at    TEXT NOT NULL DEFAULT '',
    revoked_at    TEXT NOT NULL DEFAULT '',
    created_by    TEXT NOT NULL,
    created_at    TEXT NOT NULL
);
ALTER TABLE users ADD COLUMN invite_id TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS users_by_invite ON users(invite_id) WHERE invite_id <> '';
