const g = Object.freeze({
  source: {
    fallbackSuffix: "source",
    label: "原始 PDF",
    operation: "下载原始 PDF"
  },
  sideBySide: {
    fallbackSuffix: "side-by-side",
    label: "对照 PDF",
    operation: "下载对照 PDF"
  },
  translated: {
    fallbackSuffix: "translated",
    label: "译文 PDF",
    operation: "下载译文 PDF"
  }
});
function S(e) {
  return typeof e == "string" ? e.trim() : "";
}
function b({ jobId: e = "", jobPayload: n = null, manifestPayload: t = null } = {}) {
  return {
    currentJobId: e,
    currentJobManifest: t || null,
    currentJobManifestJobId: e,
    currentJobSnapshot: n || null
  };
}
function p(e, n) {
  return e === "sideBySide" && (!n.source || !n.translated) ? "对照 PDF 需要原始 PDF 和译文 PDF 都可用" : !n.source && (e === "source" || e === "sideBySide") ? "原始 PDF 尚未生成或清单不可用" : !n.translated && (e === "translated" || e === "sideBySide") ? "译文 PDF 尚未生成或清单不可用" : "下载地址暂不可用";
}
function F({
  resolveSourcePdfDownloadName: e = (c, l) => l || "",
  resolveTranslatedPdfDownloadName: n = (c, l) => l || "",
  createRuntimePort: t = null,
  resolveSourcePdf: f = (c) => ""
} = {}) {
  function c({ jobId: d = "", jobPayload: i = null, manifestPayload: D = null } = {}) {
    let s = "", a = "";
    if (t) {
      const R = t({
        getCurrentJobId: (o) => (o == null ? void 0 : o.currentJobId) || "",
        getCurrentJobSnapshot: (o) => (o == null ? void 0 : o.currentJobSnapshot) || null,
        getCachedManifestFor: (o, v) => (o == null ? void 0 : o.currentJobManifest) || null
      }).currentArtifactUrls(b({ jobId: d, jobPayload: i, manifestPayload: D }));
      s = R.translatedPdf || "", a = R.sideBySidePdf || "";
    }
    const r = f(D) || "", y = typeof r == "string" ? r : r && typeof r == "object" && (r.resource_url || r.resource_path || r.resourceUrl || r.resourcePath) || "", u = typeof r == "string" ? r : y || r;
    return {
      source: typeof u == "string" ? u : u || "",
      sideBySide: (typeof u == "string" ? u : y || r) && s ? a : "",
      translated: s
    };
  }
  function l(d, { jobId: i, jobPayload: D, manifestPayload: s }) {
    var r;
    const a = `${i || "result"}-${((r = g[d]) == null ? void 0 : r.fallbackSuffix) || "download"}.pdf`, P = b({ jobId: i, jobPayload: D, manifestPayload: s });
    return d === "source" ? e(P, a) || a : d === "translated" && n(P, a) || a;
  }
  return Object.freeze({
    resolveReaderDownloadUrls: c,
    resolveReaderDownloadName: l,
    readerDownloadNameState: b,
    disabledReason: p,
    trimString: S,
    READER_DOWNLOAD_ACTIONS: g
  });
}
const m = F(), J = m.resolveReaderDownloadUrls, N = m.resolveReaderDownloadName, w = Object.freeze({
  boot: "正在准备对照阅读…",
  metadata: "正在读取任务信息…",
  both: "正在加载原始 PDF 和译文 PDF…",
  sourceOnly: "原始 PDF 已加载，正在加载译文 PDF…",
  translatedOnly: "译文 PDF 已加载，正在加载原始 PDF…",
  ready: "对照阅读已就绪",
  failed: "对照阅读加载失败"
});
function _() {
  return {
    reader: {
      totalPages: 0,
      currentPage: 0,
      primaryViewerKey: ""
    },
    progress: {
      metadataReady: !1,
      sourceDone: !1,
      translatedDone: !1
    },
    bootProgressBar: {
      value: 0,
      target: 0,
      rafId: 0
    }
  };
}
function h(e) {
  e != null && e.progress && (e.progress.metadataReady = !1, e.progress.sourceDone = !1, e.progress.translatedDone = !1);
}
function x(e, n = w) {
  if (!(e != null && e.metadataReady))
    return { percent: 8, text: n.boot, stage: "boot" };
  const t = Number(e.sourceDone) + Number(e.translatedDone), f = 24 + t * 30;
  return t === 0 ? { percent: f, text: n.both, stage: "pdfs" } : t === 1 ? {
    percent: f,
    text: e.sourceDone ? n.sourceOnly : n.translatedOnly,
    stage: "pdfs"
  } : { percent: 92, text: n.ready, stage: "readying" };
}
export {
  g as READER_DOWNLOAD_ACTIONS,
  w as READER_PROGRESS_COPY,
  x as computeReaderProgressSnapshot,
  F as createReaderDownloadResolver,
  _ as createReaderPageState,
  p as disabledReason,
  b as readerDownloadNameState,
  h as resetReaderProgressState,
  N as resolveReaderDownloadName,
  J as resolveReaderDownloadUrls,
  S as trimString
};
//# sourceMappingURL=state.js.map
