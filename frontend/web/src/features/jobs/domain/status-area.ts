import {
  createStore,
} from "@/platform/store/store.js";
import {
  APP_EVENTS,
} from "@/platform/contracts/app-contract.js";
import {
  buildWorkflowSectionsViewModel,
} from "@retainpdf/domain/job";
import {
  createTranslationWorkflowStatusAreaPort,
} from "@/features/ingest/domain.js";
import type {
  Store,
} from "@/platform/store/store.js";

// 状态区可见性 feature（"当前有没有一个在跑的任务"这一位状态）。
//
// 它曾经驱动主页那张页面级状态卡 #job-status-card；那张卡已下线（进度主场是
// 书籍详情的「进度」Tab，图书馆卡片与任务中心各自也显示进度），所以这里只剩
// **状态机**，没有渲染消费方：
//   - translation-workflow-dialog-runtime 经 statusAreaPort.isVisible() 算
//     upload / status 两种模式；
//   - setWorkflowSections(job) 仍是 idle 复位链(create-lifecycle /
//     runtime-reset)与轮询启动链共用的回调。
//
// 事件契约:每次 setVisible 都 dispatch statusAreaVisibilityChanged(旧世界
// 同款,translation-workflow-dialog 靠它同步 upload/status 模式)。

export type StatusAreaState = {
  visible: boolean;
};

export type StatusAreaActions = {
  setVisible: (state: StatusAreaState, visible?: boolean) => StatusAreaState;
};

export type StatusAreaStore = Store<StatusAreaState, StatusAreaActions>;

export type StatusAreaPort = {
  hide: () => void;
  isVisible: () => boolean;
  returnHome: () => void;
};

export type WorkflowSectionsViewModel = {
  hasJob: boolean;
  processing: boolean;
};

export type StatusAreaFeature = {
  isVisible: () => boolean;
  setVisible: (visible: boolean) => void;
  setWorkflowSections: (job?: unknown) => WorkflowSectionsViewModel;
  statusAreaPort: StatusAreaPort;
  store: StatusAreaStore;
};

export function createStatusAreaFeature({
  documentRef = globalThis.document,
}: {
  documentRef?: Document | null;
} = {}): StatusAreaFeature {
  const store = createStore<StatusAreaState, StatusAreaActions>({
    name: "homeStatusArea",
    initialState: { visible: false },
    actions: {
      setVisible(currentState, visible = false) {
        return { ...currentState, visible: Boolean(visible) };
      },
    },
  });

  function dispatchVisibilityChanged() {
    if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
      documentRef.dispatchEvent(new globalThis.CustomEvent(APP_EVENTS.statusAreaVisibilityChanged));
    }
  }

  function setVisible(visible: boolean) {
    store.actions.setVisible(visible);
    dispatchVisibilityChanged();
  }

  function isVisible() {
    return Boolean(store.getSnapshot().visible);
  }

  // 旧世界从状态卡元素冒泡 returnHome;新世界直接发到 document
  // (消费方 jobRuntimeFeature.returnToHome 是 document 级监听,3b 接线)
  function returnHome() {
    if (documentRef?.dispatchEvent && typeof globalThis.CustomEvent === "function") {
      documentRef.dispatchEvent(new globalThis.CustomEvent(APP_EVENTS.returnHome));
    }
  }

  // setWorkflowSections(job):idle 复位链与 3b runtime-reset 共用的回调
  function setWorkflowSections(job: unknown = null): WorkflowSectionsViewModel {
    const viewModel = buildWorkflowSectionsViewModel(job) as WorkflowSectionsViewModel;
    setVisible(viewModel.hasJob);
    return viewModel;
  }

  const statusAreaPort = createTranslationWorkflowStatusAreaPort({
    isVisible,
    hide: () => setVisible(false),
    returnHome,
  }) as StatusAreaPort;

  return {
    isVisible,
    setVisible,
    setWorkflowSections,
    statusAreaPort,
    store,
  };
}
