//! 凭据库：模型、OCR 的 API 密钥，存在本机，不回显明文。

use crate::app::AppState;
use crate::routes::credentials;

crate::endpoints! {
    state: AppState;
    /// 凭据列表（不含明文）
    GET "/api/v1/credentials" => credentials::list_credentials_route, admin;
    /// 新建凭据
    POST "/api/v1/credentials" => credentials::create_credential_route, admin;
    /// 一个凭据（不含明文）
    GET "/api/v1/credentials/:credential_ref" => credentials::get_credential_route, admin;
    /// 更新凭据
    PUT "/api/v1/credentials/:credential_ref" => credentials::update_credential_route, admin;
    /// 删除凭据
    DELETE "/api/v1/credentials/:credential_ref" => credentials::delete_credential_route, admin;
}
