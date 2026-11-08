function s(...e) {
  for (const t of e) {
    const l = `${t ?? ""}`.trim();
    if (l)
      return l;
  }
  return "";
}
let n = null, o = () => null, a = () => null, r = () => "", u = () => "";
function A(e = {}) {
  "credentialsPort" in e && (n = e.credentialsPort ?? null), e.loadBrowserStoredConfig && (o = e.loadBrowserStoredConfig), e.loadDeveloperStoredConfig && (a = e.loadDeveloperStoredConfig), e.defaultModelBaseUrl && (r = e.defaultModelBaseUrl), e.defaultModelName && (u = e.defaultModelName);
}
function m() {
  n = null, o = () => null, a = () => null, r = () => "", u = () => "";
}
function i(e = o()) {
  var t, l;
  try {
    const d = `${((l = (t = n == null ? void 0 : n.getCredentials) == null ? void 0 : t.call(n)) == null ? void 0 : l.modelApiKey) ?? ""}`.trim();
    if (d)
      return d;
  } catch {
  }
  return `${(e == null ? void 0 : e.modelApiKey) ?? ""}`.trim();
}
function y({
  browserConfig: e = o(),
  developerConfig: t = a()
} = {}) {
  return t != null && t.apiProtocol && t.apiProtocol !== "openai" ? { apiKey: "", baseUrl: "", model: "", provider: "deepseek" } : {
    apiKey: i(e),
    baseUrl: s(t == null ? void 0 : t.baseUrl, r()),
    model: s(t == null ? void 0 : t.model, u()),
    provider: "deepseek"
  };
}
function S(e) {
  var l;
  const t = (l = a()) == null ? void 0 : l.apiProtocol;
  return t && t !== "openai" ? !1 : e !== void 0 ? !!i(e) : !!i();
}
const c = "retainpdf:credentials-changed";
function E() {
  var e;
  try {
    (e = globalThis.document) == null || e.dispatchEvent(new CustomEvent(c));
  } catch {
  }
}
const M = "缺少模型 API Key：请到设置 → API 设置填写 DeepSeek 等模型 Key（不是后端 X-API-Key）。";
export {
  c as C,
  M,
  i as a,
  m as b,
  S as h,
  E as n,
  y as r,
  A as s
};
//# sourceMappingURL=config-DT8amRQ9.js.map
