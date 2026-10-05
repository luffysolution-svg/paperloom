export function createGlossaryOptionsLoader({
  fetchGlossaries,
  apiPrefix,
  setDeveloperGlossaryOptions,
  setText,
  getDefaultSelectedId,
}: any) {
  let glossaryOptions = [];
  let glossaryOptionsLoaded = false;
  let glossaryOptionsLoading = null;

  function currentOptions() {
    return glossaryOptions;
  }

  function applyOptions(selectedId = "") {
    setDeveloperGlossaryOptions(glossaryOptions, `${selectedId || ""}`.trim());
  }

  async function loadGlossaryOptions({ force = false, selectedId = "" }: any = {}) {
    if ((!force && glossaryOptionsLoaded) || !fetchGlossaries) {
      const nextSelectedId = `${selectedId || ""}`.trim();
      if (nextSelectedId) {
        setDeveloperGlossaryOptions(glossaryOptions, nextSelectedId);
      }
      return glossaryOptions;
    }
    if (glossaryOptionsLoading) {
      return glossaryOptionsLoading;
    }
    glossaryOptionsLoading = fetchGlossaries(apiPrefix)
      .then((payload) => {
        glossaryOptions = Array.isArray(payload?.items) ? payload.items : [];
        glossaryOptionsLoaded = true;
        const requestedSelectedId = `${selectedId || ""}`.trim();
        const fallbackSelectedId = `${getDefaultSelectedId?.() || ""}`.trim();
        // 已删除术语表的残留 id 不再回退：仅当回退 id 仍在新列表中才沿用。
        const nextSelectedId = requestedSelectedId
          || (fallbackSelectedId && glossaryOptions.some((item) => `${item?.glossary_id || ""}`.trim() === fallbackSelectedId)
            ? fallbackSelectedId
            : "");
        setDeveloperGlossaryOptions(glossaryOptions, nextSelectedId);
        return glossaryOptions;
      })
      .catch((err) => {
        setText?.("error-box", err.message || String(err));
        return glossaryOptions;
      })
      .finally(() => {
        glossaryOptionsLoading = null;
      });
    return glossaryOptionsLoading;
  }

  return {
    applyOptions,
    currentOptions,
    loadGlossaryOptions,
  };
}
