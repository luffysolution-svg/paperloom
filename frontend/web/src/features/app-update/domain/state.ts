import { APP_VERSION } from "@/platform/generated/app-version.js";
import { UPDATE_CHECK_CACHE_STORAGE_KEY as CACHE_KEY } from "@/platform/config/storage-keys.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type UpdateCacheInfoInput = {
  currentVersion?: string;
  latestVersion?: string;
  hasUpdate?: boolean;
  title?: string;
  body?: string;
  htmlUrl?: string;
  publishedAt?: string;
};

function normalizeCachedInfo(value: unknown) {
  if (!isObject(value)) {
    return null;
  }
  const checkedAt = Number(value.checkedAt);
  const latestVersion = `${value.latestVersion || ""}`.trim();
  if (!Number.isFinite(checkedAt) || !latestVersion) {
    return null;
  }
  return {
    checkedAt,
    currentVersion: String(value.currentVersion || APP_VERSION),
    latestVersion,
    hasUpdate: Boolean(value.hasUpdate),
    title: String(value.title || latestVersion),
    body: String(value.body || ""),
    htmlUrl: String(value.htmlUrl || ""),
    publishedAt: String(value.publishedAt || ""),
  };
}

export function createUpdateCachePort({
  storage = globalThis.window?.localStorage,
  now = () => Date.now(),
}: any = {}) {
  function read() {
    try {
      const cached = normalizeCachedInfo(JSON.parse(storage?.getItem(CACHE_KEY) || "null"));
      if (!cached) {
        return { info: null, fresh: false };
      }
      const ageMs = now() - cached.checkedAt;
      return {
        info: cached,
        fresh: ageMs >= 0 && ageMs < CACHE_TTL_MS,
      };
    } catch {
      return { info: null, fresh: false };
    }
  }

  function write(info: unknown) {
    if (!isObject(info)) {
      return;
    }
    try {
      const cached = {
        checkedAt: now(),
        currentVersion: String(info.currentVersion || APP_VERSION),
        latestVersion: String(info.latestVersion || ""),
        hasUpdate: Boolean(info.hasUpdate),
        title: String(info.title || ""),
        body: String(info.body || ""),
        htmlUrl: String(info.htmlUrl || ""),
        publishedAt: String(info.publishedAt || ""),
      };
      storage?.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
      // Cache failures should never affect update checks.
    }
  }

  return Object.freeze({
    read,
    write,
  });
}

export const defaultUpdateCachePort = createUpdateCachePort();

export function readUpdateCache(now = Date.now()) {
  return createUpdateCachePort({ now: () => now }).read();
}

export function writeUpdateCache(info: unknown, now = Date.now()) {
  createUpdateCachePort({ now: () => now }).write(info);
}
