const DEFAULT_PROVIDER_URL = "https://cdn-mineru.openxlab.org.cn/";
const RESOLVE_TIMEOUT_MS = 3000;

function parseProxyRules(value = "") {
  for (const rawRule of String(value).split(";")) {
    const rule = rawRule.trim();
    const match = /^(?:PROXY|HTTPS?)\s+(.+)$/i.exec(rule);
    if (!match) continue;
    const authority = match[1].trim();
    if (!authority || /[\s/]/.test(authority)) continue;
    return `http://${authority}`;
  }
  return "";
}

async function resolveSystemProxy(electronSession, options = {}) {
  const logger = options.logger || (() => {});
  const targetUrl = options.targetUrl || DEFAULT_PROVIDER_URL;
  if (!electronSession || typeof electronSession.resolveProxy !== "function") {
    return "";
  }
  let timer;
  try {
    const rules = await Promise.race([
      electronSession.resolveProxy(targetUrl),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("proxy lookup timed out")),
          RESOLVE_TIMEOUT_MS,
        );
      }),
    ]);
    const proxyUrl = parseProxyRules(rules);
    logger(
      proxyUrl
        ? "[desktop] system HTTPS proxy detected for provider traffic"
        : "[desktop] system proxy resolved provider traffic as direct",
    );
    return proxyUrl;
  } catch (error) {
    logger(
      `[desktop] system proxy lookup failed; using direct provider traffic: ${error?.message || error}`,
    );
    return "";
  } finally {
    if (timer) clearTimeout(timer);
  }
}

module.exports = {
  parseProxyRules,
  resolveSystemProxy,
};
