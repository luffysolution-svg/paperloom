function e(r) {
  var t, o;
  const a = (o = (t = globalThis.crypto) == null ? void 0 : t.randomUUID) == null ? void 0 : o.call(t);
  return `${r}-${a || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`}`;
}
export {
  e as c
};
//# sourceMappingURL=ai-chat-ZSCffLDD.js.map
