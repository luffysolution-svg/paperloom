// Markdown 图片加载：受保护图片走带凭据的 blob 获取 + 视口懒加载，公开图片用原生 lazy。

export type MarkdownImageProgress = {
  failed: number;
  loaded: number;
  total: number;
};

export type ProtectedMarkdownImageLoaderOptions = {
  fetchImage: (url: string, init?: RequestInit) => Promise<Response>;
  onObjectUrl: (url: string) => void;
  onProgress?: (progress: MarkdownImageProgress) => void;
  protectedBaseUrl?: string;
  root?: Element | null;
  /** 外部取消信号：卸载/重来时中止在途的受保护图片请求。 */
  signal?: AbortSignal;
};

export function isProtectedMarkdownAssetUrl(value: string, baseUrl = "http://localhost/"): boolean {
  if (/^mock:\/\//i.test(value)) return true;
  try {
    // API payloads normally expose a root-relative images_base_url. A relative URL
    // cannot itself be used as URL's base, so anchor both values to the document
    // origin before deciding whether the image needs the credentialed fetch path.
    const documentBase = globalThis.location?.href || "http://localhost/";
    const trustedBase = new URL(baseUrl, documentBase);
    const url = new URL(value, trustedBase);
    if (!/\/api\/v1\/jobs\/[^/]+\/markdown\/images\//.test(url.pathname)) return false;
    if (!/^[a-z][a-z\d+.-]*:/i.test(value)) return true;
    const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname);
    return url.origin === trustedBase.origin || isLoopback;
  } catch {
    return false;
  }
}

function isSafeDirectImageUrl(value: string, baseUrl: string): boolean {
  if (/^data:image\//i.test(value) || /^blob:/i.test(value)) return true;
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Direct public images rely on native lazy loading. Protected images cannot set src until
 * their authenticated blob has been fetched, so observe them against the reader scrollport.
 */
export function startMarkdownImageLoading(
  images: HTMLImageElement[],
  options: ProtectedMarkdownImageLoaderOptions,
): () => void {
  let stopped = false;
  let active = 0;
  let loaded = 0;
  let failed = 0;
  const queue: HTMLImageElement[] = [];
  const protectedImages: HTMLImageElement[] = [];
  const queued = new Set<HTMLImageElement>();

  const replaceWithFailure = (img: HTMLImageElement, label: string) => {
    const fallback = img.ownerDocument.createElement("span");
    fallback.className = "reader-markdown-image-missing";
    fallback.textContent = label;
    fallback.title = img.getAttribute("data-reader-md-src") || "";
    img.replaceWith(fallback);
  };

  for (const img of images) {
    const src = img.getAttribute("data-reader-md-src") || "";
    const documentBaseUrl = img.ownerDocument.baseURI || "http://localhost/";
    if (isProtectedMarkdownAssetUrl(src, options.protectedBaseUrl || documentBaseUrl)) {
      protectedImages.push(img);
    } else if (isSafeDirectImageUrl(src, documentBaseUrl)) {
      img.src = src;
    } else {
      replaceWithFailure(img, "[图片地址不可用]");
    }
  }

  const report = () => options.onProgress?.({ failed, loaded, total: protectedImages.length });
  const pump = () => {
    if (stopped) return;
    while (active < 4 && queue.length > 0) {
      const img = queue.shift();
      if (!img?.isConnected) continue;
      active += 1;
      const src = img.getAttribute("data-reader-md-src") || "";
      void options.fetchImage(src, options.signal ? { signal: options.signal } : undefined)
        .then(async (response) => {
          if (!response?.ok) throw new Error(`HTTP ${response?.status || 0}`);
          const objectUrl = URL.createObjectURL(await response.blob());
          if (stopped || !img.isConnected) {
            try { URL.revokeObjectURL(objectUrl); } catch { /* ignore */ }
            return;
          }
          options.onObjectUrl(objectUrl);
          img.src = objectUrl;
          loaded += 1;
        })
        .catch(() => {
          if (stopped || !img.isConnected) return;
          failed += 1;
          replaceWithFailure(img, "[图片暂不可用]");
        })
        .finally(() => {
          active -= 1;
          if (!stopped) {
            report();
            pump();
          }
        });
    }
  };
  const enqueue = (img: HTMLImageElement) => {
    if (stopped || queued.has(img)) return;
    queued.add(img);
    queue.push(img);
    pump();
  };

  const Observer = globalThis.IntersectionObserver;
  let observer: IntersectionObserver | null = null;
  if (Observer && protectedImages.length > 0) {
    observer = new Observer((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const img = entry.target as HTMLImageElement;
        observer?.unobserve(img);
        enqueue(img);
      });
    }, { root: options.root || null, rootMargin: "600px 0px" });
    protectedImages.forEach((img) => observer?.observe(img));
  } else {
    protectedImages.forEach(enqueue);
  }
  report();

  return () => {
    stopped = true;
    queue.length = 0;
    observer?.disconnect();
  };
}
