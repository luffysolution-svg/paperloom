import { copyReaderText } from "../utils/clipboard.js";

type TableFormat = "Markdown" | "LaTeX";

function replaceMathForCopy(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("[data-reader-tex], .reader-md-math-error").forEach((math) => {
    const tex = math.dataset.readerTex ?? math.textContent ?? "";
    const replacement = math.ownerDocument.createTextNode(`${math.classList.contains("reader-md-math-display") ? "\n" : ""}$${tex}$${math.classList.contains("reader-md-math-display") ? "\n" : ""}`);
    math.replaceWith(replacement);
  });
  root.querySelectorAll(".reader-md-copy-actions, .reader-md-selection-actions, .reader-md-internal-back").forEach((node) => node.remove());
}

function mathAncestor(node: Node, container: HTMLElement): HTMLElement | null {
  let current: Element | null = node.nodeType === Node.ELEMENT_NODE
    ? node as Element
    : node.parentElement;
  while (current && current !== container) {
    if (current.matches("[data-reader-tex], .reader-md-math-error")) return current as HTMLElement;
    current = current.parentElement;
  }
  return null;
}

function copyTextFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  if (element.classList.contains("reader-md-copy-actions")
    || element.classList.contains("reader-md-selection-actions")
    || element.classList.contains("reader-md-internal-back")) return "";
  if (element.tagName === "BR") return "\n";
  const text = Array.from(element.childNodes, copyTextFromNode).join("");
  return /^(ADDRESS|ARTICLE|BLOCKQUOTE|DIV|H[1-6]|LI|OL|P|PRE|SECTION|TABLE|TR|UL)$/.test(element.tagName)
    ? `${text}\n`
    : text;
}

function selectedMarkdownFragment(container: HTMLElement, selection: Selection | null): { text: string; html: string } | null {
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0).cloneRange();
  if (!container.contains(range.commonAncestorContainer)) return null;
  const startMath = mathAncestor(range.startContainer, container);
  const endMath = mathAncestor(range.endContainer, container);
  if (startMath) range.setStartBefore(startMath);
  if (endMath) range.setEndAfter(endMath);
  if (!container.contains(range.commonAncestorContainer)) return null;
  const fragment = range.cloneContents();
  const wrapper = container.ownerDocument.createElement("div");
  wrapper.append(fragment);
  replaceMathForCopy(wrapper);
  const text = copyTextFromNode(wrapper).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return text ? { text, html: wrapper.innerHTML } : null;
}

export function installMarkdownCopyHandler(container: HTMLElement) {
  if (container.dataset.readerCopyBound === "true") return;
  container.dataset.readerCopyBound = "true";
  container.addEventListener("copy", (event) => {
    const selection = container.ownerDocument.getSelection?.() ?? container.ownerDocument.defaultView?.getSelection?.();
    const payload = selectedMarkdownFragment(container, selection);
    if (!payload || !event.clipboardData) return;
    event.clipboardData.setData("text/plain", payload.text);
    event.clipboardData.setData("text/html", payload.html);
    event.preventDefault();
  });
}

function selectionPayload(container: HTMLElement): { text: string; html: string; source: string } | null {
  const selection = container.ownerDocument.getSelection?.() ?? container.ownerDocument.defaultView?.getSelection?.();
  const payload = selectedMarkdownFragment(container, selection);
  if (!payload) return null;
  const anchor = selection?.anchorNode;
  const block = anchor && (anchor.nodeType === Node.ELEMENT_NODE ? anchor as Element : anchor.parentElement)?.closest<HTMLElement>("[data-md-block]");
  const page = block?.dataset.mdPage;
  const key = block?.dataset.mdBlock;
  const source = [page ? `\u7b2c ${page} \u9875` : "", key ? `\u5757 ${key}` : ""].filter(Boolean).join("\uff0c") || "Markdown \u6b63\u6587";
  return { ...payload, source };
}

function markdownFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as HTMLElement;
  const children = Array.from(element.childNodes, markdownFromNode).join("");
  switch (element.tagName) {
    case "BR": return "\n";
    case "STRONG":
    case "B": return `**${children.trim()}**`;
    case "EM":
    case "I": return `*${children.trim()}*`;
    case "CODE": return element.parentElement?.tagName === "PRE" ? children : `\`${children}\``;
    case "PRE": return `\n\n\`\`\`\n${element.textContent || ""}\n\`\`\`\n\n`;
    case "A": return `[${children.trim()}](${element.getAttribute("href") || ""})`;
    case "IMG": return `![${element.getAttribute("alt") || ""}](${element.getAttribute("src") || element.getAttribute("data-reader-md-src") || ""})`;
    case "H1": return `\n\n# ${children.trim()}\n\n`;
    case "H2": return `\n\n## ${children.trim()}\n\n`;
    case "H3": return `\n\n### ${children.trim()}\n\n`;
    case "H4": return `\n\n#### ${children.trim()}\n\n`;
    case "H5": return `\n\n##### ${children.trim()}\n\n`;
    case "H6": return `\n\n###### ${children.trim()}\n\n`;
    case "LI": return children.trim();
    case "UL":
    case "OL": return Array.from(element.children)
      .map((item, index) => `${element.tagName === "OL" ? `${index + 1}.` : "-"} ${markdownFromNode(item).trim()}`)
      .join("\n") + "\n\n";
    case "P":
    case "DIV": return `${children.trim()}\n\n`;
    case "BLOCKQUOTE": return `${children.trim().split("\n").map((line) => `> ${line}`).join("\n")}\n\n`;
    case "TABLE": return `\n\n${serializeMarkdownTable(element as HTMLTableElement, "Markdown")}\n\n`;
    default: return children;
  }
}

function htmlToMarkdown(html: string, doc: Document): string {
  const wrapper = doc.createElement("div");
  wrapper.innerHTML = html;
  return markdownFromNode(wrapper).replace(/\n{3,}/g, "\n\n").trim();
}

async function copySelection(container: HTMLElement, format: "text" | "markdown" | "word" | "excerpt") {
  const payload = selectionPayload(container);
  if (!payload) return false;
  if (format === "word") return copyReaderHtml(`<div>${payload.html}</div>`, payload.text);
  if (format === "excerpt") return copyReaderText(`${payload.text}\n\n\u6765\u6e90\uff1a${payload.source}`);
  return copyReaderText(format === "markdown" ? htmlToMarkdown(payload.html, container.ownerDocument) : payload.text);
}

function installSelectionActions(container: HTMLElement) {
  if (container.dataset.readerSelectionActionsBound === "true") return;
  container.dataset.readerSelectionActionsBound = "true";
  const doc = container.ownerDocument;
  const actions = doc.createElement("div");
  actions.className = "reader-md-selection-actions";
  actions.hidden = true;
  actions.setAttribute("aria-label", "\u590d\u5236\u9009\u533a");
  actions.append("\u590d\u5236\u9009\u533a");
  const feedback = doc.createElement("span");
  feedback.setAttribute("aria-live", "polite");
  actions.append(feedback);
  const options = [
    ["text", "\u7eaf\u6587\u672c"],
    ["markdown", "Markdown"],
    ["word", "Word"],
    ["excerpt", "\u6458\u5f55"],
  ] as const;
  for (const [format, label] of options) {
    const button = doc.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.onclick = async () => {
      feedback.textContent = "";
      feedback.textContent = await copySelection(container, format) ? "\u5df2\u590d\u5236" : "\u8bf7\u9009\u62e9\u6b63\u6587\u5185\u5bb9";
    };
    actions.append(button);
  }
  container.prepend(actions);
  doc.addEventListener("selectionchange", () => {
    const selection = doc.getSelection?.();
    actions.hidden = !selection || selection.isCollapsed || !selectionPayload(container);
  });
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
  if (container.dataset.readerMarkdownInteractionsBound === "true") return;
  container.dataset.readerMarkdownInteractionsBound = "true";
  let previousScrollTop: number | null = null;
  const doc = container.ownerDocument;
  const scrollRoot = container.closest<HTMLElement>(".reader-notes-panel-body") || container;
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
  container.prepend(back);
  container.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest<HTMLAnchorElement>("a[href^='#']");
    if (!link || !container.contains(link)) return;
    const id = decodeURIComponent(link.getAttribute("href")!.slice(1));
    const destination = container.ownerDocument.getElementById(id);
    if (!destination || !container.contains(destination)) return;
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
  installMarkdownCopyHandler(container);
  installSelectionActions(container);
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
  for (const code of container.querySelectorAll<HTMLElement>("pre > code")) {
    if (code.dataset.readerCodeActionsBound === "true") continue;
    code.dataset.readerCodeActionsBound = "true";
    const actions = code.ownerDocument.createElement("span");
    actions.className = "reader-md-copy-actions reader-md-code-actions";
    const button = code.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = "\u590d\u5236\u4ee3\u7801";
    button.setAttribute("aria-label", "\u590d\u5236\u4ee3\u7801");
    const feedback = code.ownerDocument.createElement("span");
    feedback.setAttribute("role", "status");
    button.onclick = async (event) => {
      event.stopPropagation();
      feedback.textContent = await copyReaderText(code.textContent || "") ? "\u5df2\u590d\u5236" : "\u590d\u5236\u5931\u8d25";
    };
    actions.append(button, feedback);
    code.parentElement?.after(actions);
  }
}
