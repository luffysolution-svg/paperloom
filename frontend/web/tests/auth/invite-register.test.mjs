// 邀请码注册：登录页「用邀请码注册」、?invite= 直接打开注册并填好；提交前检查；后端的中文原因原样显示；
// 管理后台「邀请码」页：生成（后端字段错误标到对应输入框）、显眼给出邀请码和注册链接、详情、作废要确认。
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { waitFor } from "../helpers/async.mjs";
import { buildInviteLink, readInviteParam, registerProblem } from "../../src/features/auth/domain/register.ts";
import { inviteErrorField, inviteFormProblem, inviteInput, EMPTY_INVITE_FORM } from "../../src/features/admin/domain/invites.ts";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/index.html" });
for (const key of ["window", "document", "DocumentFragment", "HTMLElement", "HTMLButtonElement", "HTMLFormElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "Node", "MutationObserver", "NodeFilter", "CustomEvent", "Event", "MouseEvent", "KeyboardEvent", "getComputedStyle", "navigator"]) {
  Object.defineProperty(globalThis, key, {
    value: key === "getComputedStyle" ? dom.window.getComputedStyle.bind(dom.window) : (dom.window[key] ?? dom.window),
    writable: true,
    configurable: true,
  });
}
globalThis.window = dom.window;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(0), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = false;
const doc = dom.window.document;

function typeInto(input, value) {
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}
function click(el) {
  el.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
  el.dispatchEvent(new dom.window.MouseEvent("mouseup", { bubbles: true, button: 0 }));
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, button: 0 }));
}
function submit(form) {
  form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
}
async function mount(type, props) {
  const React = await import("react");
  const { createRoot } = await import("react-dom/client");
  const host = doc.createElement("div");
  doc.body.appendChild(host);
  const root = createRoot(host);
  root.render(React.createElement(type, props));
  return { host, unmount: () => { root.unmount(); host.remove(); } };
}

test("注册的纯逻辑：读 ?invite=、拼邀请链接、提交前检查；邀请码表单的范围和后端字段错误", () => {
  assert.equal(readInviteParam("?invite=ABCD-EFGH-JKMN&x=1"), "ABCD-EFGH-JKMN");
  assert.equal(readInviteParam("?tab=library"), "");
  assert.equal(buildInviteLink("ABCD-EFGH-JKMN", "https://app.example.com", "/admin.html"), "https://app.example.com/index.html?invite=ABCD-EFGH-JKMN");
  assert.equal(buildInviteLink("A B", "http://h", "/sub/admin.html"), "http://h/sub/index.html?invite=A%20B");

  const ok = { inviteCode: "abcd efgh jkmn", username: "li.ming", password: "secret-123", confirm: "secret-123" };
  assert.equal(registerProblem(ok), "");
  assert.equal(registerProblem({ ...ok, inviteCode: " " }), "请填邀请码。");
  assert.match(registerProblem({ ...ok, username: "a b" }), /3～32 位/);
  assert.equal(registerProblem({ ...ok, password: "short", confirm: "short" }), "密码要 8～128 位。");
  assert.equal(registerProblem({ ...ok, confirm: "secret-124" }), "两次输入的密码不一样。");

  assert.equal(inviteFormProblem(EMPTY_INVITE_FORM), null);
  assert.equal(inviteFormProblem({ ...EMPTY_INVITE_FORM, maxUses: "0" }).field, "max_uses");
  assert.equal(inviteFormProblem({ ...EMPTY_INVITE_FORM, initialPages: "100001" }).field, "initial_pages");
  assert.equal(inviteFormProblem({ ...EMPTY_INVITE_FORM, expiresInDays: "366" }).field, "expires_in_days");
  assert.equal(inviteFormProblem({ ...EMPTY_INVITE_FORM, expiresInDays: "" }), null, "留空 = 不过期");
  assert.equal(inviteFormProblem({ ...EMPTY_INVITE_FORM, note: "字".repeat(201) }).field, "note");
  assert.deepEqual(inviteInput({ maxUses: "3", initialPages: "50", expiresInDays: "", note: " 课题组 " }), { max_uses: 3, initial_pages: 50, note: "课题组" });
  assert.deepEqual(inviteInput(EMPTY_INVITE_FORM), { max_uses: 1, initial_pages: 0, expires_in_days: 7 });
  assert.equal(inviteErrorField({ code: "INVALID_INVITE_INPUT", details: { field: "note" } }), "note");
  assert.equal(inviteErrorField({ code: "OTHER", details: { field: "note" } }), "");
});

test("登录页：「用邀请码注册」切到注册；带 ?invite= 直接注册并填好；后端原因原样显示；成功进首页", async () => {
  const { LoginScreen } = await import("../../src/features/auth/ui/LoginScreen.jsx");
  // 1. 普通打开：登录表单，点「用邀请码注册」切过去，再点「去登录」切回来
  let view = await mount(LoginScreen, { submit: async () => {}, onSuccess: () => {}, register: async () => {}, onRegistered: () => {}, initialInvite: "" });
  await waitFor(() => view.host.querySelector('[data-auth-form="login"]'), "登录表单");
  click(view.host.querySelector('[data-auth-action="to-register"]'));
  await waitFor(() => view.host.querySelector('[data-auth-form="register"]'), "切到注册");
  click(view.host.querySelector('[data-auth-action="to-login"]'));
  await waitFor(() => view.host.querySelector('[data-auth-form="login"]'), "切回登录");
  view.unmount();

  // 2. 带邀请码：直接注册表单、邀请码已填
  const calls = [];
  let registered = 0;
  let failNext = true;
  view = await mount(LoginScreen, {
    initialInvite: "ABCD-EFGH-JKMN",
    register: async (code, username, password) => {
      calls.push([code, username, password]);
      if (failNext) { failNext = false; throw Object.assign(new Error("这个邀请码已经用完了"), { status: 400, code: "INVITE_USED_UP" }); }
    },
    onRegistered: () => { registered += 1; },
  });
  const form = await waitFor(() => view.host.querySelector('[data-auth-form="register"]'), "注册表单");
  const [code, user, pass, confirm] = form.querySelectorAll("input");
  assert.equal(code.value, "ABCD-EFGH-JKMN");
  typeInto(user, " li.ming ");
  typeInto(pass, "secret-123");
  typeInto(confirm, "secret-999");
  submit(form);
  await waitFor(() => form.querySelector(".auth-error")?.textContent === "两次输入的密码不一样。", "两次密码不一致");
  assert.equal(calls.length, 0, "前端拦住，不发请求");
  typeInto(confirm, "secret-123");
  submit(form);
  await waitFor(() => form.querySelector(".auth-error")?.textContent === "这个邀请码已经用完了", "后端原因原样显示");
  assert.equal(registered, 0);
  submit(form);
  await waitFor(() => registered === 1, "注册成功进首页");
  assert.deepEqual(calls.at(-1), ["ABCD-EFGH-JKMN", "li.ming", "secret-123"]);
  view.unmount();
});

const invite = (id, code, extra = {}) => ({
  invite_id: id, code, status: "active", max_uses: 1, used_count: 0, remaining_uses: 1, initial_pages: 0,
  note: "", expires_at: "", revoked_at: "", created_by: "u-admin", created_at: "2026-10-12T02:00:00Z", ...extra,
});

test("管理后台 · 邀请码：字段错误标在输入框上；生成后显眼给出邀请码；详情里点账号；作废要确认", async () => {
  const { AdminInvitesView } = await import("../../src/features/admin/ui/AdminInvitesView.jsx");
  let invites = [invite("i-old", "OLDX-OLDX-OLDX", { status: "used_up", used_count: 1, note: "老师" })];
  const calls = [];
  const opened = [];
  let rejectNote = true;
  const api = {
    list: async () => ({ invites }),
    create: async (input) => {
      calls.push(["create", input]);
      if (rejectNote) { rejectNote = false; throw Object.assign(new Error("备注最多 200 字"), { status: 400, code: "INVALID_INVITE_INPUT", details: { field: "note" } }); }
      const created = invite("i-new", "ABCD-EFGH-JKMN", { max_uses: input.max_uses, initial_pages: input.initial_pages, expires_at: "2026-10-19T02:00:00Z", note: input.note || "" });
      invites = [created, ...invites];
      return created;
    },
    detail: async (id) => ({ invite: invites.find((i) => i.invite_id === id), users: id === "i-old" ? [{ user_id: "u-li", username: "li", created_at: "2026-10-12T03:00:00Z", deleted: true }] : [] }),
    revoke: async (id) => { calls.push(["revoke", id]); invites = invites.map((i) => (i.invite_id === id ? { ...i, status: "revoked" } : i)); return invites.find((i) => i.invite_id === id); },
  };
  const { host, unmount } = await mount(AdminInvitesView, { api, onOpenUser: (id) => opened.push(id) });
  await waitFor(() => host.querySelector('[data-admin-invite="OLDX-OLDX-OLDX"]'), "列表");
  assert.match(host.querySelector('[data-admin-invite="OLDX-OLDX-OLDX"]').textContent, /已用完.*1 \/ 1.*不过期.*老师/);
  assert.equal(host.querySelector('[data-admin-invite="OLDX-OLDX-OLDX"] [data-admin-action="revoke-invite"]'), null, "用完的不给作废");

  const form = host.querySelector('[data-admin-form="create-invite"]');
  const pages = form.querySelector('[data-invite-field="initial_pages"] input');
  typeInto(pages, "abc");
  submit(form);
  await waitFor(() => form.querySelector('[data-invite-field="initial_pages"] .auth-error'), "前端检查标在赠送页数上");
  assert.equal(calls.length, 0);
  typeInto(pages, "50");
  submit(form);
  await waitFor(() => form.querySelector('[data-invite-field="note"] .auth-error')?.textContent === "备注最多 200 字", "后端字段错误标在备注上");
  submit(form);
  const issued = await waitFor(() => host.querySelector("[data-admin-issued-invite]"), "新邀请码");
  assert.equal(issued.querySelector(".auth-issued-password").textContent, "ABCD-EFGH-JKMN");
  assert.match(issued.textContent, /复制邀请码.*复制注册链接/);
  assert.match(issued.textContent, /每个注册的账号送 50 页/);
  assert.deepEqual(calls.filter(([n]) => n === "create").at(-1)[1], { max_uses: 1, initial_pages: 50, expires_in_days: 7 });
  await waitFor(() => host.querySelector('[data-admin-invite="ABCD-EFGH-JKMN"]'), "新邀请码进列表");

  click(host.querySelector('[data-admin-invite="OLDX-OLDX-OLDX"] [data-admin-action="invite-detail"]'));
  const detail = await waitFor(() => host.querySelector('[data-admin-invite-detail="OLDX-OLDX-OLDX"] .admin-user-link'), "详情里的注册账号");
  assert.match(host.querySelector('[data-admin-invite-detail="OLDX-OLDX-OLDX"]').textContent, /li（已删除）/);
  click(detail);
  assert.deepEqual(opened, ["u-li"]);

  click(host.querySelector('[data-admin-invite="ABCD-EFGH-JKMN"] [data-admin-action="revoke-invite"]'));
  await waitFor(() => doc.getElementById("admin-revoke-invite"), "作废确认");
  assert.match(doc.getElementById("admin-revoke-invite").textContent, /已经注册的账号不受影响/);
  assert.ok(!calls.some(([n]) => n === "revoke"), "确认前不作废");
  click(doc.getElementById("admin-revoke-invite-confirm"));
  await waitFor(() => host.querySelector('[data-admin-invite="ABCD-EFGH-JKMN"]')?.dataset.status === "revoked", "作废后刷新");
  assert.deepEqual(calls.at(-1), ["revoke", "i-new"]);
  unmount();
});
