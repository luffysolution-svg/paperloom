import {
  fetchLatestGithubRelease,
  normalizeReleaseInfo,
} from "./github-release.js";
import {
  defaultUpdateCachePort,
} from "./state.js";
import { getDesktopHost } from "@/platform/desktop/host.js";

function desktopUpdatePort() {
  const host = getDesktopHost();
  return host?.updaterAvailable ? { invoke: host.invoke, subscribe: host.onUpdateState } : null;
}

export function mountAppUpdateFeature({
  enabled = true,
  cachePort = defaultUpdateCachePort,
  fetchLatestRelease = fetchLatestGithubRelease,
  normalizeRelease = normalizeReleaseInfo,
  viewPort,
  desktopUpdater = desktopUpdatePort(),
}: any = {}) {
  if (desktopUpdater) {
    let disposed = false, events = 0, status = "idle";
    const apply = (state) => { if (!disposed) { status = state.status; viewPort.setDesktopState(state); } };
    const unsubscribe = desktopUpdater.subscribe((state) => { events += 1; apply(state); });
    async function invoke(command) {
      const before = events;
      try {
        const state = await desktopUpdater.invoke(command);
        if (events === before) apply(state);
      } catch (error) {
        if (events === before) apply({ status: "error", error: error.message });
      }
    }
    viewPort.bindButton({
      onCheck: () => invoke("check_app_update"),
      onDownload: () => invoke("download_app_update"),
      onCancel: () => invoke("cancel_app_update"),
      onInstall: () => invoke("install_app_update"),
    });
    void invoke("get_app_update_state");
    const timer = enabled ? window.setTimeout(() => {
      if (status === "idle") void invoke("check_app_update");
    }, 1200) : null;
    return {
      checkForUpdates: () => invoke("check_app_update"),
      dispose: () => { disposed = true; if (timer !== null) window.clearTimeout(timer); unsubscribe(); },
    };
  }
  function applyUpdateInfo(info) {
    if (!info) {
      viewPort.setReady();
      return;
    }
    if (info.hasUpdate) {
      viewPort.setAvailable(info);
    } else {
      viewPort.setLatest(info);
    }
  }

  async function checkForUpdates({ manual = false }: any = {}) {
    if (!enabled) {
      return false;
    }
    if (manual) {
      viewPort.setChecking();
    }
    try {
      const release = await fetchLatestRelease();
      const info = normalizeRelease(release);
      cachePort.write(info);
      applyUpdateInfo(info);
    } catch (error) {
      if (manual) {
        viewPort.setError(error);
      }
    }
    return true;
  }

  viewPort.bindButton({
    onCheck: () => {
      void checkForUpdates({ manual: true });
    },
  });

  if (!enabled) {
    viewPort.setReady();
    return {
      checkForUpdates,
    };
  }

  const cached = cachePort.read();
  applyUpdateInfo(cached.info);
  if (cached.fresh) {
    return {
      checkForUpdates,
    };
  }

  window.setTimeout(() => {
    void checkForUpdates({ manual: false });
  }, 1200);

  return {
    checkForUpdates,
  };
}
