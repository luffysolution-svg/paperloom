//! 邀请码：管理员新建 / 列表 / 详情 / 作废，凭邀请码注册（注册完直接登录、送页数、用完就不能再用）。

use axum::http::{Method, StatusCode};
use serde_json::{json, Value};

use super::accounts::{create_and_login, login, multi_state, send, session_cookie, ADMIN_PASSWORD};
use crate::api_tests::jobs_common::{read_json, test_state};

async fn create_invite(state: &crate::AppState, admin: &str, body: Value) -> Value {
    let response = send(state, Method::POST, "/api/v1/admin/invites", Some(admin), Some(body)).await;
    assert_eq!(response.status(), StatusCode::OK);
    read_json(response).await["data"].clone()
}

async fn register(state: &crate::AppState, code: &str, username: &str, password: &str) -> axum::response::Response {
    send(
        state,
        Method::POST,
        "/api/v1/auth/register",
        None,
        Some(json!({ "invite_code": code, "username": username, "password": password })),
    )
    .await
}

async fn error_code(response: axum::response::Response) -> (StatusCode, String) {
    let status = response.status();
    let body = read_json(response).await;
    (status, body["code"].as_str().unwrap_or_default().to_string())
}

#[tokio::test]
async fn invited_user_registers_logs_in_and_gets_the_pages() {
    let state = multi_state("invite-register");
    let admin = login(&state, "root", ADMIN_PASSWORD).await;
    let invite = create_invite(&state, &admin, json!({ "initial_pages": 50, "note": "张老师课题组" })).await;
    assert_eq!(invite["status"], "active");
    assert_eq!(invite["max_uses"], 1, "默认只能用一次");
    assert_eq!(invite["remaining_uses"], 1);
    assert_eq!(invite["initial_pages"], 50);
    assert_eq!(invite["expires_at"], "", "默认不过期");
    let code = invite["code"].as_str().unwrap().to_string();
    assert!(regex_like_code(&code), "{code}");

    // 小写、不带连字符也认。
    let typed = code.replace('-', "").to_lowercase();
    let response = register(&state, &typed, "newbie", "newbie-pass").await;
    assert_eq!(response.status(), StatusCode::OK);
    let cookie = session_cookie(&response);
    let body = read_json(response).await;
    assert_eq!(body["data"]["user"]["username"], "newbie");
    assert_eq!(body["data"]["user"]["role"], "user");
    assert_eq!(body["data"]["user"]["must_change_password"], false, "密码是自己设的，不用再改");

    let me = read_json(send(&state, Method::GET, "/api/v1/auth/session", Some(&cookie), None).await).await;
    assert_eq!(me["data"]["user"]["username"], "newbie");
    let pages = read_json(send(&state, Method::GET, "/api/v1/account/pages", Some(&cookie), None).await).await;
    assert_eq!(pages["data"]["balance"], 50);
    assert_eq!(pages["data"]["entries"][0]["delta"], 50);

    // 之后用自己设的密码正常登录。
    login(&state, "newbie", "newbie-pass").await;

    // 一次性的邀请码用完了。
    let (status, code_name) = error_code(register(&state, &code, "second", "second-pass").await).await;
    assert_eq!((status, code_name.as_str()), (StatusCode::BAD_REQUEST, "INVITE_USED_UP"));

    let invite_id = invite["invite_id"].as_str().unwrap();
    let detail = read_json(send(&state, Method::GET, &format!("/api/v1/admin/invites/{invite_id}"), Some(&admin), None).await).await;
    assert_eq!(detail["data"]["invite"]["status"], "used_up");
    assert_eq!(detail["data"]["invite"]["used_count"], 1);
    assert_eq!(detail["data"]["users"].as_array().unwrap().len(), 1);
    assert_eq!(detail["data"]["users"][0]["username"], "newbie");
    assert_eq!(detail["data"]["users"][0]["deleted"], false);

    let list = read_json(send(&state, Method::GET, "/api/v1/admin/invites", Some(&admin), None).await).await;
    assert_eq!(list["data"]["invites"].as_array().unwrap().len(), 1);
    assert_eq!(list["data"]["invites"][0]["note"], "张老师课题组");
}

fn regex_like_code(code: &str) -> bool {
    let groups: Vec<&str> = code.split('-').collect();
    groups.len() == 3
        && groups.iter().all(|group| group.len() == 4)
        && code.chars().all(|ch| ch == '-' || (ch.is_ascii_uppercase() || ch.is_ascii_digit()))
        && !code.contains(['0', 'O', '1', 'I', 'L'])
}

#[tokio::test]
async fn rejected_registrations_do_not_use_up_the_invite() {
    let state = multi_state("invite-rejected");
    let admin = login(&state, "root", ADMIN_PASSWORD).await;
    let invite = create_invite(&state, &admin, json!({ "max_uses": 2 })).await;
    let code = invite["code"].as_str().unwrap().to_string();

    let cases = [
        (register(&state, "AAAA-BBBB-CCCC", "alice", "alice-pass").await, StatusCode::BAD_REQUEST, "INVITE_INVALID"),
        (register(&state, "too-short", "alice", "alice-pass").await, StatusCode::BAD_REQUEST, "INVITE_INVALID"),
        (register(&state, &code, "root", "alice-pass").await, StatusCode::CONFLICT, "USERNAME_TAKEN"),
        (register(&state, &code, "a", "alice-pass").await, StatusCode::BAD_REQUEST, "INVALID_USERNAME"),
        (register(&state, &code, "alice", "short").await, StatusCode::BAD_REQUEST, "WEAK_PASSWORD"),
    ];
    for (response, status, expected) in cases {
        assert_eq!(error_code(response).await, (status, expected.to_string()));
    }
    let invite_id = invite["invite_id"].as_str().unwrap();
    let detail = read_json(send(&state, Method::GET, &format!("/api/v1/admin/invites/{invite_id}"), Some(&admin), None).await).await;
    assert_eq!(detail["data"]["invite"]["used_count"], 0, "被拒的注册不算用掉");

    // 作废以后不能再注册，已经注册的人不受影响。
    assert_eq!(register(&state, &code, "alice", "alice-pass").await.status(), StatusCode::OK);
    let revoked = read_json(
        send(&state, Method::POST, &format!("/api/v1/admin/invites/{invite_id}/revoke"), Some(&admin), None).await,
    )
    .await;
    assert_eq!(revoked["data"]["status"], "revoked");
    assert_ne!(revoked["data"]["revoked_at"], "");
    let (status, code_name) = error_code(register(&state, &code, "bob", "bob-pass-1").await).await;
    assert_eq!((status, code_name.as_str()), (StatusCode::BAD_REQUEST, "INVITE_REVOKED"));
    login(&state, "alice", "alice-pass").await;

    // 新用户默认 0 页：没送页数的邀请码注册的人提交不了收费任务（规则同管理员建号）。
    let alice = login(&state, "alice", "alice-pass").await;
    let pages = read_json(send(&state, Method::GET, "/api/v1/account/pages", Some(&alice), None).await).await;
    assert_eq!(pages["data"]["balance"], 0);
}

#[tokio::test]
async fn only_admins_manage_invites_and_inputs_are_validated() {
    let state = multi_state("invite-admin");
    let admin = login(&state, "root", ADMIN_PASSWORD).await;
    let (_, user) = create_and_login(&state, &admin, "plain").await;

    for (method, uri) in [
        (Method::GET, "/api/v1/admin/invites"),
        (Method::POST, "/api/v1/admin/invites"),
        (Method::GET, "/api/v1/admin/invites/inv_x"),
        (Method::POST, "/api/v1/admin/invites/inv_x/revoke"),
    ] {
        let body = (method == Method::POST).then(|| json!({}));
        let response = send(&state, method.clone(), uri, Some(&user), body.clone()).await;
        assert_eq!(response.status(), StatusCode::FORBIDDEN, "{method} {uri}");
        let response = send(&state, method.clone(), uri, None, body).await;
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED, "{method} {uri}");
    }

    for (body, field) in [
        (json!({ "max_uses": 0 }), "max_uses"),
        (json!({ "max_uses": 1001 }), "max_uses"),
        (json!({ "initial_pages": -1 }), "initial_pages"),
        (json!({ "expires_in_days": 0 }), "expires_in_days"),
        (json!({ "expires_in_days": 366 }), "expires_in_days"),
        (json!({ "note": "长".repeat(201) }), "note"),
    ] {
        let response = send(&state, Method::POST, "/api/v1/admin/invites", Some(&admin), Some(body.clone())).await;
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{body}");
        let json = read_json(response).await;
        assert_eq!(json["code"], "INVALID_INVITE_INPUT", "{body}");
        assert_eq!(json["error"]["details"]["field"], field, "{json}");
    }
    let unknown = send(&state, Method::POST, "/api/v1/admin/invites", Some(&admin), Some(json!({ "pages": 5 }))).await;
    assert_eq!(unknown.status(), StatusCode::BAD_REQUEST, "不认识的字段是请求写错了");

    let expiring = create_invite(&state, &admin, json!({ "expires_in_days": 7, "max_uses": 30 })).await;
    assert_ne!(expiring["expires_at"], "");
    assert_eq!(expiring["remaining_uses"], 30);

    let missing = send(&state, Method::GET, "/api/v1/admin/invites/inv_missing", Some(&admin), None).await;
    assert_eq!(error_code(missing).await, (StatusCode::NOT_FOUND, "INVITE_NOT_FOUND".to_string()));
    let missing = send(&state, Method::POST, "/api/v1/admin/invites/inv_missing/revoke", Some(&admin), None).await;
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn single_mode_has_no_invites() {
    let state = test_state("invite-single");
    let response = register(&state, "AAAA-BBBB-CCCC", "alice", "alice-pass").await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}
