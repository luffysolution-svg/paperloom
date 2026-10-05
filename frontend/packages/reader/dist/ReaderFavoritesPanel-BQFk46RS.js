import { jsx as r, jsxs as o, Fragment as N } from "react/jsx-runtime";
import { useState as m, useCallback as k, useEffect as g } from "react";
import { Bookmark as b } from "lucide-react";
import { c as x, f as F, A as S, b as A } from "./ReaderApp-BFnKNkdf.js";
import { normalizeServerFavorite as E } from "./runtime/state.js";
function P(t) {
  const a = `${t || ""}`.trim();
  return a === "figure" ? "图表" : a === "data" ? "数据" : a === "sentence" ? "摘录" : a || "摘录";
}
function z({
  open: t,
  jobId: a,
  documentId: s,
  onClose: h,
  onJumpPage: v
}) {
  const [n, i] = m([]), [l, p] = m(!1), [u, c] = m(""), d = k(async () => {
    if (!a && !s) {
      i([]), c("当前没有可关联的文档");
      return;
    }
    p(!0), c("");
    try {
      let e = [];
      if (a)
        e = await x({ jobId: a }).loadServerFavorites();
      else if (s) {
        const { favorites: f = [] } = await F(S, { documentId: s });
        e = (Array.isArray(f) ? f : []).map((y) => E(y)).filter(Boolean);
      }
      i(e);
    } catch (e) {
      c(e instanceof Error ? e.message : "读取摘录失败"), i([]);
    } finally {
      p(!1);
    }
  }, [a, s]);
  return g(() => {
    t && d();
  }, [t, d]), /* @__PURE__ */ r(
    A,
    {
      id: "reader-favorites-panel",
      open: t,
      title: "摘录",
      subtitle: "本书云端摘录 · 服务端保存",
      titleIcon: /* @__PURE__ */ r(b, { size: 14, strokeWidth: 2.25, "aria-hidden": !0 }),
      storageKey: "retainpdf.reader.favorites-float.pos.v1",
      ariaLabel: "摘录",
      onClose: h,
      toolbar: /* @__PURE__ */ o(N, { children: [
        /* @__PURE__ */ r("span", { className: "reader-notes-count", children: l ? "加载中…" : `${n.length} 条` }),
        /* @__PURE__ */ r(
          "button",
          {
            type: "button",
            className: "reader-notes-export",
            disabled: l,
            onClick: () => void d(),
            children: "刷新"
          }
        )
      ] }),
      children: u ? /* @__PURE__ */ r("p", { className: "reader-notes-empty", role: "alert", children: u }) : l ? /* @__PURE__ */ r("p", { className: "reader-notes-empty", children: "正在加载摘录…" }) : n.length === 0 ? /* @__PURE__ */ r("p", { className: "reader-notes-empty", children: "暂无摘录。可从主页收藏内容后在这里定位阅读。" }) : n.map((e) => /* @__PURE__ */ o("article", { className: "reader-notes-item", children: [
        /* @__PURE__ */ o("div", { className: "reader-notes-item-top", children: [
          /* @__PURE__ */ r("span", { className: "reader-notes-kind", children: P(e.kind) }),
          /* @__PURE__ */ r("div", { className: "reader-notes-item-actions", children: /* @__PURE__ */ o(
            "button",
            {
              type: "button",
              className: "reader-notes-link",
              onClick: () => v(Math.max(1, (e.pageIdx || 0) + 1)),
              children: [
                "第 ",
                (e.pageIdx || 0) + 1,
                " 页"
              ]
            }
          ) })
        ] }),
        /* @__PURE__ */ r("p", { className: "reader-notes-quote", children: e.quoteText }),
        e.note ? /* @__PURE__ */ r("p", { className: "reader-notes-note", style: { cursor: "default" }, children: e.note }) : null
      ] }, e.favoriteId))
    }
  );
}
export {
  z as ReaderFavoritesPanel
};
//# sourceMappingURL=ReaderFavoritesPanel-BQFk46RS.js.map
