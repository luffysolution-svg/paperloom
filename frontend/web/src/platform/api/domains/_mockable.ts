import { isMockMode } from "@/platform/config/runtime.js";

/**
 * mock 模式走 mockImpl，否则直接调 canonical 实现。
 *
 * 取代逐个函数手写两路分发。那种写法要求包装签名退化成 `(...args: any[])`，
 * 于是每个调用点都得 `as any` 才能把 any[] 展开进有类型的 canonical 签名——
 * 本文件曾因此累积 116 处 as any（占当时全前端 332 处的三分之一）。
 * 这里把强转收敛到一处，对外可见的参数类型仍取自 canonical 签名，
 * 返回类型沿用既有的 Promise<any>，不改变任何调用方的类型契约。
 */
type AnyApiFn = (...args: any[]) => any;

export function mockable<F extends AnyApiFn>(
  canonical: F,
  mockImpl: AnyApiFn,
): (...args: Parameters<F>) => Promise<any> {
  return async (...args: Parameters<F>) => (
    isMockMode() ? mockImpl(...args) : canonical(...args)
  );
}
