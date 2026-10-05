/** createTranslationState() 状态袋形状（可变，由 dataPort 就地写） */
export interface TranslationStateBag {
  jobId: string;
  loaded: boolean;
  summary: unknown;
  query: {
    finalStatus: string;
    q: string;
    limit: number;
    offset: number;
  };
  list: Array<{ item_id?: string; [key: string]: unknown }>;
  total: number;
  selectedItemId: string;
  selectedItem: unknown;
  replay: unknown;
}

export interface TranslationDataPortDeps {
  translationState: TranslationStateBag;
  apiPrefix?: string;
  currentJobId?: (() => string) | null;
  fetchTranslationDiagnostics: (jobId: string, apiPrefix?: string) => Promise<unknown>;
  fetchTranslationItems: (
    jobId: string,
    apiPrefix?: string,
    query?: TranslationStateBag["query"] | Record<string, unknown>,
  ) => Promise<unknown>;
  fetchTranslationItem: (
    jobId: string,
    itemId: string,
    apiPrefix?: string,
  ) => Promise<unknown>;
  replayTranslationItem: (
    jobId: string,
    itemId: string,
    apiPrefix?: string,
  ) => Promise<unknown>;
}

export interface TranslationLoadItemsOptions {
  selectFirst?: boolean;
}

export interface TranslationApplyQueryOptions {
  finalStatus?: string;
  q?: string;
}

export function createStatusDetailTranslationDataPort({
  translationState,
  apiPrefix,
  currentJobId,
  fetchTranslationDiagnostics,
  fetchTranslationItems,
  fetchTranslationItem,
  replayTranslationItem,
}: TranslationDataPortDeps) {
  // 跨任务串话防护：单调 token；发起加载/重置时推进，await 后校验，不一致丢弃写入。
  let requestToken = 0;

  function jobId() {
    return `${currentJobId?.() || ""}`.trim();
  }

  function reset(nextJobId = "") {
    requestToken += 1;
    // 首次绑定（此前无任务）保留调用方预置的过滤器；切任务/清空不继承旧过滤器。
    // 调用方确认：syncJob 切任务与无任务清空均无保留语义依赖；applyFilter 先设过滤
    // 后首绑加载属于用户本次显式选择，应予以保留。
    const firstBind = !translationState.jobId && nextJobId;
    translationState.jobId = nextJobId;
    translationState.loaded = false;
    translationState.summary = null;
    if (!firstBind) {
      translationState.query.finalStatus = "";
      translationState.query.q = "";
      translationState.query.offset = 0;
    }
    translationState.list = [];
    translationState.total = 0;
    translationState.selectedItemId = "";
    translationState.selectedItem = null;
    translationState.replay = null;
  }
  function syncJob() {
    const nextJobId = jobId();
    if (!nextJobId) {
      reset("");
      return "";
    }
    if (translationState.jobId !== nextJobId) {
      reset(nextJobId);
    }
    return nextJobId;
  }
  async function loadSummary(nextJobId: string, token: number) {
    const payload = await fetchTranslationDiagnostics(nextJobId, apiPrefix);
    if (token !== requestToken) {
      return translationState.summary;
    }
    const current = jobId();
    if (current && current !== nextJobId) {
      return translationState.summary;
    }
    translationState.summary = payload;
    return translationState.summary;
  }

  async function readItems(
    nextJobId: string,
    { selectFirst = false }: TranslationLoadItemsOptions = {},
    token: number,
  ) {
    const payload = await fetchTranslationItems(nextJobId, apiPrefix, translationState.query) as {
      items?: Array<{ item_id?: string; [key: string]: unknown }>;
      total?: number;
    } | null | undefined;
    if (token !== requestToken) {
      return {
        selectedItemId: translationState.selectedItemId,
        shouldLoadSelectedItem: false,
        selectionChanged: false,
      };
    }
    const current = jobId();
    if (current && current !== nextJobId) {
      return {
        selectedItemId: translationState.selectedItemId,
        shouldLoadSelectedItem: false,
        selectionChanged: false,
      };
    }
    translationState.list = Array.isArray(payload?.items) ? payload.items : [];
    translationState.total = Number(payload?.total || 0);
    const shouldKeepCurrent = translationState.list.some((item) => item.item_id === translationState.selectedItemId);
    if (shouldKeepCurrent) {
      return {
        selectedItemId: translationState.selectedItemId,
        shouldLoadSelectedItem: false,
        selectionChanged: false,
      };
    }
    const nextItemId = selectFirst && translationState.list.length
      ? `${translationState.list[0].item_id || ""}`.trim()
      : "";
    translationState.selectedItemId = nextItemId;
    translationState.selectedItem = null;
    translationState.replay = null;
    return {
      selectedItemId: nextItemId,
      shouldLoadSelectedItem: Boolean(nextItemId),
      selectionChanged: true,
    };
  }

  async function loadItems(nextJobId: string, options: TranslationLoadItemsOptions = {}) {
    return readItems(nextJobId, options, ++requestToken);
  }

  async function loadSummaryAndItems({ selectFirst = false }: TranslationLoadItemsOptions = {}) {
    const nextJobId = syncJob();
    if (!nextJobId) {
      return {
        jobId: "",
        selectedItemId: "",
        shouldLoadSelectedItem: false,
        selectionChanged: true,
      };
    }
    const token = ++requestToken;
    await loadSummary(nextJobId, token);
    const current = jobId();
    if (token !== requestToken || (current && current !== nextJobId)) {
      return {
        jobId: nextJobId,
        selectedItemId: translationState.selectedItemId,
        shouldLoadSelectedItem: false,
        selectionChanged: false,
      };
    }
    const itemSelection = await readItems(nextJobId, { selectFirst }, token);
    return {
      jobId: nextJobId,
      ...itemSelection,
    };
  }

  async function loadItem(nextJobId: string, itemId: string) {
    const normalizedItemId = `${itemId || ""}`.trim();
    if (!normalizedItemId) {
      return null;
    }
    const token = ++requestToken;
    translationState.selectedItemId = normalizedItemId;
    translationState.replay = null;
    const payload = await fetchTranslationItem(nextJobId, normalizedItemId, apiPrefix);
    if (token !== requestToken) {
      return translationState.selectedItem;
    }
    const current = jobId();
    if (current && current !== nextJobId) {
      return translationState.selectedItem;
    }
    translationState.selectedItem = payload;
    return translationState.selectedItem;
  }

  async function replaySelectedItem() {
    const nextJobId = jobId();
    const itemId = `${translationState.selectedItemId || ""}`.trim();
    if (!nextJobId || !itemId) {
      return null;
    }
    // 与 loadSummary / readItems / loadItem 同款守卫。重放会真的跑一次翻译，
    // 窗口以秒计；此前这里既不推进 requestToken 也不校验回来时的上下文，
    // 迟到的结果会无条件写入 translationState.replay，盖掉 loadItem 已经做过的
    // `replay = null` 清理——于是 A 条目的重放结果显示在 B 条目详情下方，
    // 状态栏还写着"重放完成"。跨任务同理。
    const token = ++requestToken;
    const payload = await replayTranslationItem(nextJobId, itemId, apiPrefix);
    if (token !== requestToken) {
      return translationState.replay;
    }
    const current = jobId();
    if (current && current !== nextJobId) {
      return translationState.replay;
    }
    if (`${translationState.selectedItemId || ""}`.trim() !== itemId) {
      // 请求在途时用户改选了别的条目：结果已经不属于当前详情，丢弃。
      return translationState.replay;
    }
    translationState.replay = payload;
    return translationState.replay;
  }

  function applyQuery({ finalStatus = "", q = "" }: TranslationApplyQueryOptions = {}) {
    translationState.query.finalStatus = finalStatus;
    translationState.query.q = q;
    translationState.query.offset = 0;
    // 刻意不在这里置 loaded：此刻一个请求都还没发出去。
    // 旧代码在这里就置真，而 applyFilter 的失败路径不回滚，于是诊断 404 的任务
    // 点一次"刷新"后 loaded 永久为真 → ensureTranslationData 的 `loaded && !force`
    // 短路生效 → 之后怎么切 tab 都只重放旧状态，屏幕停在一屏全 0。
    // 真正加载成功后由 markLoaded() 置位。
  }

  function changePage(direction: string) {
    const limit = Number(translationState.query.limit || 20);
    const currentOffset = Number(translationState.query.offset || 0);
    const nextOffset = direction === "next"
      ? currentOffset + limit
      : Math.max(0, currentOffset - limit);
    if (nextOffset === currentOffset) {
      return false;
    }
    translationState.query.offset = nextOffset;
    return true;
  }

  function markLoaded() {
    translationState.loaded = true;
  }

  return {
    state: translationState,
    jobId,
    syncJob,
    reset,
    loadSummaryAndItems,
    loadItems,
    loadItem,
    replaySelectedItem,
    applyQuery,
    changePage,
    markLoaded,
  };
}

export type StatusDetailTranslationDataPort = ReturnType<typeof createStatusDetailTranslationDataPort>;
