import { copyReaderText } from "../utils/clipboard.js";

type TableFormat = "Markdown" | "LaTeX";

function replaceMathForCopy(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-reader-tex], .reader-md-math-error").forEach((math) => {
    const tex = math.dataset.readerTex ?? math.textContent ?? "";
    const replacement = math.ownerDocument.createTextNode(`${math.classList.contains("reader-md-math-display") ? "\n" : ""}$${tex}$${math.classList.contains("reader-md-math-display") ? "\n" : ""}`);
    math.replaceWith(replacement);
  });
  root.querySelectorAll(".reader-md-copy-actions, .reader-md-internal-back").forEach((node) => node.remove());
}

function openImagePreview(image: HTMLImageElement) {
  const doc = image.ownerDocument;
  const overlay = doc.createElement("div");
  overlay.className = "reader-md-image-preview";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "\u56fe\u7247\u9884\u89c8");
  const enlarged = image.cloneNode(true) as HTMLImageElement;
  enlarged.removeAttribute("loading");
  enlarged.removeAttribute("data-reader-md-src");
  enlarged.src = image.currentSrc || image.src;
  const close = () => overlay.remove();
  overlay.onclick = (event) => { if (event.target === overlay) close(); };
  overlay.append(enlarged);
  doc.body.append(overlay);
  overlay.tabIndex = -1;
  overlay.focus();
  overlay.onkeydown = (event) => { if (event.key === "Escape") close(); };
}

function installMarkdownInteractions(container: HTMLElement) {
  const interactionRoot = container.closest<HTMLElement>(".reader-markdown-content") || container;
  if (interactionRoot.dataset.readerMarkdownInteractionsBound === "true") return;
  interactionRoot.dataset.readerMarkdownInteractionsBound = "true";
  let previousScrollTop: number | null = null;
  const doc = interactionRoot.ownerDocument;
  const scrollRoot = interactionRoot.closest<HTMLElement>(".reader-notes-panel-body") || interactionRoot;
  const back = doc.createElement("button");
  back.type = "button";
  back.className = "reader-md-internal-back";
  back.textContent = "\u8fd4\u56de\u4e0a\u6b21\u4f4d\u7f6e";
  back.hidden = true;
  back.onclick = () => {
    if (previousScrollTop == null) return;
    scrollRoot.scrollTo({ top: previousScrollTop, behavior: "smooth" });
    back.hidden = true;
  };
  interactionRoot.prepend(back);
  interactionRoot.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>("a[href^='#']");
    if (!link || !interactionRoot.contains(link)) return;
    const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
    const destination = interactionRoot.ownerDocument.getElementById(id);
    if (!destination || !interactionRoot.contains(destination)) return;
    event.preventDefault();
    previousScrollTop = scrollRoot.scrollTop;
    destination.scrollIntoView?.({ block: "center", behavior: "smooth" });
    back.hidden = false;
    destination.classList.add("reader-md-internal-target");
    doc.defaultView?.setTimeout(() => destination.classList.remove("reader-md-internal-target"), 1200);
  });
}

const latexEscapes: Record<string, string> = {
  "\\": "\\textbackslash{}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}",
};

function cellContent(node: Node, format: TableFormat): string {
  if (node.nodeType === 3) {
    const text = node.textContent || "";
    return format === "Markdown"
      ? text.replace(/[\\|*_`<>[\]]/g, "\\$&")
      : text.replace(/[\\&%$#_{}~^]/g, (char) => latexEscapes[char] ?? "\\" + char);
  }
  const element = node as HTMLElement;
  if (node.nodeType !== 1 || element.classList.contains("reader-md-copy-actions")) return "";
  const tex = element.dataset.readerTex ?? (element.classList.contains("reader-md-math-error") ? element.textContent : null);
  if (tex != null) return "$" + (format === "Markdown" ? tex.replace(/\|/g, "\\|") : tex) + "$";
  if (element.tagName === "BR") return format === "Markdown" ? "<br>" : " ";
  const content = Array.from(element.childNodes, (child) => cellContent(child, format)).join("");
  if (element.tagName === "SUP" || element.tagName === "SUB") {
    const tag = element.tagName.toLowerCase();
    if (format === "Markdown") return `<${tag}>${content}</${tag}>`;
    const command = tag === "sup" ? "\\textsuperscript" : "\\textsubscript";
    return `${command}{${content}}`;
  }
  return element.tagName === "P" ? content + " " : content;
}

export function serializeMarkdownTable(table: HTMLTableElement, format: TableFormat): string {
  const rows = Array.from(table.rows);
  const grid: string[][] = rows.map(() => []);
  rows.forEach((row, y) => {
    let x = 0;
    for (const cell of row.cells) {
      while (grid[y][x] !== undefined) x++;
      // Empty continuation cells keep later values in the correct column in both formats.
      const group = row.parentElement as HTMLTableSectionElement;
      const remaining = group.rows.length - row.sectionRowIndex;
      const height = Math.min(cell.rowSpan || remaining, remaining);
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < cell.colSpan; dx++) grid[y + dy][x + dx] = "";
      }
      grid[y][x] = cellContent(cell, format).replace(/\s+/g, " ").trim();
      x += cell.colSpan;
    }
  });
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (!width) return "";
  const fields = grid.map((row) => Array.from({ length: width }, (_, x) => row[x] ?? ""));
  if (format === "Markdown") {
    fields.splice(1, 0, Array(width).fill("---"));
    return fields.map((row) => "| " + row.join(" | ") + " |").join("\n");
  }
  return [
    `\\begin{tabular}{${"l".repeat(width)}}`,
    ...fields.map((row) => row.join(" & ") + " \\\\"),
    "\\end{tabular}",
  ].join("\n");
}

function serializeWordTable(table: HTMLTableElement) {
  const clone = table.cloneNode(true) as HTMLTableElement;
  replaceMathForCopy(clone);
  clone.setAttribute("border", "1");
  clone.style.borderCollapse = "collapse";
  clone.querySelectorAll("th, td").forEach((cell) => {
    (cell as HTMLElement).style.border = "1px solid #b8bec8";
    (cell as HTMLElement).style.padding = "4px 8px";
  });
  return { html: clone.outerHTML, text: serializeMarkdownTable(table, "Markdown") };
}

async function copyReaderHtml(html: string, text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
      await navigator.clipboard.write([new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([text], { type: "text/plain" }),
      })]);
      return true;
    }
  } catch {
    // Fall back to plain text below.
  }
  return copyReaderText(text);
}

async function imageAsPng(image: HTMLImageElement): Promise<Blob> {
  const src = new URL(image.currentSrc || image.src, image.ownerDocument.baseURI);
  let drawable = image;
  if (/^https?:$/.test(src.protocol) && src.origin !== location.origin) {
    drawable = new Image();
    drawable.crossOrigin = "anonymous";
    drawable.src = src.href;
  }
  await drawable.decode();
  const canvas = image.ownerDocument.createElement("canvas");
  canvas.width = drawable.naturalWidth;
  canvas.height = drawable.naturalHeight;
  canvas.getContext("2d")!.drawImage(drawable, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG \u7f16\u7801\u5931\u8d25")), "image/png");
  });
}

export function addMarkdownCopyActions(container: HTMLElement) {
  installMarkdownInteractions(container);
  for (const asset of container.querySelectorAll<HTMLImageElement | HTMLTableElement>("img[data-reader-md-src], table")) {
    const doc = asset.ownerDocument;
    const actions = doc.createElement("span");
    actions.className = "reader-md-copy-actions";
    const feedback = doc.createElement("span");
    feedback.setAttribute("role", "status");
    actions.append(feedback);
    const isImage = asset.tagName === "IMG";
    if (isImage) {
      actions.hidden = true;
      if (!asset.closest("a")) {
        asset.addEventListener("click", () => openImagePreview(asset as HTMLImageElement));
      }
      asset.addEventListener("load", () => { actions.hidden = false; }, { once: true });
    } else {
      actions.append("\u590d\u5236\u4e3a");
    }
    for (const label of isImage ? ["\u590d\u5236\u56fe\u7247", "\u653e\u5927", "\u4e0b\u8f7d"] : ["Markdown", "LaTeX", "Word"] as const) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-label", isImage ? label : "\u590d\u5236\u8868\u683c\u4e3a " + label);
      button.onclick = async (event) => {
        event.stopPropagation();
        feedback.textContent = "";
        let copied = false;
        try {
          if (isImage && label === "\u653e\u5927") {
            openImagePreview(asset as HTMLImageElement);
            copied = true;
          } else if (isImage && label === "\u4e0b\u8f7d") {
            const image = asset as HTMLImageElement;
            const href = image.currentSrc || image.src || image.dataset.readerMdSrc;
            if (href) {
              const link = doc.createElement("a");
              link.href = href;
              link.download = "paperloom-image";
              link.click();
              copied = true;
            }
          } else if (isImage) {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": imageAsPng(asset as HTMLImageElement) })]);
            copied = true;
          } else if (label === "Word") {
            const copiedTable = serializeWordTable(asset as HTMLTableElement);
            copied = await copyReaderHtml(copiedTable.html, copiedTable.text);
          } else {
            copied = await copyReaderText(serializeMarkdownTable(asset as HTMLTableElement, label as TableFormat));
          }
        } catch {
          // The clipboard can be unavailable, or an external image may disallow pixel access.
        }
        feedback.textContent = copied ? "\u5df2\u590d\u5236" : "\u590d\u5236\u5931\u8d25";
      };
      actions.append(button);
    }
    (asset.closest("a") || asset).after(actions);
  }

  for (const formula of container.querySelectorAll<HTMLElement>(".reader-md-math-display")) {
    if (formula.closest("table") || formula.dataset.readerFormulaActionsBound === "true") continue;
    const tex = formula.dataset.readerTex
      || formula.querySelector<HTMLElement>(".reader-md-math-error")?.textContent?.trim()
      || "";
    if (!tex) continue;
    formula.dataset.readerFormulaActionsBound = "true";
    const actions = formula.ownerDocument.createElement("span");
    actions.className = "reader-md-copy-actions reader-md-formula-actions";
    const feedback = formula.ownerDocument.createElement("span");
    feedback.setAttribute("role", "status");
    const button = formula.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = "复制 LaTeX";
    button.setAttribute("aria-label", "复制公式 LaTeX");
    button.onclick = async (event) => {
      event.stopPropagation();
      feedback.textContent = await copyReaderText(tex) ? "已复制" : "复制失败";
    };
    actions.append(button, feedback);
    formula.after(actions);
  }
}
