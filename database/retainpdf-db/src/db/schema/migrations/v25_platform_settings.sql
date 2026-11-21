-- 多用户：管理后台保存的平台模型与 OCR 设置（只有一行，id = 1）。有这一行就用它，没有就用
-- RETAIN_PLATFORM_* 环境变量——已有的部署不受影响。
-- 密钥不在这里：存在凭据库（vault）里，这里只记凭据编号，以及这条凭据是不是
-- 管理后台建的（*_credential_owned = 1）——只有自己建的，换密钥后没人用了才会被清掉；
-- 从环境变量带过来的编号一律不碰。
CREATE TABLE IF NOT EXISTS platform_settings (
    id                          INTEGER PRIMARY KEY CHECK (id = 1),
    translation_model           TEXT NOT NULL DEFAULT '',
    translation_base_url        TEXT NOT NULL DEFAULT '',
    translation_api_protocol    TEXT NOT NULL DEFAULT '',
    translation_thinking        TEXT NOT NULL DEFAULT '',
    translation_max_workers     INTEGER NOT NULL DEFAULT 0,
    translation_credential_ref  TEXT NOT NULL DEFAULT '',
    translation_credential_owned INTEGER NOT NULL DEFAULT 0,
    ocr_provider                TEXT NOT NULL DEFAULT '',
    ocr_credential_ref          TEXT NOT NULL DEFAULT '',
    ocr_credential_owned        INTEGER NOT NULL DEFAULT 0,
    updated_at                  TEXT NOT NULL,
    updated_by                  TEXT NOT NULL DEFAULT ''
);
