// Markdown 正文搜索：在已挂载内容上标注叶子级命中块。

const MARKDOWN_SEARCH_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, td, th, blockquote, pre";

export function clearMarkdownSearchHighlights(container: ParentNode): void {
  container
    .querySelectorAll(".reader-markdown-search-hit, .reader-markdown-search-hit-active")
    .forEach((element) => {
      element.classList.remove("reader-markdown-search-hit", "reader-markdown-search-hit-active");
    });
}

export function findMarkdownSearchTargets(container: ParentNode, query: string): HTMLElement[] {
  clearMarkdownSearchHighlights(container);
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return [];
  const candidates = [...container.querySelectorAll<HTMLElement>(MARKDOWN_SEARCH_SELECTOR)];
  const matches = candidates.filter((element) => {
    if ([...element.children].some((child) => child.matches(MARKDOWN_SEARCH_SELECTOR))) return false;
    return (element.textContent || "").toLocaleLowerCase().includes(needle);
  });
  matches.forEach((element) => element.classList.add("reader-markdown-search-hit"));
  return matches;
}
