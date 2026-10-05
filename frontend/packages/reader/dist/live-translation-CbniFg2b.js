function t(r) {
  return !!(r && typeof r == "object" && ("code" in r || "status" in r));
}
function a(r, n, o) {
  const e = new Error(r);
  return e.name = "ReaderTransportError", n !== void 0 && (e.status = n), o && (e.code = o), e;
}
export {
  a as c,
  t as i
};
//# sourceMappingURL=live-translation-CbniFg2b.js.map
