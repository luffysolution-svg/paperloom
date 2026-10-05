// 页码范围：rangeOn/startPage/endPage + 校验 + 初始 setEndPage。
// - 作用域：(open, documentId) 变化即重置（换文档即使弹窗一直开着也不串页码）
// - 初始回填：仅当 open && pageCount && endPage 仍为空时回填一次；pageCount 迟到
//   时补填，但不依赖 endPage（避免用户手动清空后被回填）
// - 校验：s/e/pageCount 边界（供 handleTranslate 复用）

import { useCallback, useEffect, useRef, useState } from "react";

export type UsePageRangeOptions = {
  open: boolean;
  documentId?: string;
  pageCount?: number | null;
};

export function usePageRange({ open, documentId, pageCount }: UsePageRangeOptions) {
  const [rangeOn, setRangeOn] = useState(false);
  const [startPage, setStartPage] = useState("1");
  const [endPage, setEndPage] = useState("");

  const endPageRef = useRef(endPage);
  useEffect(() => {
    endPageRef.current = endPage;
  }, [endPage]);

  // (open, documentId) 构成一个作用域。换作用域就清干净（含换文档但弹窗不关）。
  const scopeRef = useRef("");
  useEffect(() => {
    const key = `${open ? "o" : "c"}:${documentId || ""}`;
    if (scopeRef.current === key) return;
    scopeRef.current = key;
    // 同步清 ref：让下面的回填在同一次提交里读到"空"，否则会读到上一本的值而跳过。
    endPageRef.current = "";
    setRangeOn(false);
    setStartPage("1");
    setEndPage("");
  }, [open, documentId]);

  // 初始仅当 !endPage && open 时回填；故意不依赖 endPage，避免用户清空后被回填。
  // pageCount 迟到（先 0 后 N）时靠本 effect 补上。
  useEffect(() => {
    if (open && pageCount && !endPageRef.current) {
      setEndPage(String(pageCount));
    }
  }, [open, pageCount, documentId]);

  // rangeOn 与 pageCount 联动校验：pageCount 收缩时若 endPage 越界则夹紧
  useEffect(() => {
    if (!rangeOn || !pageCount) return;
    const e = Number(endPageRef.current);
    if (Number.isInteger(e) && e > pageCount) {
      setEndPage(String(pageCount));
    }
    const s = Number(startPage);
    if (Number.isInteger(s) && s > pageCount) {
      setStartPage(String(pageCount));
    }
  }, [pageCount, rangeOn, startPage]);

  const validateRange = useCallback(() => {
    if (!rangeOn) return { valid: true as const, s: 1, e: pageCount ?? 0 };
    const s = Number(startPage);
    const e = Number(endPage);
    if (
      !Number.isInteger(s)
      || !Number.isInteger(e)
      || s < 1
      || e < s
      || (pageCount ? e > pageCount : false)
    ) {
      return {
        valid: false as const,
        error: `页码范围不合法（1–${pageCount || "总页数"}）`,
      };
    }
    return { valid: true as const, s, e };
  }, [rangeOn, startPage, endPage, pageCount]);

  return {
    rangeOn,
    startPage,
    endPage,
    setRangeOn,
    setStartPage,
    setEndPage,
    validateRange,
  };
}
