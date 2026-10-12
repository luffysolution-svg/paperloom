const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");

const REPO = "luffysolution-svg/paperloom";
const LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;

function createDesktopUpdater({ app, fetchImpl, openPath, launchPortable, hasActiveJobs,
  onState = () => {}, platform = process.platform, arch = process.arch,
  portableFile = process.env.PORTABLE_EXECUTABLE_FILE || "",
}) {
  const mode = platform === "win32" ? (portableFile ? "portable" : "installer")
    : platform === "darwin" ? "mac" : "linux";
  const cacheDir = path.join(app.getPath("userData"), "updates");
  let state = { status: "idle", mode, currentVersion: app.getVersion(), percent: 0 };
  let release, asset, downloadedFile, expectedHash, busy, downloadController;
  if (mode === "portable") {
    const resultFile = path.join(cacheDir, "portable-update-result.json");
    if (fs.existsSync(resultFile)) {
      try {
        const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
        if (!result.ok) state = { ...state, status: "error", error: `上次便携版更新未完成：${result.error || "请重新下载更新"}` };
        fs.unlinkSync(resultFile);
      } catch { /* A damaged receipt must not prevent application startup. */ }
    }
  }

  function publish(next) {
    state = { ...state, error: "", ...next, canDownload: Boolean(asset) };
    onState({ ...state });
    return { ...state };
  }

  function run(operation) {
    if (busy) return busy;
    busy = operation().finally(() => { busy = null; });
    return busy;
  }

  async function request(url, consume, controller = new AbortController(), timeoutMs = 30000) {
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        signal: controller.signal, credentials: "omit", cache: "no-store",
        headers: { Accept: "application/vnd.github+json", "User-Agent": "PaperLoom-Updater" },
      });
      if (!response.ok) throw new Error(`更新服务返回 HTTP ${response.status}`);
      return await consume(response);
    } finally { clearTimeout(timer); }
  }

  async function smallText(response) {
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > 1024 * 1024) throw new Error("更新信息过大");
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  function releaseAsset(name) {
    const selected = release.assets?.find((item) => item.name === name);
    const trustedUrl = `https://github.com/${REPO}/releases/download/${release.tag_name}/${name}`;
    if (!selected || selected.browser_download_url !== trustedUrl) {
      throw new Error(`发布包缺失或下载地址不可信：${name}`);
    }
    return selected;
  }

  function check() {
    return run(async () => {
      // A new check must never discard a package the user is about to install.
      if (state.status === "downloaded") return { ...state };
      publish({ status: "checking", percent: 0 });
      try {
        if (!app.isPackaged) throw new Error("开发模式不安装更新，请使用发行版软件");
        if (!((platform === "win32" || platform === "linux") && arch === "x64")
          && !(platform === "darwin" && arch === "arm64")) {
          throw new Error("当前系统架构暂无对应的更新包");
        }
        release = JSON.parse(await request(LATEST, smallText));
        const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(release.tag_name || "");
        if (!match || release.draft || release.prerelease) throw new Error("没有可安装的正式版本");
        const current = app.getVersion().split(/[.+-]/).slice(0, 3).map(Number);
        const diff = match.slice(1).map(Number).map((part, i) => part - (current[i] || 0)).find((part) => part !== 0);
        if (!diff || diff < 0) return publish({ status: "latest", latestVersion: release.tag_name });
        const version = release.tag_name.slice(1);
        const filename = mode === "portable" ? `PaperLoom-Windows-${version}.exe`
          : mode === "installer" ? `PaperLoom-Windows-${version}-Setup.exe`
            : mode === "mac" ? `PaperLoom-Mac-${version}.dmg` : `PaperLoom-Linux-${version}.deb`;
        asset = releaseAsset(filename);
        releaseAsset("SHA256SUMS.txt");
        if (!Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > 2 * 1024 ** 3) throw new Error("更新包大小无效");
        return publish({ status: "available", latestVersion: release.tag_name, title: release.name || release.tag_name,
          body: release.body || "", htmlUrl: `https://github.com/${REPO}/releases/tag/${release.tag_name}` });
      } catch (error) {
        asset = null;
        return publish({ status: "error", error: error.message });
      }
    });
  }

  function download() {
    return run(async () => {
      if (state.status === "downloaded" || !asset || !["available", "error"].includes(state.status)) return { ...state };
      const controller = new AbortController();
      downloadController = controller;
      const target = path.join(cacheDir, asset.name);
      const partial = `${target}.part`;
      let idleTimer;
      publish({ status: "downloading", percent: 0 });
      try {
        await fs.promises.mkdir(cacheDir, { recursive: true });
        const sums = await request(releaseAsset("SHA256SUMS.txt").browser_download_url, smallText, controller);
        const entries = sums.split(/\r?\n/).map((line) => /^([a-f0-9]{64}) [ *](.+)$/.exec(line));
        const matching = entries.filter((entry) => entry?.[2] === asset.name);
        if (matching.length !== 1) throw new Error("更新包校验信息缺失或重复");
        expectedHash = matching[0][1];
        const file = await fs.promises.open(partial, "w");
        const hash = createHash("sha256");
        let received = 0, lastProgress = 0;
        try {
          await request(asset.browser_download_url, async (response) => {
            const resetIdle = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => controller.abort(), 60000); };
            resetIdle();
            for await (const chunk of response.body) {
              resetIdle();
              received += chunk.length;
              if (received > asset.size) throw new Error("更新包大小与发布信息不符");
              hash.update(chunk);
              // FileHandle.write may be partial; writeFile handles the whole chunk.
              await file.writeFile(chunk);
              if (Date.now() - lastProgress > 250 || received === asset.size) {
                publish({ status: "downloading", percent: Math.floor(received * 100 / asset.size) });
                lastProgress = Date.now();
              }
            }
          }, controller, 2 * 60 * 60 * 1000);
        } finally { await file.close(); clearTimeout(idleTimer); }
        if (received !== asset.size || hash.digest("hex") !== expectedHash) throw new Error("更新包校验失败，请重新下载");
        await fs.promises.rm(target, { force: true });
        await fs.promises.rename(partial, target);
        downloadedFile = target;
        return publish({ status: "downloaded", percent: 100 });
      } catch (error) {
        await fs.promises.rm(partial, { force: true });
        return publish({ status: controller.signal.aborted ? "available" : "error",
          percent: 0, error: controller.signal.aborted ? "下载已取消或超时，可重新下载" : error.message });
      } finally { downloadController = null; }
    });
  }

  function install() {
    return run(async () => {
      if (state.status !== "downloaded" || !downloadedFile) return { ...state };
      try {
        if (await hasActiveJobs()) throw new Error("仍有任务运行或等待执行，请先完成或取消任务再安装更新");
        const hash = createHash("sha256");
        for await (const chunk of fs.createReadStream(downloadedFile)) hash.update(chunk);
        if (hash.digest("hex") !== expectedHash) {
          downloadedFile = null;
          return publish({ status: "error", error: "更新包校验失败，请重新下载" });
        }
        if (mode === "portable") {
          publish({ status: "installing" });
          await launchPortable({ source: downloadedFile, target: portableFile, sha256: expectedHash, parentPid: process.pid }, async () => {
            if (await hasActiveJobs()) throw new Error("准备更新期间有新任务启动，请先完成或取消任务再安装");
          });
        } else {
          const error = await openPath(downloadedFile);
          if (error) throw new Error(error);
        }
        if (mode === "portable" || mode === "installer") {
          publish({ status: "installing" });
          app.quit();
          return { ...state };
        }
        // Unsigned macOS and DEB use the system installer, which the user controls.
        return publish({ status: "downloaded", error: mode === "mac"
          ? "已打开安装包，请退出 PaperLoom，将新版拖入 Applications 并替换，然后重新启动。"
          : "已打开系统安装程序，请退出 PaperLoom，完成安装后重新启动；可能需要管理员密码。" });
      } catch (error) { return publish({ status: "downloaded", error: error.message }); }
    });
  }

  return { getState: () => ({ ...state }), check, download, install,
    cancel: () => { downloadController?.abort(); return { ...state }; } };
}

module.exports = { createDesktopUpdater };
