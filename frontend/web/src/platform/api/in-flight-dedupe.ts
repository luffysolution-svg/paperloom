// 在途请求合并（single-flight）。
//
// 为什么需要：`GET /jobs/:id` 有四个互不知情的所有者——主任务轮询（1s）、书架
// 活跃卡轮询（2.5s，每拍最多 6 张并发）、任务中心（3s）、阅读器 session 状态
// （1s）。它们各自持有定时器、各自的世代号，同一秒里会对同一个 job 各发一次。
//
// 后端不会替我们合并：`/jobs/:id` 走 `run_read_query_once`，它的 single-flight
// key 是 `format!("one-shot:{key}:{:032x}", fastrand::u128(..))`——随机数，永不
// 命中。那不是疏忽：QueryExecution 的合并靠多个调用方共享同一个 Arc，要求返回
// 类型 `Clone + Send + Sync`，而 `JobDetailView` 只 derive 了 Debug + Serialize。
// `run_read_query_once` 把值包进 `Arc<Mutex<Option<T>>>` 绕开这个约束，再在外面
// `.take()` 取走——take 是破坏性的，第二个订阅者只会拿到 None。随机 key 正是
// 用来保证不会有第二个订阅者。函数名里的 `once` 就是这个意思。
//
// 而该端点每次都要跑一遍事件投影同步（对运行中的 job 几乎必然要读
// `pipeline_events.jsonl` 的新增字节 + 多次 DB 查询），后端读侧又只有 2 个并发槽
// （QueryExecution::default() = with_limits(2, 128)）。所以合并在客户端做。
//
// **只合并在途，不做 TTL 缓存**：请求一落地立刻清空，绝不返回任何过期数据。
// 这样"提交/取消之后立刻读到旧状态"这类问题不可能出现——代价是只能捞到恰好
// 重叠的那部分请求，捞不到的照旧各发各的。

/** 克隆失败时退回原值：宁可共享一次，也不要让一个不可克隆的载荷把请求打挂。 */
function safeClone<T>(value: T): T {
  try {
    return typeof structuredClone === "function" ? structuredClone(value) : value;
  } catch {
    return value;
  }
}

type Entry<T> = { promise: Promise<T>; shared: boolean };

export type InFlightDedupe<T> = {
  run: (key: string, work: () => Promise<T>) => Promise<T>;
  /** 仅供测试/诊断：当前在飞的 key 数。 */
  size: () => number;
};

/**
 * 同一 key 已有请求在飞时，后来者复用它而不是再发一次。
 *
 * 复用者拿到的是**克隆**。合并之前每个调用方各发一次请求、各自拿到独立对象，
 * 而这四个所有者各自把载荷写进自己的 store；直接共享同一个引用的话，任何一方
 * 就地修改都会串到另外三个。第一个调用方仍然拿原对象（没有共享就没有这个风险，
 * 也就不必付克隆的开销）。
 */
export function createInFlightDedupe<T>(): InFlightDedupe<T> {
  const entries = new Map<string, Entry<T>>();

  return {
    size: () => entries.size,
    run(key, work) {
      if (!key) return work();
      const existing = entries.get(key);
      if (existing) {
        existing.shared = true;
        return existing.promise.then((value) => safeClone(value));
      }
      const entry: Entry<T> = { promise: null as unknown as Promise<T>, shared: false };
      // 落地即清空（成功与失败都清）：失败不该把后续调用方也钉死在同一个错误上，
      // 成功不该被当成缓存留到下一拍。
      entry.promise = work().finally(() => {
        if (entries.get(key) === entry) entries.delete(key);
      });
      entries.set(key, entry);
      return entry.promise;
    },
  };
}
